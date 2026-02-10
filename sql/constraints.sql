-- ============================================================
-- CONSTRAINTS PARA AGENDAMENTOS - Supabase / PostgreSQL
-- ============================================================
-- Arquivo para aplicar as constraints que garantem:
-- 1. Evitar overlap de agendamentos (EXCLUDE constraint)
-- 2. Limitar a 1 agendamento por dia por cliente (tenant + phone)
-- 3. Validações de tamanho de campos
--
-- Copie estes comandos SQL no editor SQL do Supabase
-- ============================================================

-- ============================================================
-- 1. CONSTRAINT PARA EVITAR OVERLAP (BUG #1 e #2)
-- Impede que o mesmo manicurista/tenant tenha agendamentos sobrepostos
-- ============================================================
-- PostgreSQL 13+ suporta EXCLUDE constraints com tipos de dados exclusion
-- Esta constraint impede overlap no intervalo (start_at, end_at) para a mesma manicurist_id

-- Adicionar extensão se não existir:
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Aplicar EXCLUDE constraint à tabela appointments
-- NOTA: Se manicurist_id puder ser NULL, ajuste a constraint conforme necessário
ALTER TABLE appointments
ADD CONSTRAINT no_overlapping_appointments 
EXCLUDE USING gist (
  -- Usar exclusão temporal: dois agendamentos não podem ter ranges que se sobrepõem
  tsrange(start_at, end_at) WITH &&,
  -- Garantir que sejam para o mesmo tenant
  tenant_id WITH =,
  -- Se manicurist_id não for null, garantir que sejam para o mesmo manicurist
  COALESCE(manicurist_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =
);

-- ============================================================
-- 2. CONSTRAINT PARA LIMITAR 1 AGENDAMENTO POR DIA POR CLIENTE (BUG #5)
-- Mesmo client_phone não pode ter mais de 1 "booked" no mesmo dia para o mesmo tenant
-- ============================================================

-- Criar coluna gerada para a data (sem hora) se não existir
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS booking_date date 
GENERATED ALWAYS AS (DATE(start_at AT TIME ZONE 'America/Sao_Paulo')) STORED;

-- Criar índice único para forçar a restrição:
-- Um mesmo tenant + client_phone + booking_date + status='booked' não pode ocorrer 2 vezes
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_daily_booking
ON appointments (tenant_id, client_phone, booking_date)
WHERE status = 'booked' AND canceled_at IS NULL;

-- ============================================================
-- 3. VALIDAÇÕES DE TAMANHO DE CAMPOS
-- Adicionar constraints CHECK
-- ============================================================

-- Nome e sobrenome: min 2, max 60 caracteres
ALTER TABLE appointments
ADD CONSTRAINT check_client_first_name_length
CHECK (
  LENGTH(TRIM(client_first_name)) >= 2 
  AND LENGTH(TRIM(client_first_name)) <= 60
);

ALTER TABLE appointments
ADD CONSTRAINT check_client_last_name_length
CHECK (
  LENGTH(TRIM(client_last_name)) >= 2 
  AND LENGTH(TRIM(client_last_name)) <= 60
);

-- Telefone: apenas dígitos, 10 a 15 caracteres
ALTER TABLE appointments
ADD CONSTRAINT check_client_phone_format
CHECK (
  client_phone ~ '^\d{10,15}$'
);

-- Notas: max 200 caracteres (opcional)
ALTER TABLE appointments
ADD CONSTRAINT check_notes_length
CHECK (notes IS NULL OR LENGTH(notes) <= 200);

-- ============================================================
-- 4. ÍNDICES PARA PERFORMANCE (BUG #4)
-- Melhorar queries de busca por tenant + data/hora
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date
ON appointments (tenant_id, DATE(start_at AT TIME ZONE 'America/Sao_Paulo'));

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status
ON appointments (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_phone
ON appointments (tenant_id, client_phone, status);

-- ============================================================
-- 5. VALIDAÇÃO: Garantir que end_at > start_at
-- ============================================================

ALTER TABLE appointments
ADD CONSTRAINT check_end_after_start
CHECK (end_at > start_at);

-- ============================================================
-- ROLLBACK (se precisar desfazer)
-- ============================================================
-- -- Remover constraint de overlap:
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlapping_appointments;
-- 
-- -- Remover índice de daily booking:
-- DROP INDEX IF EXISTS idx_unique_daily_booking;
-- 
-- -- Remover coluna gerada:
-- ALTER TABLE appointments DROP COLUMN IF EXISTS booking_date;
-- 
-- -- Remover constraints CHECK:
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_client_first_name_length;
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_client_last_name_length;
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_client_phone_format;
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_notes_length;
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS check_end_after_start;
-- 
-- -- Remover índices de performance:
-- DROP INDEX IF EXISTS idx_appointments_tenant_date;
-- DROP INDEX IF EXISTS idx_appointments_tenant_status;
-- DROP INDEX IF EXISTS idx_appointments_tenant_phone;
