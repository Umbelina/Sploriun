import { computeSlotsFromRules } from '../services/slotUtils';

(async () => {
  const date = '2026-02-03';

  // Sample rule: 09:00-12:00 step 30
  const rules = [
    {
      id: 'r1',
      tenant_id: 't1',
      weekday: new Date(`${date}T12:00:00-03:00`).getDay(),
      start_time: '09:00:00',
      end_time: '12:00:00',
      slot_minutes: 30,
      is_active: true,
    },
  ];

  // Sample appointments: 09:15-09:45 (should block 09:00 and 09:30)
  const appointments = [
    { start_at: `${date}T09:15:00-03:00`, end_at: `${date}T09:45:00-03:00`, manicurist_id: null },
  ];

  try {
    console.log('Running computeSlotsFromRules smoke test for', date);
    const slots = computeSlotsFromRules(rules as any, appointments as any, date, 30, { timeZone: 'America/Sao_Paulo' });
    console.log('Slots:', JSON.stringify(slots, null, 2));
  } catch (err: any) {
    console.error('computeSlotsFromRules error:', err.message || err);
    process.exitCode = 1;
  }
})();
