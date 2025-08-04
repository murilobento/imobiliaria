#!/usr/bin/env node

/**
 * Script para testar especificamente o perfil do admin
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

async function testAdminProfile() {
  console.log('🧪 Testando Perfil do Admin...\n');

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
    console.log('- Usuário ID:', authData.user?.id);
    console.log('- Email:', authData.user?.email);
    console.log('- Role:', authData.user?.user_metadata?.role);
    console.log('- Nome atual:', authData.user?.user_metadata?.name || 'Não definido');

    const accessToken = authData.session?.access_token;

    // 2. Obter perfil atual
    console.log('\n2. Obtendo perfil atual...');
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
    console.log('✅ Perfil obtido com sucesso:');
    console.log('- ID:', profileData.data?.id);
    console.log('- Username:', profileData.data?.username);
    console.log('- Email:', profileData.data?.email);
    console.log('- Nome completo:', profileData.data?.fullName || 'Não definido');
    console.log('- Role:', profileData.data?.role);

    // 3. Atualizar nome completo
    console.log('\n3. Atualizando nome completo...');
    const updateData = {
      fullName: 'Administrador do Sistema Imobiliário',
      username: profileData.data?.username, // Manter o mesmo
      email: profileData.data?.email // Manter o mesmo
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
    console.log('✅ Perfil atualizado com sucesso:');
    console.log('- Mensagem:', updateResult.message);
    console.log('- Nome completo atualizado:', updateResult.data?.user_metadata?.name);

    // 4. Verificar se as mudanças foram salvas
    console.log('\n4. Verificando mudanças...');
    const verifyResponse = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('✅ Verificação concluída:');
      console.log('- Nome completo atual:', verifyData.data?.fullName);
      console.log('- Username atual:', verifyData.data?.username);
      console.log('- Email atual:', verifyData.data?.email);
      console.log('- Role atual:', verifyData.data?.role);
      
      if (verifyData.data?.fullName === 'Administrador do Sistema Imobiliário') {
        console.log('🎉 SUCESSO: Nome completo foi salvo corretamente!');
      } else {
        console.log('❌ ERRO: Nome completo não foi salvo corretamente');
      }
    }

    // 5. Logout
    console.log('\n5. Fazendo logout...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado com sucesso');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar o teste
if (require.main === module) {
  testAdminProfile();
}

module.exports = { testAdminProfile };