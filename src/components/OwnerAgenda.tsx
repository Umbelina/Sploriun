import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  getAppointmentsByTenant,
  listServicesByTenant,
  generateSlots,
  cancelAppointmentSecure,
  createAppointment,
  updateAppointment,
} from '../services/db';
import type { AppointmentRow, Service } from '../types/db';

interface AppointmentWithService extends AppointmentRow {
  service?: Service;
}

// Format time in HH:mm (pt-BR)
const formatTime = (time: string): string => {
  return time.substring(0, 5);
};

// Format date as "seg, 03 fev 2026"
const formatDate = (dateISO: string): string => {
  const date = new Date(dateISO);
  const daysOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const monthsPT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const day = date.getDate().toString().padStart(2, '0');
  const month = monthsPT[date.getMonth()];
  const dayOfWeek = daysOfWeek[date.getDay()];
  return `${dayOfWeek}, ${day} ${month} ${date.getFullYear()}`;
};

export default function OwnerAgenda({ tenantId }: { tenantId: string }) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Reschedule state
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlots, setRescheduleSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Load services on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await listServicesByTenant(tenantId);
        setServices(data);
      } catch (err) {
        console.error('Error loading services:', err);
      }
    })();
  }, [tenantId]);

  // Load appointments for selected date
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const appointments = await getAppointmentsByTenant(tenantId, selectedDate);
        // Join with services
        const withServices = appointments.map(appt => {
          const service = services.find(s => s.id === appt.service_id);
          return { ...appt, service };
        });
        setAppointments(withServices);
      } catch (err) {
        console.error('Error loading appointments:', err);
        setMessage({ type: 'error', text: 'Erro ao carregar agenda' });
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, selectedDate, services]);

  const handleCancel = async (apptId: string) => {
    if (!confirm('Cancelar este agendamento?')) return;

    try {
      setMessage(null);
      const appt = appointments.find(a => a.id === apptId);
      if (!appt) throw new Error('Agendamento não encontrado');
      await cancelAppointmentSecure(apptId, tenantId, appt.client_phone.replace(/\D/g, ''));
      setAppointments(
        appointments.map(a =>
          a.id === apptId ? { ...a, status: 'canceled', canceled_at: new Date().toISOString() } : a
        )
      );
      setMessage({ type: 'success', text: 'Agendamento cancelado' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao cancelar' });
    }
  };

  const startReschedule = (appt: AppointmentWithService) => {
    if (!appt.service) return;
    setReschedulingId(appt.id);
    setRescheduleDate('');
    setRescheduleSlots([]);
    setSelectedSlot(null);
  };

  const cancelReschedule = () => {
    setReschedulingId(null);
    setRescheduleDate('');
    setRescheduleSlots([]);
    setSelectedSlot(null);
  };

  // Load slots for reschedule date
  useEffect(() => {
    if (!reschedulingId || !rescheduleDate) {
      setRescheduleSlots([]);
      return;
    }

    const appt = appointments.find(a => a.id === reschedulingId);
    if (!appt || !appt.service) return;

    (async () => {
      try {
        setRescheduleSlotsLoading(true);
        const slots = await generateSlots(tenantId, rescheduleDate, {
          serviceId: appt.service!.id,
        });
        setRescheduleSlots(slots);
        setSelectedSlot(null);
      } catch (err) {
        console.error('Error generating slots:', err);
        setRescheduleSlots([]);
      } finally {
        setRescheduleSlotsLoading(false);
      }
    })();
  }, [tenantId, reschedulingId, rescheduleDate, appointments]);

  const confirmReschedule = async () => {
    const appt = appointments.find(a => a.id === reschedulingId);
    if (!appt || !appt.service || !selectedSlot) {
      setMessage({ type: 'error', text: 'Selecione um horário' });
      return;
    }

    try {
      setMessage(null);

      // Build start_at ISO format: rescheduleDate T selectedSlot:00 -03:00
      const [hour, minute] = selectedSlot.split(':').map(Number);
      const startAtISO = `${rescheduleDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`;

      // 1. Create new appointment using existing createAppointment function
      const newAppt = await createAppointment({
        tenantId,
        serviceId: appt.service.id,
        startAtISO,
        clientFirstName: appt.client_first_name,
        clientLastName: appt.client_last_name,
        clientPhone: appt.client_phone,
        clientUserId: appt.client_user_id || undefined,
        rescheduledFromId: appt.id, // Link to the old appointment being rescheduled
      });

      if (!newAppt || !newAppt.id) {
        throw new Error('Erro ao criar novo agendamento');
      }

      // 2. Cancel old appointment
      await updateAppointment(appt.id, {
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      });

      // 3. Reload appointments
      const oldDateAppts = await getAppointmentsByTenant(tenantId, selectedDate);
      const merged = oldDateAppts.map(a => {
        const service = services.find(s => s.id === a.service_id);
        return { ...a, service };
      });
      setAppointments(merged);

      setMessage({ type: 'success', text: 'Agendamento reagendado com sucesso' });
      cancelReschedule();
    } catch (err: any) {
      const msg = err.message || 'Erro ao reagendar';
      if (msg.includes('indisponível') || msg.includes('overlap')) {
        setMessage({ type: 'error', text: 'Horário indisponível (conflito com outro agendamento)' });
      } else {
        setMessage({ type: 'error', text: msg });
      }
    }
  };

  const reschedulingAppt = appointments.find(a => a.id === reschedulingId);

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

      {/* Date Picker */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Agenda do Dia</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Data *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex items-end">
            <span className="text-sm text-gray-600">{formatDate(selectedDate)}</span>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Agendamentos</h3>
        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-600">Nenhum agendamento para este dia</div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className={`p-4 border rounded flex items-start justify-between ${
                  appt.status === 'canceled'
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex-1">
                  <div className="font-semibold">
                    {formatTime(appt.start_at)} - {formatTime(appt.end_at)}
                  </div>
                  <div className="text-sm text-gray-700">
                    {appt.service?.name || 'Serviço removido'} ({appt.service?.duration_minutes || '?'}min)
                  </div>
                  <div className="text-sm text-gray-600">
                    {appt.client_first_name} {appt.client_last_name} • {appt.client_phone}
                  </div>
                  {appt.status === 'canceled' && (
                    <div className="text-xs text-red-600 mt-1">
                      Cancelado {appt.canceled_at ? new Date(appt.canceled_at).toLocaleDateString('pt-BR') : ''}
                    </div>
                  )}
                </div>

                {appt.status !== 'canceled' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startReschedule(appt)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Reagendar
                    </button>
                    <button
                      onClick={() => handleCancel(appt.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {reschedulingId && reschedulingAppt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reagendar Agendamento</h3>
              <button
                onClick={cancelReschedule}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="text-sm text-gray-600">
                <strong>Serviço:</strong> {reschedulingAppt.service?.name} ({reschedulingAppt.service?.duration_minutes}min)
              </div>
              <div className="text-sm text-gray-600">
                <strong>Cliente:</strong> {reschedulingAppt.client_first_name} {reschedulingAppt.client_last_name} • {reschedulingAppt.client_phone}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nova Data *</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={today}
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {rescheduleSlotsLoading && (
                <div className="text-center py-4">
                  <Loader2 size={20} className="animate-spin inline" />
                </div>
              )}

              {rescheduleDate && !rescheduleSlotsLoading && (
                <div>
                  <label className="block text-sm font-medium mb-2">Novo Horário *</label>
                  {rescheduleSlots.length === 0 ? (
                    <div className="text-sm text-gray-600">Nenhum horário disponível nesta data</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {rescheduleSlots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => slot.available && setSelectedSlot(slot.time)}
                          className={`p-2 text-sm rounded font-medium transition ${
                            !slot.available
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed line-through'
                              : selectedSlot === slot.time
                              ? 'bg-black text-white'
                              : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmReschedule}
                disabled={!selectedSlot}
                className="flex-1 bg-black text-white p-2 rounded font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Reagendamento
              </button>
              <button
                onClick={cancelReschedule}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
