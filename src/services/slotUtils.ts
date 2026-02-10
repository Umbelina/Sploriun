import type { AvailabilityRule } from '../types/db';

/**
 * Pure function that generates labeled slots from availability rules and existing appointments.
 * Returns array of { time: 'HH:mm', available: boolean }
 */
export function computeSlotsFromRules(
  availabilityRules: AvailabilityRule[],
  appointments: Array<{ start_at: string; end_at: string; manicurist_id?: string | null }>,
  dateISO: string,
  durationMinutes: number,
  opts?: { manicuristId?: string | null; timeZone?: string }
): { time: string; available: boolean }[] {
  const timeZone = opts?.timeZone ?? 'America/Sao_Paulo';

  const slots: { time: string; available: boolean; startUtc: Date; endUtc: Date }[] = [];

  for (const rule of availabilityRules) {
    const ruleStartUtc = new Date(`${dateISO}T${rule.start_time}-03:00`);
    const ruleEndUtc = new Date(`${dateISO}T${rule.end_time}-03:00`);
    const step = rule.slot_minutes || 30;

    for (let cur = new Date(ruleStartUtc.getTime()); cur.getTime() < ruleEndUtc.getTime(); cur = new Date(cur.getTime() + step * 60_000)) {
      const slotStartUtc = new Date(cur.getTime());
      const slotEndUtc = new Date(slotStartUtc.getTime() + durationMinutes * 60_000);

      if (slotStartUtc.getTime() < ruleEndUtc.getTime()) {
        const dtf = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
        const label = dtf.format(slotStartUtc);
        slots.push({ time: label, available: true, startUtc: slotStartUtc, endUtc: slotEndUtc });
      }
    }
  }

  // Deduplicate by label, keep earliest
  const uniqueMap: Record<string, { time: string; available: boolean; startUtc: Date; endUtc: Date }> = {};
  for (const s of slots) {
    if (!uniqueMap[s.time] || s.startUtc.getTime() < uniqueMap[s.time].startUtc.getTime()) {
      uniqueMap[s.time] = s;
    }
  }

  const uniqueSlots = Object.values(uniqueMap).sort((a, b) => (a.time < b.time ? -1 : 1));

  const final = uniqueSlots.map(s => {
    const hasConflict = (appointments ?? []).some(apt => {
      if (opts?.manicuristId && apt.manicurist_id && apt.manicurist_id !== opts.manicuristId) return false;
      const apptStart = new Date(apt.start_at);
      const apptEnd = new Date(apt.end_at);
      return s.startUtc < apptEnd && s.endUtc > apptStart;
    });

    return { time: s.time, available: !hasConflict };
  });

  return final;
}
