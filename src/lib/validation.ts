/**
 * Módulo centralizado de validação e formatação
 * Validações para: nomes, telefone, datas, limites de tamanho
 */

// ============================================================
// CONSTANTES DE LIMITE
// ============================================================
export const LIMITS = {
  FIRST_NAME_MIN: 2,
  FIRST_NAME_MAX: 60,
  LAST_NAME_MIN: 2,
  LAST_NAME_MAX: 60,
  PHONE_MIN: 10,
  PHONE_MAX: 15,
  NOTES_MAX: 200,
} as const;

// ============================================================
// FUNÇÕES DE SANITIZAÇÃO
// ============================================================

/**
 * Remove tudo que não é dígito do telefone
 */
export function sanitizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Limita string a um máximo de caracteres
 */
export function clampLength(str: string, max: number): string {
  return str.substring(0, max);
}

// ============================================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================================

/**
 * Valida se telefone tem entre 10 e 15 dígitos
 */
export function isValidPhone(digitsOnly: string): boolean {
  const digits = sanitizePhone(digitsOnly);
  return /^\d{10,15}$/.test(digits);
}

/**
 * Valida nome (mínimo 2 caracteres, apenas letras, espaços e acentos)
 * Aceita caracteres acentuados: á, é, í, ó, ú, ã, õ, ç, etc.
 */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < LIMITS.FIRST_NAME_MIN) return false;
  if (trimmed.length > LIMITS.FIRST_NAME_MAX) return false;
  // Apenas letras (including Unicode para acentos), espaços, hífens
  return /^[\p{L}\s\-]+$/u.test(trimmed);
}

/**
 * Valida se string contém apenas números
 */
export function isNumericOnly(str: string): boolean {
  return /^\d+$/.test(str);
}

// ============================================================
// FUNÇÕES DE FORMATAÇÃO DE DATA/HORA
// ============================================================

/**
 * Formata data ISO para padrão brasileiro dd/MM/yyyy
 * Ex: "2026-02-03T10:30:00Z" -> "03/02/2026"
 */
export function formatDateBR(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Formata data ISO para padrão brasileiro completo dd/MM/yyyy HH:mm
 * Ex: "2026-02-03T10:30:00Z" -> "03/02/2026 10:30"
 */
export function formatDateTimeBR(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Formata apenas hora HH:mm (24h)
 * Ex: "2026-02-03T10:30:00Z" -> "10:30"
 */
export function formatTimeBR(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

// ============================================================
// FUNÇÃO DE VALIDAÇÃO BATCH
// ============================================================

/**
 * Valida múltiplos campos de uma vez
 * Retorna { isValid: boolean, errors: Record<field, message> }
 */
export function validateAppointmentForm(data: {
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string | null;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validar primeiro nome
  if (!isValidName(data.firstName)) {
    errors.firstName = `Nome deve ter no mínimo ${LIMITS.FIRST_NAME_MIN} caracteres (apenas letras e acentos)`;
  }

  // Validar último nome
  if (!isValidName(data.lastName)) {
    errors.lastName = `Sobrenome deve ter no mínimo ${LIMITS.LAST_NAME_MIN} caracteres (apenas letras e acentos)`;
  }

  // Validar telefone
  const cleanPhone = sanitizePhone(data.phone);
  if (!isValidPhone(cleanPhone)) {
    errors.phone = `Telefone deve ter entre ${LIMITS.PHONE_MIN} e ${LIMITS.PHONE_MAX} dígitos`;
  }

  // Validar notes se preenchido
  if (data.notes && data.notes.length > LIMITS.NOTES_MAX) {
    errors.notes = `Observações não podem exceder ${LIMITS.NOTES_MAX} caracteres`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
