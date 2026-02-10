Manual tests for generateSlots

Overview
- Function: `generateSlots(tenantId, dateISO, opts?)`
- Timezone: America/Sao_Paulo
- Returns: array of `{ time: 'HH:mm', available: boolean }`

How to run (manual)
1. Ensure your Supabase instance has the `availability_rules` table populated for the tenant.
2. Ensure appointments exist with `status='booked'` for the same tenant.
3. From a node REPL or calling code, import and call the function:

```ts
import { generateSlots } from './src/services/db';

const slots = await generateSlots('tenant-uuid', '2026-02-03', { serviceId: 'service-uuid' });
console.log(slots);
```

Test cases

1) Simple rule, no appointments
- Rule: 09:00-12:00, slot_minutes=30, service duration 30
- Expected: slots 09:00,09:30,10:00,...,11:30 all available

2) Appointment blocks partial slot
- Appointment: 09:15-09:45
- Expected: 09:00 slot (09:00-09:30) overlaps -> unavailable; 09:30 (09:30-10:00) overlaps -> unavailable

3) Appointment exactly ends when slot starts
- Appointment: 09:00-09:30
- Slot: 09:30 should be available (no overlap)

4) Appointment starts when slot ends
- Appointment: 09:30-10:00
- Slot: 09:00 should be available (no overlap)

5) Different service duration
- Service duration 60 minutes, rule step 30
- Slot 09:00 covers 09:00-10:00; any appointment overlapping that interval makes it unavailable

6) Multiple rules
- Rule A: 08:00-10:00
- Rule B: 09:30-12:00
- Duplicate slot times should be deduplicated; availability follows appointments

Notes
- If `opts.manicuristId` is provided, availability checks consider only appointments that belong to that manicurist.
- If `opts.serviceId` is provided, the service duration is fetched; otherwise `opts.durationMinutes` or 30 is used.

Edge-case example to validate (from user):
- appointment 09:00-10:00 should NOT block 10:30 (10:30 remains available)

If anything behaves differently, check stored appointment `start_at`/`end_at` timezones in Supabase and verify the SQL times used in the DB are UTC ISO strings.
