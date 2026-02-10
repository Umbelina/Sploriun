import React, { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { getAppointmentsForClient, cancelAppointmentByClient } from '../src/services/db';
import { getUser } from '../src/lib/auth';
import { formatDateBR, formatTimeBR } from '../src/lib/validation';
import type { AppointmentRow } from '../src/types/db';
import { supabase } from '../src/lib/supabaseClient';

export default function ClientDashboard() {
  const [appointments, setAppointments] = useState<(AppointmentRow & { service_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await getUser();
        if (!user) {
          setAppointments([]);
          setMessage({ type: 'error', text: 'Usuário não autenticado' });
          return;
        }
        const appts = await getAppointmentsForClient(user.id);
        if (mounted) setAppointments(appts as any);
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Erro ao carregar agendamentos' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

 const handleCancel = async (apt: AppointmentRow & { service_name?: string | null }) => {
    const ok = window.confirm('Deseja cancelar este agendamento?');
    if (!ok) return;

    try {
      setLoading(true);
      const user = await getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const res = await cancelAppointmentByClient(apt.id, user.id);
      if (res.success) {
        setAppointments(a => 
          a.map(x => x.id === apt.id ? { ...x, status: 'canceled', canceled_at: new Date().toISOString() } : x));

        await supabase.rpc("notify_owner_and_client", {
          p_tenant_id: apt.tenant_id,
          p_type: "appointment_canceled",
          p_title: "Agendamento cancelado",
          p_body: `Cliente ${apt.client_first_name} cancelou ${formatDateBR(apt.start_at)} ${formatTimeBR(apt.start_at)}.`,
          p_payload: { appointmentId: apt.id }
        });

        setMessage({ type: 'success', text: res.message });
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao cancelar' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Meus Agendamentos</h1>

        {message && (
          <div className={`p-3 rounded mb-4 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div>Carregando...</div>
        ) : appointments.length === 0 ? (
          <div className="text-gray-600">Você não possui agendamentos.</div>
        ) : (
          <div className="space-y-3">
            {appointments.map(apt => (
              <div key={apt.id} className="p-4 border rounded bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-black">{apt.client_first_name} {apt.client_last_name}</div>
                    <div className="text-sm text-gray-600">{apt.client_phone}</div>
                  </div>
                  <div className="text-sm text-gray-500">{formatDateBR(apt.start_at)}</div>
                </div>
                <div className="mt-2 text-sm flex items-center gap-4">
                  <div className="flex items-center gap-2"><Calendar size={14} /> {formatDateBR(apt.start_at)}</div>
                  <div className="flex items-center gap-2"><Clock size={14} /> {formatTimeBR(apt.start_at)} - {formatTimeBR(apt.end_at)}</div>
                </div>
                <div className="mt-2 text-sm">
                  <strong>Serviço:</strong> {(apt as any).service_name || apt.service_id}
                </div>
                <div className="mt-3 flex gap-2">
                  {apt.status === 'booked' && (
                    <button onClick={() => handleCancel(apt)} className="px-3 py-1 border rounded">Cancelar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
