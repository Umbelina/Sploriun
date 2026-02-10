import { supabase } from "../lib/supabaseClient";
import {
  sanitizePhone,
  isValidPhone,
  isValidName,
  validateAppointmentForm,
  LIMITS,
} from '../lib/validation';
import type { Tenant, Service, AppointmentInsert, AppointmentRow } from '../types/db';
import type { AvailabilityRule } from '../types/db';
import { computeSlotsFromRules } from './slotUtils';

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return (data as Tenant) ?? null;
}

export async function listServicesByTenant(tenantId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAppointment(payload: {
  tenantId: string;
  serviceId: string;
  startAtISO: string; // ISO string
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientUserId?: string | null;
  notes?: string | null;
  manicuristId?: string | null;
  rescheduledFromId?: string | null; // Link to canceled appointment being rescheduled
}): Promise<AppointmentRow> {
  const {
    tenantId,
    serviceId,
    startAtISO,
    clientFirstName,
    clientLastName,
    clientPhone,
    clientUserId,
    notes,
    manicuristId,
    rescheduledFromId,
  } = payload;

  // ============================================================
  // 1. VALIDAR INPUTS
  // ============================================================
  const validationResult = validateAppointmentForm({
    firstName: clientFirstName,
    lastName: clientLastName,
    phone: clientPhone,
    notes,
  });

  if (!validationResult.isValid) {
    const errorMessages = Object.values(validationResult.errors).join('; ');
    throw new Error(`Validação falhou: ${errorMessages}`);
  }

  // ============================================================
  // 2. BUSCAR SERVIÇO E CALCULAR end_at
  // ============================================================
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .limit(1)
    .maybeSingle();

  if (svcErr) throw svcErr;
  if (!services) throw new Error('Serviço não encontrado');

  const durationMinutes = services.duration_minutes ?? 30;
  const startAt = new Date(startAtISO);

  if (Number.isNaN(startAt.getTime())) {
    throw new Error('Data ou horário inválidos');
  }

  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  // ============================================================
  // 3. VERIFICAR OVERLAP (BUG #1)
  // Impedir duplo agendamento no mesmo horário para a mesma manicure
  // ============================================================
  const { data: overlapping, error: overlapErr } = await supabase
    .from('appointments')
    .select('id, start_at, end_at, manicurist_id')
    .eq('tenant_id', tenantId)
    .eq('service_id', serviceId)
    .eq('status', 'booked')
    // Manicurist_id pode ser null, então checar com filtering no código se necessário
    .lte('start_at', endAt.toISOString())
    .gte('end_at', startAt.toISOString());

  if (overlapErr) throw overlapErr;

  // Se há manicurista, filtrar apenas os que envolvem a mesma
  if (manicuristId) {
    const conflicting = overlapping?.filter(apt => apt.manicurist_id === manicuristId);
    if (conflicting && conflicting.length > 0) {
      throw new Error(
        `Horário indisponível para este agendamento. Verifique os horários disponíveis.`
      );
    }
  } else {
    // Se não há manicurista, qualquer overlap é conflito
    if (overlapping && overlapping.length > 0) {
      throw new Error(
        `Horário indisponível. Verifique os horários disponíveis.`
      );
    }
  }

  // ============================================================
  // 4. VERIFICAR LIMITE DE 1 AGENDAMENTO POR DIA POR CLIENTE (BUG #5)
  // Mesmo cliente (telefone) não pode ter mais de 1 booking "booked" no mesmo dia
  // ============================================================
  const clientPhoneClean = sanitizePhone(clientPhone);
  const dayStart = new Date(startAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(startAt);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: sameDay, error: sameDayErr } = await supabase
    .from('appointments')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_phone', clientPhoneClean)
    .eq('status', 'booked')
    .gte('start_at', dayStart.toISOString())
    .lte('start_at', dayEnd.toISOString());

  if (sameDayErr) throw sameDayErr;

  if (sameDay && sameDay.length > 0) {
    throw new Error(
      'Este cliente já possui um agendamento marcado para este dia. Por favor, escolha outra data.'
    );
  }

  // ============================================================
  // 5. INSERIR AGENDAMENTO
  // ============================================================
  const insertPayload: AppointmentInsert = {
    tenant_id: tenantId,
    service_id: serviceId,
    manicurist_id: manicuristId ?? null,
    client_user_id: clientUserId ?? null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    status: 'booked',
    canceled_at: null,
    rescheduled_from_id: rescheduledFromId ?? null,
    client_first_name: clientFirstName,
    client_last_name: clientLastName,
    client_phone: clientPhoneClean,
    notes: notes ? notes.substring(0, LIMITS.NOTES_MAX) : null,
  };

  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert([insertPayload])
      .select('*')
      .single();

    if (error) {
      // Mapear códigos de erro do Postgres para mensagens amigáveis
      const code = (error as any)?.code || (error as any)?.details || null;
      if (code === '23P01') throw new Error('Horário indisponível');
      if (code === '23505') throw new Error('Você já possui agendamento neste dia');
      if (code === '23514') throw new Error('Dados inválidos');
      throw error;
    }

    return data as AppointmentRow;
  } catch (err: any) {
    // Caso Supabase retorne um error object em outra estrutura
    const pgCode = err?.code || err?.status || null;
    if (pgCode === '23P01') throw new Error('Horário indisponível');
    if (pgCode === '23505') throw new Error('Você já possui agendamento neste dia');
    if (pgCode === '23514') throw new Error('Dados inválidos');
    throw err;
  }
}

/**
 * SEGURO: Cancelar agendamento verificando tenant_id e client_phone
 * Impede que cliente cancele agendamento de outro cliente
 */
export async function cancelAppointmentSecure(
  appointmentId: string,
  tenantId: string,
  clientPhoneClean: string
): Promise<{ success: boolean; message: string }> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .update({
      status: 'canceled',
      canceled_at: now,
    })
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
    .eq('client_phone', clientPhoneClean)
    .eq('status', 'booked')
    .select('id')
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      success: false,
      message: 'Não autorizado ou agendamento já cancelado',
    };
  }

  return {
    success: true,
    message: 'Agendamento cancelado com sucesso',
  };
}

/**
 * SEGURO: Buscar agendamentos por telefone exato (não contains)
 * Filtra por tenant_id + client_phone com match exato
 * Retorna appointments com nome do serviço via join
 */
export async function getAppointmentsByPhone(
  tenantId: string,
  clientPhoneClean: string
): Promise<(AppointmentRow & { service_name?: string })[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      tenant_id,
      service_id,
      manicurist_id,
      start_at,
      end_at,
      status,
      canceled_at,
      client_first_name,
      client_last_name,
      client_phone,
      notes,
      created_at,
      updated_at,
      services(name)
      `
    )
    .eq('tenant_id', tenantId)
    .eq('client_phone', clientPhoneClean)
    .order('start_at', { ascending: false });

  if (error) throw error;

  // Mapear services(name) para service_name
  return (data ?? []).map((apt: any) => ({
    ...apt,
    service_name: apt.services?.name || apt.service_id,
  }));
}

export async function getAppointmentsForClient(
  clientUserId: string
): Promise<(AppointmentRow & { service_name?: string | null; duration_minutes?: number | null })[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      tenant_id,
      service_id,
      manicurist_id,
      start_at,
      end_at,
      status,
      canceled_at,
      client_first_name,
      client_last_name,
      client_phone,
      notes,
      created_at,
      updated_at,
      rescheduled_from_id,
      client_user_id,
      services ( name, duration_minutes )
    `)
    .eq('client_user_id', clientUserId)
    .order('start_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((apt: any) => ({
    ...(apt as AppointmentRow),
    service_name: apt.services?.name ?? null,
    duration_minutes: apt.services?.duration_minutes ?? null,
  }));
}

/**
 * Cancelar agendamento como cliente logado
 */
export async function cancelAppointmentByClient(
  appointmentId: string,
  clientUserId: string
): Promise<{ success: boolean; message: string }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'canceled', canceled_at: now })
    .eq('id', appointmentId)
    .eq('client_user_id', clientUserId)
    .eq('status', 'booked')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) return { success: false, message: 'Não autorizado ou agendamento já cancelado' };
  return { success: true, message: 'Agendamento cancelado com sucesso' };
}

/**
 * Criar notificação simples
 */
export async function createNotification(params: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  payload?: any | null;
}) {
  const { tenantId, userId, type, title, body, payload } = params;
  const { data, error } = await supabase.from('notifications').insert([
    {
      tenant_id: tenantId,
      user_id: userId,
      type,
      title,
      body: body ?? null,
      payload: payload ?? null,
    },
  ]);
  if (error) throw error;
  return data;
}

export type NotificationRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: any | null;
  read_at: string | null;
  created_at: string;
};

/**
 * Buscar notificações do usuário logado (RLS: user_id = auth.uid()).
 */
export async function getUserNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

/**
 * Marcar uma notificação como lida (somente do próprio usuário).
 * Requer policy UPDATE usando user_id = auth.uid().
 */
export async function markNotificationRead(notificationId: string, userId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Marcar todas como lidas (somente do próprio usuário).
 * Requer policy UPDATE usando user_id = auth.uid().
 */
export async function markAllNotificationsRead(userId: string) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

/**
 * Lista slots disponíveis para um serviço em uma data específica (BUG #2 e #4)
 * Gera slots de 30 minutos e marca ocupados apenas se há overlap real
 * Filtra por tenant_id e opcionalmente por manicurist_id
 */
export async function getAvailableSlots(
  tenantId: string,
  serviceId: string,
  dateISO: string, // "2026-02-03"
  manicuristId?: string | null
): Promise<{ time: string; available: boolean }[]> {
  // Buscar duração do serviço
  const { data: service, error: svcErr } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .limit(1)
    .maybeSingle();

  if (svcErr) throw svcErr;
  if (!service) throw new Error('Serviço não encontrado');

  const durationMinutes = service.duration_minutes ?? 30;

  // Gerar slots de 30 em 30 minutos das 08:00 às 20:00
  const slots: { time: string; available: boolean }[] = [];
  const dayStart = new Date(`${dateISO}T08:00:00-03:00`);
  const dayEnd = new Date(`${dateISO}T20:00:00-03:00`);

  for (let time = new Date(dayStart); time < dayEnd; time.setMinutes(time.getMinutes() + 30)) {
    const slotStart = new Date(time);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

    slots.push({
      time: `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`,
      available: true, // será atualizado abaixo
    });
  }

  // Buscar agendamentos "booked" para este dia e serviço
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('start_at, end_at, manicurist_id')
    .eq('tenant_id', tenantId)
    .eq('service_id', serviceId)
    .eq('status', 'booked')
    .gte('start_at', `${dateISO}T00:00:00-03:00`)
    .lt('start_at', `${dateISO}T23:59:59-03:00`);

  if (apptErr) throw apptErr;

  // Marcar slots como indisponíveis se há overlap
  slots.forEach((slot, idx) => {
    const slotStart = new Date(`${dateISO}T${slot.time}:00-03:00`);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

    const hasConflict = appointments?.some(apt => {
      // Se há manicurista e o agendamento é de outra, não conflita
      if (manicuristId && apt.manicurist_id !== manicuristId) return false;

      const apptStart = new Date(apt.start_at);
      const apptEnd = new Date(apt.end_at);

      // Overlap real: slotStart < apptEnd && slotEnd > apptStart
      return slotStart < apptEnd && slotEnd > apptStart;
    });

    if (hasConflict) {
      slots[idx].available = false;
    }
  });

  return slots;
}

/**
 * Lista agendamentos de forma SEGURA: filtrando por tenant_id
 * NÃO retorna agendamentos de outros clientes (BUG #4)
 */
export async function getAppointmentsByTenant(
  tenantId: string,
  dateISO?: string,
  { limit = 100, order = 'asc' } = {}
): Promise<AppointmentRow[]> {
  let q = supabase
    .from('appointments')
    .select('*')
    .eq('tenant_id', tenantId); // CRÍTICO: sempre filtrar por tenant_id

  if (dateISO) {
    // Filter by appointment_date range (America/Sao_Paulo timezone)
    // dateISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss-03:00
    const dateOnly = dateISO.split('T')[0]; // YYYY-MM-DD
    const dayStart = `${dateOnly}T00:00:00`;
    const dayEnd = `${dateOnly}T23:59:59`;
    q = q.gte('start_at', dayStart).lte('start_at', dayEnd);
  }

  if (order === 'asc') q = q.order('start_at', { ascending: true });
  else q = q.order('start_at', { ascending: false });

  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Busca agendamento por ID e tenant_id (validação de segurança)
 */
export async function getAppointmentById(
  appointmentId: string,
  tenantId: string
): Promise<AppointmentRow | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId) // CRÍTICO: validar tenant_id
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

// -----------------------
// Availability Rules CRUD
// -----------------------

export async function createAvailabilityRule(params: {
  tenantId: string;
  weekday: number;
  startTime: string; // 'HH:MM:SS' or 'HH:MM'
  endTime: string; // 'HH:MM:SS' or 'HH:MM'
  slotMinutes?: number;
  isActive?: boolean;
}) {
  const { tenantId, weekday, startTime, endTime, slotMinutes = 30, isActive = true } = params;

  if (weekday < 0 || weekday > 6) throw new Error('weekday must be between 0 and 6');

  const { data, error } = await supabase.from('availability_rules').insert([
    {
      tenant_id: tenantId,
      weekday,
      start_time: startTime,
      end_time: endTime,
      slot_minutes: slotMinutes,
      is_active: isActive,
    },
  ]);

  if (error) throw error;
  return data ?? null;
}

export async function listAvailabilityRules(tenantId: string): Promise<AvailabilityRule[]> {
  const { data, error } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateAvailabilityRule(id: string, tenantId: string, updates: Partial<AvailabilityRule>) {
  const { data, error } = await supabase
    .from('availability_rules')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function deleteAvailabilityRule(id: string, tenantId: string) {
  // We perform a hard delete; RLS should prevent cross-tenant deletes.
  const { data, error } = await supabase.from('availability_rules').delete().eq('id', id).eq('tenant_id', tenantId);
  if (error) throw error;
  return data;
}

// -----------------------
// Slot generation
// -----------------------
/**
 * Central slot generator.
 * Options:
 *  - serviceId?: string to fetch duration
 *  - durationMinutes?: number to explicitly set duration
 *  - manicuristId?: string|null to check per-manicurist availability (optional)
 */
export async function generateSlots(
  tenantId: string,
  dateISO: string, // 'YYYY-MM-DD'
  opts?: { serviceId?: string; durationMinutes?: number; manicuristId?: string | null }
): Promise<{ time: string; available: boolean }[]> {
  try {
    const timeZone = 'America/Sao_Paulo';

    // Determine weekday in Sao_Paulo for the provided date by creating a noon timestamp in that zone
    const middayInZone = new Date(`${dateISO}T12:00:00-03:00`);
    const weekday = middayInZone.getDay();

    // Fetch active rules for this tenant + weekday
    const { data: rules, error: rulesErr } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('weekday', weekday)
      .eq('is_active', true)
      .order('start_time', { ascending: true });

    if (rulesErr) throw rulesErr;
    const availabilityRules: AvailabilityRule[] = (rules ?? []) as AvailabilityRule[];

    // Determine service duration
    let durationMinutes = opts?.durationMinutes ?? 30;
    if (opts?.serviceId) {
      const { data: svc, error: svcErr } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', opts.serviceId)
        .limit(1)
        .maybeSingle();
      if (svcErr) throw svcErr;
      if (svc && svc.duration_minutes) durationMinutes = svc.duration_minutes;
    }

    // Build day start/end in UTC by parsing times with -03:00 offset (America/Sao_Paulo standard)
    const dayStartUtc = new Date(`${dateISO}T00:00:00-03:00`);
    const dayEndUtc = new Date(`${dateISO}T23:59:59.999-03:00`);

    // Collect slots
    const slots: { time: string; available: boolean; startUtc: Date; endUtc: Date }[] = [];

    for (const rule of availabilityRules) {
      // rule.start_time is e.g. '08:00:00' or '08:00'
      const ruleStartUtc = new Date(`${dateISO}T${rule.start_time}-03:00`);
      const ruleEndUtc = new Date(`${dateISO}T${rule.end_time}-03:00`);
      const step = rule.slot_minutes || 30;

      for (let cur = new Date(ruleStartUtc.getTime()); cur.getTime() < ruleEndUtc.getTime(); cur = new Date(cur.getTime() + step * 60_000)) {
        const slotStartUtc = new Date(cur.getTime());
        const slotEndUtc = new Date(slotStartUtc.getTime() + durationMinutes * 60_000);

        // only include slots that start before ruleEnd (slot may extend beyond end)
        if (slotStartUtc.getTime() < ruleEndUtc.getTime()) {
          // Format label in America/Sao_Paulo using Intl
          const dtf = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
          const label = dtf.format(slotStartUtc);
          slots.push({ time: label, available: true, startUtc: slotStartUtc, endUtc: slotEndUtc });
        }
      }
    }

    // Remove duplicate times (if overlapping rules produced same label)
    const uniqueSlotsMap: Record<string, { time: string; available: boolean; startUtc: Date; endUtc: Date }> = {};
    for (const s of slots) uniqueSlotsMap[s.time] = s;
    const uniqueSlots = Object.values(uniqueSlotsMap).sort((a, b) => (a.time < b.time ? -1 : 1));

    // Fetch appointments for the day for this tenant
    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select('start_at, end_at, manicurist_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'booked')
      .gte('start_at', dayStartUtc.toISOString())
      .lte('start_at', dayEndUtc.toISOString());

    if (apptErr) throw apptErr;

    // Delegate to computeSlotsFromRules to finalize availability
    return computeSlotsFromRules(availabilityRules, appointments ?? [], dateISO, durationMinutes, {
      manicuristId: opts?.manicuristId,
      timeZone,
    });
  } catch (err) {
    throw err;
  }
}

export async function getAppointments({ limit = 100, order = 'asc' } = {}) {
  // DEPRECATED: use getAppointmentsByTenant em vez desta função
  // Esta função não tem filtro de tenant_id, não usar em produção
  let q = supabase.from('appointments').select('*');
  if (order === 'asc') q = q.order('created_at', { ascending: true });
  else q = q.order('created_at', { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function updateAppointment(id: string, updates: Partial<AppointmentInsert>) {
  const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select('*').single();
  if (error) throw error;
  return data as AppointmentRow;
}

/**
 * Create a new service
 */
export async function createService(payload: {
  tenantId: string;
  name: string;
  durationMinutes: number;
  isActive?: boolean;
}): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .insert({
      tenant_id: payload.tenantId,
      name: payload.name,
      duration_minutes: payload.durationMinutes,
      is_active: payload.isActive ?? true,
      sort_order: 0,
    })
    .select();
  if (error) {
    if (error.code === '23505') throw new Error('Serviço já existe');
    throw error;
  }
  return data ?? [];
}

/**
 * Update a service
 */
export async function updateService(
  serviceId: string,
  tenantId: string,
  updates: {
    name?: string;
    duration_minutes?: number;
    is_active?: boolean;
  }
): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', serviceId)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data ?? null;
}

/**
 * Delete a service
 */
export async function deleteService(serviceId: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

