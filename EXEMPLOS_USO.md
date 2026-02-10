/**
 * EXEMPLOS DE USO - Novas Funções
 * 
 * Este arquivo demonstra como usar as funções criadas para corrigir os bugs
 */

// ============================================================
// 1. VALIDAÇÃO (src/lib/validation.ts)
// ============================================================

import {
  sanitizePhone,
  isValidPhone,
  isValidName,
  clampLength,
  formatDateBR,
  formatDateTimeBR,
  formatTimeBR,
  validateAppointmentForm,
  LIMITS,
} from '@/src/lib/validation';

// Exemplo 1: Sanitizar telefone (BUG #8)
const phoneInput = "11 98765-4321";
const cleanPhone = sanitizePhone(phoneInput); // "11987654321"
const isValid = isValidPhone(cleanPhone); // true

// Exemplo 2: Validar nome (BUG #3)
isValidName("A"); // false (< 2 caracteres)
isValidName("João Silva"); // true (2-60 caracteres, letras + acentos)
isValidName("João123"); // false (contém números)

// Exemplo 3: Limitar tamanho (BUG #9)
const nameInput = "João da Silva Oliveira";
const limited = clampLength(nameInput, LIMITS.FIRST_NAME_MAX); // máx 60
// maxLength={LIMITS.FIRST_NAME_MAX} no input HTML também

// Exemplo 4: Formatação de datas (BUG #6)
const isoDate = "2026-02-10T14:30:00Z";
formatDateBR(isoDate); // "10/02/2026"
formatTimeBR(isoDate); // "14:30"
formatDateTimeBR(isoDate); // "10/02/2026 14:30"

// Exemplo 5: Validação batch (BUG #3, #8, #9)
const validation = validateAppointmentForm({
  firstName: "João",
  lastName: "Silva",
  phone: "11987654321",
  notes: "Alergia a latex",
});

if (!validation.isValid) {
  console.log(validation.errors);
  // { firstName: "...", lastName: "...", phone: "...", notes: "..." }
}

// ============================================================
// 2. BANCO DE DADOS (src/services/db.ts)
// ============================================================

import {
  getTenantBySlug,
  listServicesByTenant,
  createAppointment,
  getAvailableSlots,
  getAppointmentsByTenant,
  getAppointmentById,
} from '@/src/services/db';

// Exemplo 1: Criar agendamento com validações (BUG #1, #2, #5)
try {
  const appointment = await createAppointment({
    tenantId: "uuid-tenant-123",
    serviceId: "uuid-service-456",
    startAtISO: new Date("2026-02-10T14:00:00-03:00").toISOString(),
    clientFirstName: "João",
    clientLastName: "Silva",
    clientPhone: "11987654321",
    notes: "Sem alergia",
    manicuristId: null, // opcional
  });
  // Se houver overlap ou cliente já agendado hoje, lançará erro com mensagem amigável
} catch (error) {
  // "Horário indisponível para este agendamento"
  // "Este cliente já possui um agendamento marcado para este dia"
  // "Validação falhou: Nome deve ter no mínimo 2 caracteres..."
}

// Exemplo 2: Buscar slots disponíveis (BUG #1, #2, #4)
const slots = await getAvailableSlots(
  "uuid-tenant-123",
  "uuid-service-456",
  "2026-02-10" // formato YYYY-MM-DD
);

// Retorna:
// [
//   { time: "08:00", available: true },
//   { time: "08:30", available: true },
//   { time: "09:00", available: false }, // ocupado
//   { time: "09:30", available: false }, // sobrepõe anterior
//   { time: "10:00", available: true },
//   ...
// ]

// Exemplo 3: Listar agendamentos do tenant (BUG #4 - SEGURANÇA)
const tenantAppointments = await getAppointmentsByTenant("uuid-tenant-123");
// Sempre filtra por tenant_id - impossível ver dados de outro tenant

// Exemplo 4: Buscar agendamento específico (BUG #4 - SEGURANÇA)
const appointment = await getAppointmentById(
  "uuid-appointment-789",
  "uuid-tenant-123" // CRÍTICO: valida tenant_id
);
// Se tenant_id não corresponder, retorna null

// ============================================================
// 3. UI - App.tsx
// ============================================================

// Exemplo: Fluxo de agendamento completo

// Estado
const [form, setForm] = useState({
  serviceId: "uuid-service",
  date: "2026-02-10",
  time: "14:00",
  firstName: "João",
  lastName: "Silva",
  phone: "11987654321",
  notes: "Sem alergia",
});

// Handler com sanitização (BUG #8)
const handlePhoneChange = (value: string) => {
  const sanitized = sanitizePhone(value); // Remove espaços/símbolos
  const clamped = clampLength(sanitized, LIMITS.PHONE_MAX); // Limita a 15
  setForm(prev => ({ ...prev, phone: clamped }));
};

// Handler com validação (BUG #3)
const handleNameChange = (value: string) => {
  const clamped = clampLength(value, LIMITS.FIRST_NAME_MAX);
  setForm(prev => ({ ...prev, firstName: clamped }));
};

// Carregar slots quando data/serviço mudam (BUG #1, #2, #4)
useEffect(() => {
  if (!tenant || !form.serviceId || !form.date) {
    setSlots([]);
    return;
  }

  (async () => {
    try {
      const availableSlots = await getAvailableSlots(
        tenant.id,
        form.serviceId,
        form.date
      );
      setSlots(availableSlots);
    } catch (err) {
      console.error('Erro ao carregar horários:', err);
    }
  })();
}, [tenant, form.serviceId, form.date]);

// Select de horários (BUG #1, #2)
<select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
  <option value="">Selecione um horário</option>
  {slots.map(slot => (
    <option key={slot.time} value={slot.time} disabled={!slot.available}>
      {slot.time} {!slot.available ? '(ocupado)' : ''}
    </option>
  ))}
</select>

// Validação ao submeter (BUG #3, #8, #9)
const handleSubmit = async (e) => {
  e.preventDefault();

  const validation = validateAppointmentForm({
    firstName: form.firstName,
    lastName: form.lastName,
    phone: form.phone,
    notes: form.notes,
  });

  if (!validation.isValid) {
    setFieldErrors(validation.errors);
    return;
  }

  // Criar agendamento (BUG #1, #2, #5)
  try {
    await createAppointment({
      tenantId: tenant.id,
      serviceId: form.serviceId,
      startAtISO: new Date(`${form.date}T${form.time}:00-03:00`).toISOString(),
      clientFirstName: form.firstName,
      clientLastName: form.lastName,
      clientPhone: form.phone,
      notes: form.notes || null,
    });
    setMessage({ type: 'success', text: 'Agendamento realizado!' });
  } catch (err) {
    setMessage({ type: 'error', text: err.message });
  }
};

// ============================================================
// 4. UI - ManageAppointments.tsx
// ============================================================

// Exemplo: Gerenciar agendamentos do cliente

// Props OBRIGATÓRIO tenantId (BUG #4 - SEGURANÇA)
<ManageAppointments
  tenantId={tenant.id} // CRÍTICO
  onClose={() => setShowManage(false)}
  onReschedule={(apt) => handleReschedule(apt)}
/>

// Carregar agendamentos (BUG #4)
useEffect(() => {
  if (!tenantId) {
    setMessage({ type: 'error', text: 'Erro: tenant_id não informado' });
    return;
  }

  (async () => {
    try {
      const appts = await getAppointmentsByTenant(tenantId); // Sempre filtrado
      setAppointments(appts);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar agendamentos' });
    }
  })();
}, [tenantId]);

// Buscar por telefone (BUG #4 - filtro seguro)
const handleSearch = () => {
  const cleanedPhone = sanitizePhone(searchPhone);
  // Filtro LOCAL após carregar dados do tenant
  const filtered = appointments.filter(apt =>
    apt.client_phone.includes(cleanedPhone)
  );
  setFilteredAppointments(filtered);
};

// Exibir datas em português (BUG #6)
<div>
  {formatDateBR(appointment.start_at)} {/* "10/02/2026" */}
  {formatTimeBR(appointment.start_at)} {/* "14:30" */}
</div>

// ============================================================
// 5. SQL - constraints.sql
// ============================================================

// EXCLUDE constraint para evitar overlap (BUG #1, #2)
-- Impede que o mesmo manicurist/tenant tenha agendamentos sobrepostos
ALTER TABLE appointments
ADD CONSTRAINT no_overlapping_appointments 
EXCLUDE USING gist (
  tsrange(start_at, end_at) WITH &&,
  tenant_id WITH =,
  COALESCE(manicurist_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =
);

// Índice único para limite 1 agendamento/dia/cliente (BUG #5)
CREATE UNIQUE INDEX idx_unique_daily_booking
ON appointments (tenant_id, client_phone, booking_date)
WHERE status = 'booked' AND canceled_at IS NULL;

// CHECK constraints para validação (BUG #3, #9)
ALTER TABLE appointments
ADD CONSTRAINT check_client_first_name_length
CHECK (LENGTH(TRIM(client_first_name)) >= 2 AND LENGTH(TRIM(client_first_name)) <= 60);

ALTER TABLE appointments
ADD CONSTRAINT check_client_phone_format
CHECK (client_phone ~ '^\d{10,15}$');

// ============================================================
// 6. CONSTANTES DE LIMITE (validation.ts)
// ============================================================

const LIMITS = {
  FIRST_NAME_MIN: 2,      // BUG #3
  FIRST_NAME_MAX: 60,     // BUG #9
  LAST_NAME_MIN: 2,       // BUG #3
  LAST_NAME_MAX: 60,      // BUG #9
  PHONE_MIN: 10,          // BUG #3
  PHONE_MAX: 15,          // BUG #8, #9
  NOTES_MAX: 200,         // BUG #9
};

// Usar nos inputs:
<input
  type="text"
  maxLength={LIMITS.FIRST_NAME_MAX}
  placeholder={`Máximo ${LIMITS.FIRST_NAME_MAX} caracteres`}
/>

// ============================================================
// 7. FLUXO COMPLETO: DO FORM AO BANCO
// ============================================================

/*
User types "A" in name field
  ↓
handleNameChange("A")
  ↓
clampLength("A", 60) → "A"
  ↓
setForm(prev => ({ ...prev, firstName: "A" }))
  ↓
[Não mostra erro ainda, só on blur ou submit]
  ↓
User clicks "Agendar"
  ↓
handleSubmit()
  ↓
validateAppointmentForm({ firstName: "A", ... })
  ↓
isValidName("A") → false (< 2 caracteres)
  ↓
errors.firstName = "Nome deve ter no mínimo 2 caracteres..."
  ↓
setFieldErrors(errors)
  ↓
UI exibe erro em vermelho sob o input
  ↓
Submit bloqueado

---

User types "João Silva", "11 98765-4321", selects future time
  ↓
handlePhoneChange("11 98765-4321")
  ↓
sanitizePhone("11 98765-4321") → "11987654321"
  ↓
clampLength(..., 15) → "11987654321"
  ↓
setForm(prev => ({ ...prev, phone: "11987654321" }))
  ↓
User clicks "Agendar"
  ↓
handleSubmit()
  ↓
validateAppointmentForm({
  firstName: "João",
  lastName: "Silva",
  phone: "11987654321",
  notes: "..."
})
  ↓
Todas as validações passam ✓
  ↓
createAppointment({
  tenantId: "uuid-...",
  serviceId: "uuid-...",
  startAtISO: "2026-02-10T14:00:00Z",
  clientFirstName: "João",
  clientLastName: "Silva",
  clientPhone: "11987654321",
  ...
})
  ↓
Backend valida novamente (validateAppointmentForm)
  ↓
Query overlap:
  SELECT * FROM appointments
  WHERE tenant_id = "uuid-..."
  AND status = 'booked'
  AND start_at < "2026-02-10T15:00:00Z"
  AND end_at > "2026-02-10T14:00:00Z"
  ↓
Nenhum resultado → OK
  ↓
Query limite diário:
  SELECT * FROM appointments
  WHERE tenant_id = "uuid-..."
  AND client_phone = "11987654321"
  AND status = 'booked'
  AND DATE(start_at) = '2026-02-10'
  ↓
Nenhum resultado → OK
  ↓
INSERT agendamento
  ↓
EXCLUDE constraint valida overlap (redundância no BD)
  ↓
Unique index valida limite diário (redundância no BD)
  ↓
Agendamento criado ✅
  ↓
Resposta: "Agendamento realizado com sucesso"
  ↓
Clear form, show success message
*/

// ============================================================
// FIM DOS EXEMPLOS
// ============================================================
