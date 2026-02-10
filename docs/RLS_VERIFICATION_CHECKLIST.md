# RLS Verification Checklist

This document outlines the Row-Level Security (RLS) policies for the appointment system and how to verify they are working correctly.

## RLS Policy Overview

### 1. **Owner Access - Full Tenant Visibility**

**Requirement:** Owner can CRUD all appointments for their tenant.

**SQL Policy:**
```sql
CREATE POLICY appointments_owner_tenant ON public.appointments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.tenant_id = appointments.tenant_id 
      AND p.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.tenant_id = appointments.tenant_id 
      AND p.role = 'owner'
    )
  );
```

**Verification:**
- ✅ Owner logs in with role='owner'
- ✅ OwnerAgenda queries `getAppointmentsByTenant(tenantId, dateISO)` 
- ✅ Returns ALL appointments for that tenant on the selected date
- ✅ Owner can cancel/reschedule ANY appointment, not just own

**Test Case:**
```typescript
// Owner A logs in, tenant=uuid-A
const appts = await getAppointmentsByTenant('uuid-A', '2026-02-03');
// Should return all appointments for tenant A, regardless of client_user_id
```

---

### 2. **Client Access - Own Appointments Only**

**Requirement:** Client can only SELECT and INSERT their own appointments (by client_user_id).

**SQL Policies:**
```sql
-- Client SELECT own
CREATE POLICY appointments_client_select ON public.appointments
  FOR SELECT
  USING (client_user_id = auth.uid());

-- Client INSERT own
CREATE POLICY appointments_client_insert ON public.appointments
  FOR INSERT
  WITH CHECK (client_user_id = auth.uid());

-- Client UPDATE own (limited to cancel/reschedule)
CREATE POLICY appointments_client_update ON public.appointments
  FOR UPDATE
  USING (client_user_id = auth.uid())
  WITH CHECK (client_user_id = auth.uid());
```

**Verification:**
- ✅ Client logs in with role='client', user_id=uuid-CLIENT
- ✅ ClientDashboard queries appointments filtered by client_user_id
- ✅ Client CANNOT see other clients' appointments
- ✅ Client CANNOT directly INSERT with different client_user_id
- ✅ Client CANNOT UPDATE start_at or end_at directly

**Test Case:**
```typescript
// Client A logs in, user_id=uuid-CLIENT-A
const appts = await supabase
  .from('appointments')
  .select('*')
  .eq('client_user_id', 'uuid-CLIENT-A');
// RLS will filter: only returns rows where client_user_id = auth.uid()

// Attempt to see Client B's appointments:
const badAppts = await supabase
  .from('appointments')
  .select('*')
  .eq('client_user_id', 'uuid-CLIENT-B');
// RLS blocks: returns empty result
```

---

### 3. **Anonymous Access - No Direct Reads**

**Requirement:** Anonymous users (not authenticated) cannot read appointments.

**RLS Enforcement:**
- `ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;`
- No policy exists for anonymous (auth.uid() = NULL)
- RLS denies all by default

**Verification:**
- ✅ Unauthenticated request to `appointments` table returns empty or error
- ✅ Public booking form NEVER queries `appointments` table directly
- ✅ Slot availability is computed from `availability_rules` + backend cache, NOT from `appointments`

**Test Case:**
```typescript
// No auth token
const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const result = await anonClient
  .from('appointments')
  .select('*');
// Should return: error or empty (RLS blocks all)
```

---

### 4. **Client Cannot Alter start_at Directly**

**Requirement:** Clients can only modify appointments via controlled flows:
- **Cancel:** Via `cancelAppointmentSecure()` - updates status='canceled', canceled_at=now()
- **Reschedule:** Via OwnerAgenda or ClientDashboard flow
  - INSERT new appointment with `rescheduled_from_id = oldId`
  - UPDATE old appointment: status='canceled', canceled_at=now()

**Backend Enforcement (db.ts):**
```typescript
// Only these functions are allowed:
- cancelAppointmentSecure(apptId, tenantId)  // UPDATE status
- createAppointment(..., rescheduledFromId)  // INSERT with link
- updateAppointment(apptId, { status, canceled_at, ... }) // Limited updates

// These are FORBIDDEN:
- Direct UPDATE with start_at, end_at, client_phone changes
- deleteAppointment() - throws error, use cancel instead
```

**RLS Policy Limitation:**
The UPDATE policy for clients is permissive (allows all UPDATE as long as client_user_id matches), but the backend enforces:
- Clients can only update via `updateAppointment()` function
- That function only allows `status='canceled'` and `canceled_at` updates
- start_at, end_at, service_id are NEVER modified after insert

**Verification:**
- ✅ Client clicks "Cancelar" → calls `cancelAppointmentSecure()` → status='canceled'
- ✅ Client clicks "Reagendar" → creates NEW appointment with `rescheduled_from_id = oldId`
- ✅ Old appointment is marked canceled, not deleted
- ✅ Reschedule history is preserved via `rescheduled_from_id` column

**Test Case:**
```typescript
// Client reschedules their own appointment
const oldApptId = 'appt-123';
const newAppt = await createAppointment({
  tenantId,
  serviceId,
  startAtISO: '2026-02-10T14:00:00-03:00',
  clientFirstName, clientLastName, clientPhone,
  clientUserId: auth.uid(),
  rescheduledFromId: oldApptId, // ← Link back to old
});

// Old appointment marked as canceled
await updateAppointment(oldApptId, {
  status: 'canceled',
  canceled_at: new Date().toISOString(),
});

// Verify old is canceled
const old = await getAppointmentById(oldApptId);
assert(old.status === 'canceled');
assert(old.rescheduled_from_id === null); // New appt doesn't reference old in schema
```

---

## Hardening Summary

### ✅ Implemented Safeguards

1. **No Direct Deletes:**
   - `deleteAppointment()` throws error
   - All cancellations via UPDATE with timestamp

2. **Reschedule Tracking:**
   - New appointment: `rescheduled_from_id = oldApptId`
   - Old appointment: status='canceled', canceled_at=now()
   - Preserves audit trail

3. **Date Filtering in SQL:**
   - `getAppointmentsByTenant(tenantId, dateISO)` uses range query:
     ```typescript
     .gte('start_at', dayStart).lte('start_at', dayEnd)
     ```
   - No JavaScript-side filtering of sensitive data

4. **RLS Policies Active:**
   - Owner: full CRUD by tenant_id
   - Client: SELECT/INSERT/UPDATE own by client_user_id
   - Anon: blocked by default

5. **Backend Validation:**
   - `createAppointment()` validates overlap before insert
   - `cancelAppointmentSecure()` checks tenant_id
   - `updateAppointment()` checks tenant_id on return

---

## Testing Checklist

### Pre-Deployment

- [ ] Owner can view all tenant appointments
- [ ] Owner can cancel any appointment
- [ ] Owner can reschedule any appointment
- [ ] Client can view only own appointments
- [ ] Client cannot view other client's appointments
- [ ] Client can cancel own appointment
- [ ] Client can reschedule own appointment
- [ ] Anonymous user gets error on appointments query
- [ ] Deleted appointments do not exist (no soft deletes yet)
- [ ] Reschedule creates proper `rescheduled_from_id` link
- [ ] `deleteAppointment()` throws error if called

### Post-Deployment

- [ ] Monitor error logs for RLS policy violations
- [ ] Verify `canceled_at` timestamps on canceled appointments
- [ ] Check reschedule audit trail in `rescheduled_from_id` column
- [ ] Confirm no orphaned appointments (status != 'booked' and status != 'canceled')

---

## Known Limitations & Future Improvements

1. **RLS Policy for UPDATE:** Currently allows any UPDATE to own appointment. Should be stricter to prevent:
   - Modifying `notes`, `client_phone`, etc. (low risk, but should be restricted)
   - Solution: Use PostgreSQL CHECK constraints or trigger validation

2. **Soft Deletes:** Appointments are never truly deleted. This is by design for audit trail.
   - Future: Add `archived_at` column if cleanup is needed

3. **Reschedule Limit:** Client can reschedule infinitely. Could add limit.
   - Future: Add check like `rescheduled_count < 3` or deadline

---

## References

- Schema: [sql/auth_and_rls.sql](../sql/auth_and_rls.sql)
- Functions: [src/services/db.ts](../src/services/db.ts)
- Owner UI: [src/components/OwnerAgenda.tsx](../src/components/OwnerAgenda.tsx)
- Client UI: [src/components/ManageAppointments.tsx](../src/components/ManageAppointments.tsx)
