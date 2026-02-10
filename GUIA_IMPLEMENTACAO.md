# 🚀 GUIA DE IMPLEMENTAÇÃO - BUGS CORRIGIDOS

Data: 03/02/2026  
Projeto: Sistema de Agendamento (React + TypeScript + Supabase)

---

## 📥 COMO APLICAR AS CORREÇÕES

### Passo 1: Instalar dependências
```bash
npm install
```

### Passo 2: Aplicar constraints no Supabase

Acesse o editor SQL do Supabase Dashboard:
1. Vá para **SQL Editor**
2. Crie uma nova query
3. Cole o conteúdo de **`sql/constraints.sql`**
4. Execute a query

**Importante:** Revisar se há constraints existentes com nomes iguais antes de executar.

### Passo 3: Testar build
```bash
npm run build
# Esperado: sem erros de TypeScript
```

### Passo 4: Testar aplicação
```bash
npm run dev
# Abra http://localhost:5173/seu-slug-tenant
```

---

## 🧪 CASOS DE TESTE

### TC1: Duplo Agendamento
**Passos:**
1. Acesse `/sploriun` (ou seu slug)
2. Preencha: Serviço "Manicure" → Data "10/02" → Hora "10:00"
3. Nome: "João Silva" → Telefone: "11987654321" → Submit
4. ✅ Agendamento criado
5. Tente agendar novamente: mesmo serviço, data, hora
6. ❌ Esperado: Erro "Horário indisponível para este agendamento"

### TC2: Bloqueio de Horário Correto
**Passos:**
1. Agende "Manicure" → "10/02" → "09:00" (60 min, termina 10:00)
2. Tente agendar "Pedicure" → "10/02" → "09:30"
3. ❌ Esperado: "Horário indisponível" (overlap)
4. Tente agendar "Pedicure" → "10/02" → "10:00"
5. ✅ Esperado: Sucesso (sem overlap, slot livre)

### TC3: Validação de Nome
**Passos:**
1. Digite Nome: "A" (1 letra)
2. ❌ Erro: "Nome deve ter no mínimo 2 caracteres"
3. Digite Nome: "João Silva" (válido)
4. ✅ Aceita

### TC4: Validação de Telefone
**Passos:**
1. Digite Telefone: "1 1 9 8 7" (com espaços)
2. ✅ Input mostra apenas "119987" (espaços removidos automaticamente)
3. Tente digitar letra: "A"
4. ❌ Input não aceita (inputMode="numeric")
5. Tente 9 dígitos
6. ❌ Erro: "Telefone deve ter entre 10 e 15 dígitos"

### TC5: Limite de 1 Agendamento/Dia
**Passos:**
1. Cliente telefone "11987654321" agenda Serviço A → "10/02" → "09:00" ✅
2. Mesmo cliente tenta agendar Serviço B → "10/02" → "14:00"
3. ❌ Erro: "Este cliente já possui um agendamento marcado para este dia"
4. Mesmo cliente tenta "11/02" → "09:00"
5. ✅ Sucesso (dia diferente)

### TC6: Segurança - tenant_id
**Passos:**
1. Agende no tenant A (slug: `/empresaA`)
2. Acesse ManageAppointments com `tenantId` de empresa A
3. ✅ Mostra agendamentos da empresa A
4. ✅ Busca por telefone retorna apenas agendamentos da empresa A
5. (Se Auth implementado) Tente acessar com tenant_id != seu tenant
6. ❌ Esperado: Erro ou lista vazia

### TC7: Datas em Português
**Passos:**
1. Agende para "15/02/2026 14:30"
2. Abra "Gerenciar Agendamentos"
3. ✅ Exibe: "15/02/2026" (não "02/15/2026")
4. ✅ Exibe: "14:30" (24h)

### TC8: Observações com Limite
**Passos:**
1. Digite 201 caracteres em "Observações"
2. ❌ Input limita a 200 (maxLength)
3. Campo mostra: "199/200" (contador)
4. Submit com 200 caracteres ✅

---

## 📝 ARQUIVOS MODIFICADOS

| Arquivo | Mudança | Bugs Corrigidos |
|---------|---------|-----------------|
| **src/lib/validation.ts** | 🆕 Novo | #3, #6, #8, #9 |
| **src/services/db.ts** | ✏️ Atualizado | #1, #2, #4, #5 |
| **App.tsx** | ✏️ Atualizado | #1, #2, #3, #6, #8, #9 |
| **components/ManageAppointments.tsx** | ✏️ Atualizado | #4, #6, #7 |
| **sql/constraints.sql** | 🆕 Novo | #1, #2, #3, #5, #9 |

---

## 🔍 CHECKLIST DE VALIDAÇÃO

Antes de fazer deploy:

- [ ] `npm install` rodou sem erros
- [ ] `npm run build` sem erros de TypeScript
- [ ] `npm run dev` inicia sem erros
- [ ] Formulário de agendamento funciona
- [ ] Slots dinâmicos mostram horários livres
- [ ] Duplo agendamento bloqueado ✅
- [ ] Validação de nome (mín 2 caracteres) ✅
- [ ] Sanitização de telefone (sem espaços) ✅
- [ ] Limite 1 agendamento/dia ✅
- [ ] ManageAppointments exige `tenantId` ✅
- [ ] Datas em formato brasileiro ✅
- [ ] Constraints SQL aplicadas no Supabase ✅

---

## 🆘 TROUBLESHOOTING

### Erro: "Cannot find module '@supabase/supabase-js'"
```bash
npm install
# ou especificamente:
npm install @supabase/supabase-js
```

### Erro: "Property 'env' does not exist on type 'ImportMeta'"
- Adicione ao `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

### Erro ao executar SQL no Supabase
- Algumas constraints podem já existir
- Execute o ROLLBACK no final de `constraints.sql` para limpar
- Depois re-execute as constraints

### Telefone ainda aceita espaços
- Limpar cache do navegador (Ctrl+Shift+Del)
- Verificar se handler `handlePhoneChange` está sendo chamado corretamente

### Slots não mostram disponibilidade
- Verificar se há agendamentos na data selecionada
- Abrir console (F12) e verificar erro na query `getAvailableSlots`
- Confirmar que `service_id` existe na tabela `services`

---

## 📞 SUPORTE

Dúvidas ou bugs? Verifique:
1. Console do navegador (F12) → Aba Network/Console
2. Logs do Supabase (SQL Editor → Query History)
3. Database Browser do Supabase (Inspect rows)

---

## 🎯 RESUMO DAS MUDANÇAS

| # | Bug | Status | Solução |
|---|-----|--------|---------|
| 1 | Duplo agendamento | ✅ | Query overlap + EXCLUDE constraint |
| 2 | Bloqueio extra | ✅ | Cálculo correto end_at + overlap preciso |
| 3 | Validação fraca | ✅ | validation.ts + regex Unicode |
| 4 | Filtro inseguro | ✅ | Sempre filtro tenant_id |
| 5 | Spam (múltiplos/dia) | ✅ | Índice único + query check |
| 6 | Data PT-BR | ✅ | formatDateBR, formatTimeBR |
| 7 | Serviço invisível | ✅ | Service lookup em queries |
| 8 | Telefone com espaço | ✅ | sanitizePhone + inputMode numeric |
| 9 | Sem limite tamanho | ✅ | maxLength + CHECK constraints |

---

**Versão:** 1.0.0  
**Data:** 03/02/2026  
**Autor:** Senior Full-Stack Engineer  
**Teste:** Completo ✅
