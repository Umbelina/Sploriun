# OwnerDashboard - Teste da Aba Disponibilidade

## Como Testar Localmente (MVP)

### 1. Pré-requisitos
- Supabase project configurado com env vars `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- SQL aplicado: `sql/auth_and_rls.sql` (cria `availability_rules`, `profiles`, etc.)
- Usuário com role='owner' e tenant_id preenchido em `profiles`

### 2. Acessar OwnerDashboard
1. Navegue para `/owner-login`
2. Faça login com email/senha de proprietário (role='owner')
3. Será redirecionado para `/owner-dashboard`
4. Você verá abas: **Disponibilidade**, Serviços, Agenda, Notificações

### 3. Testar Aba "Disponibilidade"

#### Criar Regra
1. Clique em "Disponibilidade" (primeira aba)
2. Preencha:
   - **Dia da Semana**: Segunda (ou outro dia)
   - **Início**: 09:00
   - **Término**: 12:00
   - **Duração do Slot**: 30 (minutos)
   - **Ativo**: ☑ (marcado)
3. Clique "Criar"
4. Sucesso: regra aparece na tabela abaixo

#### Editar Regra
1. Clique ✏️ na linha da regra
2. Formulário muda para "Editar Disponibilidade"
3. Modifique campos (ex: término para 13:00)
4. Clique "Atualizar"
5. Tabela reflete a mudança

#### Deletar Regra
1. Clique 🗑️ na linha da regra
2. Confirme na dialog
3. Regra é removida da tabela

#### Validações
- **Teste 1**: Deixar término ≤ início → mensagem "Horário de término deve ser posterior"
- **Teste 2**: Slot < 5 ou > 120 → mensagem "Duração deve estar entre 5 e 120"
- **Teste 3**: Inputs vazios → mensagem "Horários são obrigatórios"

### 4. Testar Preview de Slots

1. Scroll down na aba Disponibilidade
2. **Selecionar Data**: clique em input type="date", escolha uma data futura (ex: 2026-02-05 = próxima quinta)
3. **Selecionar Serviço**: dropdown com serviços cadastrados (ex: "Manicure (30min)")
4. **Renderização de Slots**:
   - ✅ **Verde (disponível)**: clicável visualmente (ex: 09:00, 09:30, 10:00, ...)
   - ❌ **Cinza (indisponível)**: sem overlap com agendamentos existentes
5. Se selecionar uma data sem disponibilidades ativas → "Selecione data e serviço para visualizar"

#### Teste de Overlap
- Se já existir appointment 09:15-09:45 no BD, slots 09:00 e 09:30 devem aparecer cinza
- Slot 10:00 em diante deve estar verde (sem overlap)

### 5. Verificar Timezone (America/Sao_Paulo)
- A data exibida no input date (YYYY-MM-DD) é tratada com offset -03:00 internamente
- Ao selecionar "2026-02-04", determina corretamente que é quarta-feira em São Paulo
- Usa `generateSlots(tenantId, '2026-02-04', { serviceId })` que respeita timezone via `Intl.DateTimeFormat`

### 6. Próximos Passos (Não Implementados Ainda)
- **Aba Serviços**: CRUD para services (name, duration_minutes, is_active)
- **Aba Agenda**: listar appointments do owner, reschedule, notas
- **Aba Notificações**: inbox de notificações para owner

## Estrutura de Arquivos
- `src/components/OwnerApp.tsx`: layout principal com abas
- `src/components/OwnerAvailability.tsx`: CRUD + preview de slots
- `src/services/db.ts`: funções CRUD (`createAvailabilityRule`, `listAvailabilityRules`, `updateAvailabilityRule`, `deleteAvailabilityRule`, `generateSlots`)
- `src/services/slotUtils.ts`: lógica pura de geração de slots (timezone-aware)
- `sql/auth_and_rls.sql`: definições de `availability_rules` e RLS

## Notas de Produção
- RLS policies garantem que owner vê apenas suas próprias rules (tenant_id = profile.tenant_id)
- `generateSlots` busca appointments booked do tenant e marca overlap corretamente
- Validações frontend repetidas no backend via Supabase RLS e constraints
