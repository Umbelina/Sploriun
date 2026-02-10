import React, { useEffect, useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import {
  createAvailabilityRule,
  listAvailabilityRules,
  updateAvailabilityRule,
  deleteAvailabilityRule,
  listServicesByTenant,
  generateSlots,
} from '../services/db';
import type { AvailabilityRule, Service } from '../types/db';

const WEEKDAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

interface AvailabilityFormData {
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
}

// Helper: check if an interval generates at least 1 slot
const canGenerateSlots = (startTime: string, endTime: string, slotMinutes: number): boolean => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const intervalMinutes = endMinutes - startMinutes;
  return intervalMinutes >= slotMinutes;
};

export default function OwnerAvailability({ tenantId }: { tenantId: string }) {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState<string>('');
  const [previewServiceId, setPreviewServiceId] = useState<string>('');
  const [previewSlots, setPreviewSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [form, setForm] = useState<AvailabilityFormData>({
    weekday: 1,
    startTime: '09:00',
    endTime: '12:00',
    slotMinutes: 30,
    isActive: true,
  });

  // Load rules and services
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [rulesData, servicesData] = await Promise.all([
          listAvailabilityRules(tenantId),
          listServicesByTenant(tenantId),
        ]);
        setRules(rulesData);
        setServices(servicesData);
        if (servicesData.length > 0 && !previewServiceId) {
          setPreviewServiceId(servicesData[0].id);
        }
      } catch (err) {
        console.error('Error loading rules/services:', err);
        setMessage({ type: 'error', text: 'Erro ao carregar disponibilidades' });
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, previewServiceId]);

  // Load preview slots when date/service change
  useEffect(() => {
    if (!previewDate || !previewServiceId) {
      setPreviewSlots([]);
      return;
    }

    (async () => {
      try {
        setPreviewLoading(true);
        const dateISO = `${previewDate}T00:00:00-03:00`;
        const slots = await generateSlots(tenantId, dateISO, { serviceId: previewServiceId });
        setPreviewSlots(slots);
      } catch (err) {
        console.error('Error generating slots:', err);
        setPreviewSlots([]);
      } finally {
        setPreviewLoading(false);
      }
    })();
  }, [tenantId, previewDate, previewServiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validations
    if (!form.startTime || !form.endTime) {
      setMessage({ type: 'error', text: 'Horários são obrigatórios' });
      return;
    }

    const [startH, startM] = form.startTime.split(':').map(Number);
    const [endH, endM] = form.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      setMessage({ type: 'error', text: 'Horário de término deve ser posterior ao de início' });
      return;
    }

    if (form.slotMinutes < 5 || form.slotMinutes > 120) {
      setMessage({ type: 'error', text: 'Duração de slot deve estar entre 5 e 120 minutos' });
      return;
    }

    // Check if interval can generate at least 1 slot
    if (!canGenerateSlots(form.startTime, form.endTime, form.slotMinutes)) {
      const intervalMinutes = endMinutes - startMinutes;
      setMessage({
        type: 'error',
        text: `Intervalo muito curto (${intervalMinutes} min) para duração de ${form.slotMinutes} min. Aumente o intervalo ou reduza a duração do slot.`,
      });
      return;
    }

    try {
      if (editingId) {
        // Update
        const updated = await updateAvailabilityRule(editingId, tenantId, {
          weekday: form.weekday,
          start_time: form.startTime,
          end_time: form.endTime,
          slot_minutes: form.slotMinutes,
          is_active: form.isActive,
        });
        if (updated) {
          setRules(rules.map(r => (r.id === editingId ? updated : r)));
          setMessage({ type: 'success', text: 'Disponibilidade atualizada' });
        }
        setEditingId(null);
      } else {
        // Create
        const created = await createAvailabilityRule({
          tenantId,
          weekday: form.weekday,
          startTime: form.startTime,
          endTime: form.endTime,
          slotMinutes: form.slotMinutes,
          isActive: form.isActive,
        });
        if (created && Array.isArray(created)) {
          setRules([...rules, created[0]]);
          setMessage({ type: 'success', text: 'Disponibilidade criada' });
        }
      }
      setForm({ weekday: 1, startTime: '09:00', endTime: '12:00', slotMinutes: 30, isActive: true });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta disponibilidade?')) return;
    try {
      await deleteAvailabilityRule(id, tenantId);
      setRules(rules.filter(r => r.id !== id));
      setMessage({ type: 'success', text: 'Removida com sucesso' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao remover' });
    }
  };

  const handleEdit = (rule: AvailabilityRule) => {
    setEditingId(rule.id);
    setForm({
      weekday: rule.weekday,
      startTime: rule.start_time.substring(0, 5),
      endTime: rule.end_time.substring(0, 5),
      slotMinutes: rule.slot_minutes,
      isActive: rule.is_active,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ weekday: 1, startTime: '09:00', endTime: '12:00', slotMinutes: 30, isActive: true });
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Get selected service duration or default to 30
  const selectedServiceDuration =
    services.find(s => s.id === previewServiceId)?.duration_minutes || 30;

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded text-sm ${
            message.type === 'error'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Form: Create/Edit Rule */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Editar Disponibilidade' : 'Nova Disponibilidade'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekday */}
            <div>
              <label className="block text-sm font-medium mb-1">Dia da Semana *</label>
              <select
                value={form.weekday}
                onChange={(e) => setForm({ ...form, weekday: parseInt(e.target.value) })}
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
              >
                {WEEKDAYS_PT.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Slot Minutes */}
            <div>
              <label className="block text-sm font-medium mb-1">Duração do Slot (min) *</label>
              <input
                type="number"
                min="5"
                max="120"
                step="5"
                value={form.slotMinutes}
                onChange={(e) => setForm({ ...form, slotMinutes: parseInt(e.target.value) || 30 })}
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium mb-1">Início *</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium mb-1">Término *</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Is Active */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Ativo
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-black text-white p-2 rounded font-medium hover:bg-gray-800"
            >
              {editingId ? 'Atualizar' : 'Criar'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Rules Table */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-8 text-gray-600">Nenhuma disponibilidade cadastrada</div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Dia</th>
                <th className="text-left p-4 font-semibold">Horário</th>
                <th className="text-left p-4 font-semibold">Slot (min)</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-right p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{WEEKDAYS_PT[rule.weekday]}</td>
                  <td className="p-4">
                    {rule.start_time.substring(0, 5)} - {rule.end_time.substring(0, 5)}
                  </td>
                  <td className="p-4">{rule.slot_minutes}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {rule.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="inline-flex items-center gap-1 p-1 hover:bg-blue-100 rounded text-blue-600"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="inline-flex items-center gap-1 p-1 hover:bg-red-100 rounded text-red-600"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slots Preview */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Visualizar Horários Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium mb-1">Data *</label>
            <input
              type="date"
              value={previewDate}
              onChange={(e) => setPreviewDate(e.target.value)}
              min={today}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Service Selector */}
          <div>
            <label className="block text-sm font-medium mb-1">Serviço *</label>
            <select
              value={previewServiceId}
              onChange={(e) => setPreviewServiceId(e.target.value)}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Selecione um serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes}min)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration Info */}
        {previewServiceId && (
          <p className="text-sm text-gray-600 mb-4">
            Duração considerada: <strong>{selectedServiceDuration} min</strong>
          </p>
        )}

        {/* Slots Grid */}
        {previewLoading ? (
          <div className="text-center py-6">Carregando...</div>
        ) : previewSlots.length === 0 ? (
          <div className="text-center py-6 text-gray-600">Selecione data e serviço para visualizar</div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {previewSlots.map((slot) => (
              <button
                key={slot.time}
                disabled
                className={`p-3 rounded text-center text-sm font-medium transition ${
                  slot.available
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-500 border border-gray-300 line-through'
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
