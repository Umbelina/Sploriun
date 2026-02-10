import React, { useEffect, useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import {
  createService,
  listServicesByTenant,
  updateService,
  deleteService,
} from '../../src/services/db';
import type { Service } from '../../src/types/db';

interface ServiceFormData {
  name: string;
  durationMinutes: number;
  isActive: boolean;
}

export default function OwnerServices({ tenantId }: { tenantId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [form, setForm] = useState<ServiceFormData>({
    name: '',
    durationMinutes: 30,
    isActive: true,
  });

  // Load services
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listServicesByTenant(tenantId);
        setServices(data);
      } catch (err) {
        console.error('Error loading services:', err);
        setMessage({ type: 'error', text: 'Erro ao carregar serviços' });
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validations
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Nome do serviço é obrigatório' });
      return;
    }

    if (form.name.length < 2 || form.name.length > 60) {
      setMessage({ type: 'error', text: 'Nome deve ter entre 2 e 60 caracteres' });
      return;
    }

    if (form.durationMinutes < 10 || form.durationMinutes > 240) {
      setMessage({ type: 'error', text: 'Duração deve estar entre 10 e 240 minutos' });
      return;
    }

    try {
      if (editingId) {
        // Update
        const updated = await updateService(editingId, tenantId, {
          name: form.name.trim(),
          duration_minutes: form.durationMinutes,
          is_active: form.isActive,
        });
        if (updated) {
          setServices(services.map(s => (s.id === editingId ? updated : s)));
          setMessage({ type: 'success', text: 'Serviço atualizado' });
        }
        setEditingId(null);
      } else {
        // Create
        const created = await createService({
          tenantId,
          name: form.name.trim(),
          durationMinutes: form.durationMinutes,
          isActive: form.isActive,
        });
        if (created && Array.isArray(created)) {
          setServices([...services, created[0]]);
          setMessage({ type: 'success', text: 'Serviço criado' });
        }
      }
      setForm({ name: '', durationMinutes: 30, isActive: true });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este serviço?')) return;
    try {
      await deleteService(id, tenantId);
      setServices(services.filter(s => s.id !== id));
      setMessage({ type: 'success', text: 'Removido com sucesso' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao remover' });
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      durationMinutes: service.duration_minutes,
      isActive: service.is_active,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', durationMinutes: 30, isActive: true });
  };

  const toggleActive = async (service: Service) => {
    try {
      const updated = await updateService(service.id, tenantId, {
        name: service.name,
        duration_minutes: service.duration_minutes,
        is_active: !service.is_active,
      });
      if (updated) {
        setServices(services.map(s => (s.id === service.id ? updated : s)));
        setMessage({
          type: 'success',
          text: `Serviço ${updated.is_active ? 'ativado' : 'desativado'}`,
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar' });
    }
  };

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

      {/* Form: Create/Edit Service */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Editar Serviço' : 'Novo Serviço'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nome do Serviço *</label>
              <input
                type="text"
                maxLength={60}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: Manicure"
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-1">Duração (minutos) *</label>
              <input
                type="number"
                min="10"
                max="240"
                step="5"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 30 })}
                className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
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

      {/* Services Table */}
      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 text-gray-600">Nenhum serviço cadastrado</div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Nome</th>
                <th className="text-left p-4 font-semibold">Duração (min)</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-right p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{service.name}</td>
                  <td className="p-4">{service.duration_minutes}</td>
                  <td className="p-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={service.is_active}
                        onChange={() => toggleActive(service)}
                        className="w-4 h-4"
                      />
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          service.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {service.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </label>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="inline-flex items-center gap-1 p-1 hover:bg-blue-100 rounded text-blue-600"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
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
    </div>
  );
}
