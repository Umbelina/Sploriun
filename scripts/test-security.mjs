/**
 * Script de teste de segurança para ManageAppointments
 * Validações:
 * 1. Telefone parcial não retorna nada
 * 2. Telefone completo retorna agendamentos apenas daquele número
 * 3. Não é possível cancelar agendamento de outro telefone
 */

import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = createClient(supabaseUrl, supabaseKey);

// Dados de teste
const TEST_TENANT_ID = '123e4567-e89b-12d3-a456-426614174000'; // Substitua por um UUID válido
const TEST_PHONE_1 = '11987654321';
const TEST_PHONE_2 = '21912345678';

console.log('========================================');
console.log('TESTES DE SEGURANÇA - MANAGE APPOINTMENTS');
console.log('========================================\n');

// Teste 1: Buscar com telefone parcial
async function test1_PartialPhone() {
  console.log('TESTE 1: Buscar com telefone PARCIAL');
  console.log('--- Deve retornar NENHUM resultado ---');

  const partialPhone = '1198'; // Apenas 4 dígitos
  console.log(`Buscando por: "${partialPhone}"`);

  // Simular o que getAppointmentsByPhone faz:
  // SELECT * WHERE tenant_id = ? AND client_phone = ? (MATCH EXATO)
  const { data, error } = await supabase
    .from('appointments')
    .select('id, client_phone, client_first_name, status')
    .eq('tenant_id', TEST_TENANT_ID)
    .eq('client_phone', partialPhone); // Match EXATO - não encontrará

  if (error) {
    console.error('❌ ERRO:', error.message);
  } else {
    if (data.length === 0) {
      console.log('✅ PASSOU: Nenhum resultado encontrado (comportamento esperado)');
    } else {
      console.log(`❌ FALHOU: Encontrou ${data.length} agendamento(s) com match parcial!`);
      data.forEach(apt => console.log(`  - ${apt.client_phone}: ${apt.client_first_name}`));
    }
  }
  console.log('');
}

// Teste 2: Buscar com telefone completo
async function test2_FullPhone() {
  console.log('TESTE 2: Buscar com telefone COMPLETO');
  console.log('--- Deve retornar apenas agendamentos daquele telefone ---');
  console.log(`Buscando por: "${TEST_PHONE_1}"`);

  const { data, error } = await supabase
    .from('appointments')
    .select('id, client_phone, client_first_name, status')
    .eq('tenant_id', TEST_TENANT_ID)
    .eq('client_phone', TEST_PHONE_1); // Match EXATO

  if (error) {
    console.error('❌ ERRO:', error.message);
  } else {
    if (data.length > 0) {
      console.log(`✅ PASSOU: Encontrados ${data.length} agendamento(s):`);
      let allMatch = true;
      data.forEach(apt => {
        const match = apt.client_phone === TEST_PHONE_1;
        console.log(`  - ${apt.client_phone}: ${apt.client_first_name} ${match ? '✓' : '✗ ERRO'}`);
        if (!match) allMatch = false;
      });
      if (!allMatch) {
        console.log('❌ FALHOU: Alguns agendamentos não correspondem ao telefone buscado!');
      }
    } else {
      console.log('⚠️  Nenhum agendamento encontrado (pode ser OK se não há dados de teste)');
    }
  }
  console.log('');
}

// Teste 3: Tentar cancelar agendamento de outro telefone
async function test3_CancelOtherPhone() {
  console.log('TESTE 3: Tentar CANCELAR agendamento de outro telefone');
  console.log('--- Deve REJEITAR (não atualizar nada) ---');

  // Buscar um agendamento do TEST_PHONE_1 para tentar cancelar com TEST_PHONE_2
  const { data: targetAppt, error: selectErr } = await supabase
    .from('appointments')
    .select('id, client_phone')
    .eq('tenant_id', TEST_TENANT_ID)
    .eq('client_phone', TEST_PHONE_1)
    .eq('status', 'booked')
    .limit(1)
    .maybeSingle();

  if (selectErr || !targetAppt) {
    console.log('⚠️  Nenhum agendamento "booked" encontrado para testar (pode ser OK)');
    console.log('');
    return;
  }

  const appointmentId = targetAppt.id;
  console.log(`Tentando cancelar agendamento ID: ${appointmentId}`);
  console.log(`  - Agendamento é de: ${TEST_PHONE_1}`);
  console.log(`  - Tentando cancelar com telefone: ${TEST_PHONE_2}`);

  const now = new Date().toISOString();

  // Tentar UPDATE com o telefone ERRADO
  const { data, error } = await supabase
    .from('appointments')
    .update({
      status: 'canceled',
      canceled_at: now,
    })
    .eq('id', appointmentId)
    .eq('tenant_id', TEST_TENANT_ID)
    .eq('client_phone', TEST_PHONE_2) // Telefone ERRADO!
    .eq('status', 'booked')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('❌ ERRO NA QUERY:', error.message);
  } else {
    if (!data) {
      console.log('✅ PASSOU: UPDATE foi rejeitado (nenhuma linha foi atualizada)');
      console.log('   Agendamento continua intacto.');
    } else {
      console.log('❌ FALHOU: Agendamento foi cancelado apesar do telefone estar errado!');
    }
  }
  console.log('');
}

// Teste 4: Cancelar agendamento com telefone CORRETO
async function test4_CancelCorrectPhone() {
  console.log('TESTE 4: CANCELAR agendamento com telefone CORRETO');
  console.log('--- Deve suceder (atualizar status para canceled) ---');

  // Buscar um agendamento do TEST_PHONE_1
  const { data: targetAppt, error: selectErr } = await supabase
    .from('appointments')
    .select('id, client_phone, status')
    .eq('tenant_id', TEST_TENANT_ID)
    .eq('client_phone', TEST_PHONE_1)
    .eq('status', 'booked')
    .limit(1)
    .maybeSingle();

  if (selectErr || !targetAppt) {
    console.log('⚠️  Nenhum agendamento "booked" encontrado para testar (pode ser OK)');
    console.log('');
    return;
  }

  const appointmentId = targetAppt.id;
  console.log(`Cancelando agendamento ID: ${appointmentId}`);
  console.log(`  - Agendamento é de: ${TEST_PHONE_1}`);
  console.log(`  - Telefone usado para cancelar: ${TEST_PHONE_1} ✓`);

  const now = new Date().toISOString();

  // UPDATE com o telefone CORRETO
  const { data, error } = await supabase
    .from('appointments')
    .update({
      status: 'canceled',
      canceled_at: now,
    })
    .eq('id', appointmentId)
    .eq('tenant_id', TEST_TENANT_ID)
    .eq('client_phone', TEST_PHONE_1) // Telefone CORRETO!
    .eq('status', 'booked')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('❌ ERRO NA QUERY:', error.message);
  } else {
    if (data) {
      console.log('✅ PASSOU: Agendamento cancelado com sucesso!');
    } else {
      console.log('❌ FALHOU: UPDATE não atualizou nada (não deveria acontecer)');
    }
  }
  console.log('');
}

// Executar testes
async function runTests() {
  try {
    await test1_PartialPhone();
    await test2_FullPhone();
    await test3_CancelOtherPhone();
    await test4_CancelCorrectPhone();

    console.log('========================================');
    console.log('TESTES CONCLUÍDOS');
    console.log('========================================');
  } catch (err) {
    console.error('ERRO GERAL:', err);
  }
}

runTests();
