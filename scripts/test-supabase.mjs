import { getAppointments, createAppointment, deleteAppointment } from '../src/app.js';

// NOTE: update these to point to a real tenant and service in your Supabase project for an end-to-end test
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || '00000000-0000-0000-0000-000000000000';
const TEST_SERVICE_ID = process.env.TEST_SERVICE_ID || '00000000-0000-0000-0000-000000000000';

const TEST_PREFIX = 'test-' + Date.now().toString();

const sampleStartISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // tomorrow

try {
  console.log('Inserting test appointment (new schema)');
  const created = await createAppointment({
    tenantId: TEST_TENANT_ID,
    serviceId: TEST_SERVICE_ID,
    startAtISO: sampleStartISO,
    clientFirstName: 'Teste',
    clientLastName: 'Usuario',
    clientPhone: '+5511999999999',
    notes: 'script test',
  });
  console.log('Inserted. createAppointment returned:', created);
  const data = await getAppointments({ limit: 20, order: 'asc' });
  console.log('Total appointments returned:', Array.isArray(data) ? data.length : 'no-array');
  const createdId = created && created.id ? created.id : null;
  const found = (data || []).find(d => String(d.id) === String(createdId));
  if (found) {
    console.log('Test appointment found:', { id: found.id, start_at: found.start_at });
  } else {
    console.warn('Test appointment not found in results.');
  }

  // Instead of DELETE, use UPDATE with status='canceled' (safer, preserves audit trail)
  console.log('Cleaning up — canceling test appointment with id', createdId);
  if (createdId) {
    // Cancel the appointment instead of deleting
    const cancelResult = await supabase
      .from('appointments')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('id', createdId);
    if (cancelResult.error) {
      console.error('Error canceling appointment:', cancelResult.error);
    } else {
      console.log('Appointment canceled successfully.');
    }
  }
  console.log('Verifying cancellation...');
  const after = await getAppointments({ limit: 20, order: 'asc' });
  const still = (after || []).find(d => String(d.id) === String(createdId));
  if (still) {
    console.log('Appointment still present (as expected for soft delete):', {
      id: still.id,
      status: still.status,
      canceled_at: still.canceled_at
    });
  }
} catch (err) {
  console.error('Error during test:', err?.message || err);
  if (err && err.details) console.error('Details:', err.details);
  process.exitCode = 1;
}
