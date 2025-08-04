#!/usr/bin/env node

/**
 * Script para testar o comportamento do F5 (recarregar página)
 * Simula: login -> atualizar perfil -> "recarregar página" -> verificar dados
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

// Configurar Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testF5Behavior() {
  console.log('🧪 Testando comportamento do F5 (recarregar página)...\n');

  try {
    // 1. Fazer login como admin
    console.log('1. Fazendo login como admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@imobiliaria.com',
      password: 'admin123'
    });

    if (authError) {
      throw new Error(`Login falhou: ${authError.message}`);
    }

    console.log('✅ Login realizado com sucesso');
    console.log('- Nome no token:', authData.user?.user_metadata?.name || 'Não definido');

    const accessToken = authData.session?.access_token;

    // 2. Obter perfil atual da API
    console.log('\n2. Obtendo perfil atual da API...');
    const getProfileResponse = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!getProfileResponse.ok) {
      const errorData = await getProfileResponse.json();
      console.log('❌ Erro ao obter perfil:', errorData);
      return;
    }

    const profileData = await getProfileResponse.json();
    console.log('✅ Perfil obtido da API:');
    console.log('- Nome completo:', profileData.data?.fullName || 'Não definido');

    // 3. Atualizar nome completo
    const newName = `Admin Teste ${Date.now()}`;
    console.log(`\n3. Atualizando nome completo para: "${newName}"...`);
    
    const updateData = {
      fullName: newName,
      username: profileData.data?.username,
      email: profileData.data?.email
    };

    const updateResponse = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.log('❌ Erro ao atualizar perfil:', errorData);
      return;
    }

    const updateResult = await updateResponse.json();
    console.log('✅ Perfil atualizado com sucesso');
    console.log('- Nome salvo no Supabase:', updateResult.data?.user_metadata?.name);

    // 4. SIMULAR F5: Fazer logout e login novamente (simula recarregar página)
    console.log('\n4. 🔄 SIMULANDO F5: Fazendo logout e login novamente...');
    
    await supabase.auth.signOut();
    console.log('- Logout realizado');

    // Login novamente (simula recarregar página)
    const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
      email: 'admin@imobiliaria.com',
      password: 'admin123'
    });

    if (newAuthError) {
      throw new Error(`Re-login falhou: ${newAuthError.message}`);
    }

    console.log('- Re-login realizado');
    console.log('- Nome no novo token:', newAuthData.user?.user_metadata?.name || 'Não definido');

    const newAccessToken = newAuthData.session?.access_token;

    // 5. Verificar se os dados persistiram após "F5"
    console.log('\n5. 🔍 Verificando dados após "F5"...');
    
    const verifyResponse = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${newAccessToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('✅ Dados após F5:');
      console.log('- Nome completo da API:', verifyData.data?.fullName);
      console.log('- Nome no token JWT:', newAuthData.user?.user_metadata?.name);
      
      if (verifyData.data?.fullName === newName) {
        console.log('\n🎉 SUCESSO: Nome completo persistiu após F5!');
        console.log('✅ A API retorna os dados corretos mesmo após recarregar');
      } else {
        console.log('\n❌ PROBLEMA: Nome completo não persistiu após F5');
        console.log(`- Esperado: "${newName}"`);
        console.log(`- Obtido: "${verifyData.data?.fullName}"`);
      }

      // Verificar se há diferença entre token e API
      if (newAuthData.user?.user_metadata?.name !== verifyData.data?.fullName) {
        console.log('\n⚠️  OBSERVAÇÃO: Há diferença entre token JWT e API');
        console.log('- Token JWT:', newAuthData.user?.user_metadata?.name);
        console.log('- API:', verifyData.data?.fullName);
        console.log('- Isso é normal, a página deve usar a API para dados atualizados');
      }
    }

    // 6. Logout final
    console.log('\n6. Fazendo logout final...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado com sucesso');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar o teste
if (require.main === module) {
  testF5Behavior();
}

module.exports = { testF5Behavior };