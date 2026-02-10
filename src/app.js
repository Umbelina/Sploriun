// Supabase helper for Sploriun Manicure & Pedicure
// Provides functions to interact with the `appointments` storage via Supabase

import { supabase as _supabase } from './lib/supabaseClient';
import { createAppointment as createAppointmentNew, getAppointments as getAppointmentsNew, deleteAppointment as deleteAppointmentNew, updateAppointment as updateAppointmentNew } from './services/db';

export const supabase = _supabase;
export const createAppointment = createAppointmentNew;
export const getAppointments = getAppointmentsNew;
export const deleteAppointment = deleteAppointmentNew;
export const updateAppointment = updateAppointmentNew;

export default {
  supabase,
  createAppointment,
  getAppointments,
  deleteAppointment,
  updateAppointment,
};
