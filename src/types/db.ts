export interface Tenant {
  id: string;
  slug: string;
  display_name: string;
  whatsapp_number: string;
  primary_color?: string | null;
  logo_url?: string | null;
  bio_text?: string | null;
  address_text?: string | null;
  policy_text?: string | null;
  timezone: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  logo_path?: string | null;
  brand_color?: string | null;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  duration_minutes: number;
  is_active?: boolean | null;
  sort_order?: number | null;
}

export interface Manicurist {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string | null;
  instagram?: string | null;
  is_active?: boolean | null;
  password_hash?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AppointmentInsert {
  tenant_id: string;
  service_id: string;
  manicurist_id?: string | null;
  client_user_id?: string | null;
  start_at: string; // ISO string
  end_at: string; // ISO string
  status?: string;
  canceled_at?: string | null;
  rescheduled_from_id?: string | null;
  client_first_name: string;
  client_last_name: string;
  client_phone: string;
  notes?: string | null;
}

export interface AppointmentRow extends AppointmentInsert {
  id: string;
  rescheduled_from_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AvailabilityRule {
  id: string;
  tenant_id: string;
  weekday: number; // 0=Sunday .. 6=Saturday
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  slot_minutes: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Profile {
  id: string;
  email?: string | null;
  role?: string | null;
  display_name?: string | null;
  tenant_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
