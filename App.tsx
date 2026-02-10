import React, { useEffect, useState } from 'react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { getTenantBySlug, listServicesByTenant, createAppointment, getAvailableSlots } from './src/services/db';
import {
  sanitizePhone,
  isValidName,
  isValidPhone,
  clampLength,
  formatDateBR,
  validateAppointmentForm,
  LIMITS,
} from './src/lib/validation';
import type { Service, Tenant } from './src/types/db';

export default function App() {
  const [slug, setSlug] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form, setForm] = useState({
    serviceId: '',
    date: '',
    time: '',
    firstName: '',
    lastName: '',
    phone: '',
    notes: '',
  });

  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const path = window.location.pathname || '/';
    const seg = path.split('/').filter(Boolean)[0] ?? null;
    setSlug(seg);
  }, []);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const t = await getTenantBySlug(slug);
        if (!mounted) return;
        if (!t || !t.is_active) {
          setTenant(null);
          setServices([]);
          setMessage({ type: 'error', text: 'Estabelecimento não encontrado ou inativo' });
          setLoading(false);
          return;
        }
        setTenant(t);
        const svcs = await listServicesByTenant(t.id);
        setServices(svcs);
        setMessage(null);
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Erro ao carregar dados.' });
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
}, [slug]);

  // ============================================================
  // Carregar slots disponíveis quando data/serviço mudam
  // ============================================================
  useEffect(() => {
    if (!tenant || !form.serviceId || !form.date) {
      setSlots([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoadingSlots(true);
        const availableSlots = await getAvailableSlots(tenant.id, form.serviceId, form.date);
        if (mounted) {
          setSlots(availableSlots);
          // Limpar horário selecionado se não está mais disponível
          if (form.time && !availableSlots.find(s => s.time === form.time && s.available)) {
            setForm(prev => ({ ...prev, time: '' }));
          }
        }
      } catch (err) {
        console.error('Erro ao carregar horários:', err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tenant, form.serviceId, form.date]);

  // ============================================================
  // Handlers de mudança de input com validação e limites
  // ============================================================
  const handleFirstNameChange = (value: string) => {
    // Limitar tamanho
    const clamped = clampLength(value, LIMITS.FIRST_NAME_MAX);
    setForm((prev: typeof form) => ({ ...prev, firstName: clamped }));
  };

  const handleLastNameChange = (value: string) => {
    const clamped = clampLength(value, LIMITS.LAST_NAME_MAX);
    setForm((prev: typeof form) => ({ ...prev, lastName: clamped }));
  };

  const handlePhoneChange = (value: string) => {
    // BUG #8: Remover espaços automaticamente, bloquear não-dígitos
    const sanitized = sanitizePhone(value);
    // Limitar tamanho
    const clamped = clampLength(sanitized, LIMITS.PHONE_MAX);
    setForm((prev: typeof form) => ({ ...prev, phone: clamped }));
  };

  const handleNotesChange = (value: string) => {
    const clamped = clampLength(value, LIMITS.NOTES_MAX);
    setForm((prev: typeof form) => ({ ...prev, notes: clamped }));
  };
  

  // ============================================================
  // Submit do formulário
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    // Limpar erros anteriores
    setFieldErrors({});
    setMessage(null);

    // Validar campos obrigatórios
    if (!form.serviceId || !form.date || !form.time || !form.firstName || !form.lastName || !form.phone) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios' });
      return;
    }

    // Validar usando módulo centralizado
    const validation = validateAppointmentForm({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      notes: form.notes,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setMessage({ type: 'error', text: firstError });
      return;
    }

    // Validar data no futuro
    const startAtWithTZ = `${form.date}T${form.time}:00-03:00`;
    const startAtLocal = new Date(startAtWithTZ as string);
    if (isNaN(startAtLocal.getTime())) {
      setMessage({ type: 'error', text: 'Data ou horário inválidos' });
      return;
    }

    const now = new Date();
    if (startAtLocal < now) {
      setMessage({ type: 'error', text: 'Não é permitido agendar em horário passado' });
      return;
    }

    try {
      setSubmitting(true);
      const result = await createAppointment({
        tenantId: tenant.id,
        serviceId: form.serviceId,
        startAtISO: startAtLocal.toISOString(),
        clientFirstName: form.firstName,
        clientLastName: form.lastName,
        clientPhone: form.phone,
        notes: form.notes || null,
      });
      setMessage({ type: 'success', text: 'Agendamento realizado com sucesso!' });
      setForm({ serviceId: '', date: '', time: '', firstName: '', lastName: '', phone: '', notes: '' });
      setSlots([]);
      setFieldErrors({});
      console.log('Agendamento criado:', result);
    } catch (err) {
      const errorMsg = (err instanceof Error) ? err.message : 'Erro ao criar agendamento';
      setMessage({ type: 'error', text: errorMsg });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow">
          <h2 className="text-center mb-4">Abra a página com o slug do estabelecimento</h2>
          <p className="text-sm text-gray-600">Use a URL no formato: <code>/seu-slug</code> (ex: /sploriun)</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-6 rounded-xl shadow text-center">
        <h2 className="mb-2">{message?.text || 'Estabelecimento não encontrado'}</h2>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-start justify-center">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          {tenant.logo_url ? (
          <ImageWithFallback
            src={tenant.logo_url}
            alt={tenant.display_name || tenant.slug}
            className="mx-auto w-24 h-24 rounded-full"
          />
        ) : (
          <div className="mx-auto w-24 h-24 rounded-full bg-white border flex items-center justify-center px-2">
            <span className="text-sm font-semibold text-black text-center leading-tight">
              {tenant.display_name || tenant.slug}
            </span>
          </div>
        )}

        <h1 className="mt-3 text-xl font-semibold">{tenant.display_name || tenant.slug}</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="mb-4">Agende seu serviço</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SERVIÇO */}
            <div>
              <label className="block text-sm mb-1 font-medium">Serviço *</label>
              <select
                value={form.serviceId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, serviceId: e.target.value, time: '' })}
                required
                className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Selecione um serviço</option>
                {services.map((s: Service) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.duration_minutes} min</option>
                ))}
              </select>
            </div>

            {/* DATA E HORA */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1 font-medium">Data *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value, time: '' })}
                  required
                  className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Hora *</label>
                {loadingSlots ? (
                  <div className="w-full border p-3 rounded bg-gray-50 text-gray-600 text-sm">Carregando...</div>
                ) : slots.length === 0 ? (
                  <div className="w-full border p-3 rounded bg-gray-50 text-gray-600 text-sm">Selecione data e serviço</div>
                ) : (
                  <select
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                    className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">Selecione um horário</option>
                    {slots.map((slot: { time: string; available: boolean }) => (
                      <option key={slot.time} value={slot.time} disabled={!slot.available}>
                        {slot.time} {!slot.available ? '(ocupado)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* NOME E SOBRENOME */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1 font-medium">Nome *</label>
                <input
                  type="text"
                  placeholder="Ex: João"
                  value={form.firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  required
                  maxLength={LIMITS.FIRST_NAME_MAX}
                  className={`w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black ${
                    fieldErrors.firstName ? 'border-red-500' : ''
                  }`}
                />
                {fieldErrors.firstName && <p className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Sobrenome *</label>
                <input
                  type="text"
                  placeholder="Ex: Silva"
                  value={form.lastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  required
                  maxLength={LIMITS.LAST_NAME_MAX}
                  className={`w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black ${
                    fieldErrors.lastName ? 'border-red-500' : ''
                  }`}
                />
                {fieldErrors.lastName && <p className="text-xs text-red-600 mt-1">{fieldErrors.lastName}</p>}
              </div>
            </div>

            {/* TELEFONE */}
            <div>
              <label className="block text-sm mb-1 font-medium">Telefone (somente números) *</label>
              <input
                type="tel"
                placeholder="11987654321"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                inputMode="numeric"
                required
                maxLength={LIMITS.PHONE_MAX}
                className={`w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black ${
                  fieldErrors.phone ? 'border-red-500' : ''
                }`}
              />
              {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
            </div>

            {/* OBSERVAÇÕES */}
            <div>
              <label className="block text-sm mb-1 font-medium">
                Observações (opcional) - {form.notes.length}/{LIMITS.NOTES_MAX}
              </label>
              <textarea
                placeholder="Ex: alergia a produtos específicos, preferências..."
                value={form.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                maxLength={LIMITS.NOTES_MAX}
                className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black resize-none"
                rows={3}
              />
            </div>

            {/* MENSAGENS */}
            {message && (
              <div
                className={`p-3 rounded text-sm ${
                  message.type === 'error'
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-green-100 text-green-700 border border-green-300'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* BOTÃO SUBMIT */}
            <button
              type="submit"
              disabled={submitting || loadingSlots}
              className="w-full bg-black text-white p-3 rounded font-medium disabled:bg-gray-400 transition-colors"
            >

              .bg-\[\#1e3a8a\]
              {submitting ? 'Enviando...' : 'Agendar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
