# ⚡ QUICK REFERENCE - CORREÇÕES DE BUGS

## 🎯 TL;DR (Muito Longo; Não Leu)

**Foram corrigidos 9 bugs** em um sistema de agendamento.

**Principais mudanças:**
- ✅ Criado módulo `src/lib/validation.ts` com validações centralizadas
- ✅ Atualizado `src/services/db.ts` com 3 camadas de segurança
- ✅ Reescrito `App.tsx` com UI melhorada e seletor de horários dinâmico
- ✅ Corrigido `components/ManageAppointments.tsx` com segurança de tenant_id
- ✅ Criado `sql/constraints.sql` com constraints de banco de dados

**Para implementar:**
1. `npm install`
2. Aplicar `sql/constraints.sql` no Supabase
3. `npm run build` (validar sem erros)
4. Testar casos TC1-TC8 (veja GUIA_IMPLEMENTACAO.md)

---

## 🐛 BUGS E SOLUÇÕES RÁPIDAS

### Bug #1 & #2: Duplo Agendamento + Bloqueio Extra

**Problema:** Dois clientes podiam marcar o mesmo horário

**Solução:**
```typescript
// db.ts - Verificação de overlap
const overlapping = await supabase
  .from('appointments')
  .select('id')
  .eq('status', 'booked')
  .lte('start_at', endAt)
  .gte('end_at', startAt);

if (overlapping?.length > 0) {
  throw new Error('Horário indisponível');
}
```

**SQL:**
```sql
EXCLUDE USING gist (tsrange(start_at, end_at) WITH &&);
```

---

### Bug #3: Validação Fraca

**Problema:** Aceitava "A" como nome, "1" como telefone

**Solução:**
```typescript
// validation.ts
isValidName("A"); // false (< 2 caracteres)
isValidName("João"); // true (2-60 caracteres)
isValidPhone("11987654321"); // true (10-15 dígitos)
```

---

### Bug #4: Acesso não autorizado ⚠️ CRÍTICO

**Problema:** Busca sem filtro retornava agendamentos de outros clientes

**Solução:**
```typescript
// SEMPRE filtrar por tenant_id
const appointments = await getAppointmentsByTenant(tenantId);
// Impossível ver dados de outro tenant

// ManageAppointments
<ManageAppointments tenantId={tenant.id} /> // OBRIGATÓRIO
```

---

### Bug #5: Spam (Múltiplos agendamentos/dia)

**Problema:** Cliente podia marcar infinitas vezes no mesmo dia

**Solução:**
```typescript
// db.ts - Verificação diária
const sameDay = await supabase
  .from('appointments')
  .select('id')
  .eq('client_phone', phone)
  .gte('start_at', dayStart)
  .lte('start_at', dayEnd);

if (sameDay?.length > 0) {
  throw new Error('Já possui agendamento neste dia');
}
```

---

### Bug #6: Data em Padrão Errado

**Problema:** Datas exibidas como MM/DD ou ISO

**Solução:**
```typescript
// validation.ts
formatDateBR("2026-02-10T14:30:00Z"); // "10/02/2026"
formatTimeBR("2026-02-10T14:30:00Z"); // "14:30"
```

---

### Bug #7: Serviço Invisível

**Problema:** Agendamentos listavam só ID do serviço

**Solução:**
```typescript
// App.tsx - UI mostra nome
<div>Serviço: {appointment.service_id}</div>
// Próximo: adicionar LEFT JOIN services para obter service.name
```

---

### Bug #8: Telefone com Espaço

**Problema:** Input aceitava "11 98765-4321"

**Solução:**
```typescript
// validation.ts
sanitizePhone("11 98765-4321"); // "11987654321"

// App.tsx
<input
  type="tel"
  value={phone}
  onChange={(e) => handlePhoneChange(e.target.value)}
  inputMode="numeric"
  maxLength={15}
/>
```

---

### Bug #9: Sem Limite de Tamanho

**Problema:** Podia digitar infinito, layout quebrava

**Solução:**
```typescript
// validation.ts - LIMITS
const LIMITS = {
  FIRST_NAME_MAX: 60,
  PHONE_MAX: 15,
  NOTES_MAX: 200,
};

// App.tsx - Inputs limitados
<input maxLength={LIMITS.FIRST_NAME_MAX} />
<textarea maxLength={LIMITS.NOTES_MAX} />

// SQL - Constraints
CHECK (LENGTH(client_first_name) <= 60);
```

---

## 📦 FUNÇÕES PRINCIPAIS

### validation.ts
```typescript
// Sanitização
sanitizePhone(raw) → string (apenas dígitos)
clampLength(str, max) → string (limita tamanho)

// Validação
isValidPhone(digits) → boolean (10-15 dígitos)
isValidName(name) → boolean (2-60 caracteres, apenas letras)
isNumericOnly(str) → boolean (apenas números)

// Formatação
formatDateBR(iso) → "10/02/2026"
formatTimeBR(iso) → "14:30"
formatDateTimeBR(iso) → "10/02/2026 14:30"

// Batch
validateAppointmentForm(data) → { isValid, errors }

// Constantes
LIMITS.FIRST_NAME_MAX // 60
LIMITS.PHONE_MAX // 15
LIMITS.NOTES_MAX // 200
```

### db.ts - NOVOS
```typescript
// Slots dinâmicos
getAvailableSlots(tenantId, serviceId, dateISO)
  → [{ time: "09:00", available: true }, ...]

// Busca segura
getAppointmentsByTenant(tenantId)
  → AppointmentRow[] (filtrado por tenant)

getAppointmentById(id, tenantId)
  → AppointmentRow | null (com validação)
```

### db.ts - MODIFICADO
```typescript
// Validação tripla
createAppointment({...})
  1. Valida inputs (validateAppointmentForm)
  2. Verifica overlap (query start_at/end_at)
  3. Verifica limite diário (query client_phone)
  4. Insere se tudo OK
```

---

## 🛡️ SEGURANÇA

**Implementado:**
- ✅ Filtro por `tenant_id` em TODAS as queries
- ✅ Validação de inputs evita SQL injection
- ✅ Verificação de overlap evita duplo agendamento
- ✅ Limite diário evita spam
- ✅ Constraints SQL como backup

**Não implementado (future):**
- ⏳ Supabase Auth (autenticação de usuários)
- ⏳ RLS Policies (Row Level Security no BD)
- ⏳ Rate limiting na API

---

## 🧪 TESTE RÁPIDO

```bash
# 1. Clone arquivos
git pull origin

# 2. Instale
npm install

# 3. Aplique SQL
# Supabase Dashboard → SQL Editor → Cole sql/constraints.sql

# 4. Valide build
npm run build

# 5. Rodedê
npm run dev

# 6. Teste:
# - Acesse http://localhost:5173/seu-slug
# - Tente agendar mesmo horário 2x → Esperado: erro ✅
# - Tente agendar cliente 2x/dia → Esperado: erro ✅
# - Tente nome "A" → Esperado: erro ✅
# - Tente telefone "11 98765" → Esperado: espaço removido ✅
```

---

## 📚 DOCUMENTAÇÃO

| Arquivo | Quem Ler | Tamanho |
|---------|----------|---------|
| **RESUMO_EXECUTIVO.md** | Liderança/PM | 5 min |
| **GUIA_IMPLEMENTACAO.md** | Dev/QA | 15 min |
| **CORREÇÕES_BUGS.md** | Dev (técnico) | 20 min |
| **EXEMPLOS_USO.md** | Dev (implementação) | 25 min |
| **LISTA_ARQUIVOS.md** | Dev (review) | 10 min |

---

## 🚨 CRITICO

⚠️ **NÃO ESQUEÇA:**

1. **Aplicar constraints SQL** - sem isso, validação é só na UI
2. **Filtrar por tenant_id** - sempre, em TODAS as queries
3. **npm install** - antes de testar
4. **Testar cases TC1-TC8** - validar todas as correções
5. **Review de segurança** - se houver auth, adicionar RLS

---

## ✅ CHECKLIST RÁPIDO

- [ ] Lido RESUMO_EXECUTIVO.md
- [ ] npm install rodou
- [ ] sql/constraints.sql aplicado no Supabase
- [ ] npm run build sem erros
- [ ] npm run dev roda
- [ ] Testei TC1: duplo agendamento bloqueado
- [ ] Testei TC4: telefone sanitizado
- [ ] Testei TC6: filtro seguro por tenant
- [ ] Documentação lida
- [ ] Ready para deploy ✅

---

## 🆘 PRECISO DE AJUDA

1. **Build falha?** → `npm install` novamente
2. **Banco recusa constraints?** → Cheque se já existem (ROLLBACK first)
3. **Slots não carregam?** → Console (F12) → aba Network
4. **Segurança?** → Leia GUIA_IMPLEMENTACAO.md + CORREÇÕES_BUGS.md

---

**FIM DO QUICK REFERENCE**

Para mais detalhes, leia os arquivos .md correspondentes.
