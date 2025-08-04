#!/usr/bin/env node

/**
 * Script para testar a nova API de perfil do usuário usando Supabase Auth
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

async function testProfileAPI() {
  console.log('🧪 Testando API de Perfil do Usuário com Supabase Auth...\n');

  try {
    // 1. Fazer login no Supabase
    console.log('1. Fazendo login no Supabase...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'corretor@teste.com',
      password: '123456'
    });

    if (authError) {
      throw new Error(`Login falhou: ${authError.message}`);
    }

    console.log('✅ Login realizado com sucesso');
    console.log('- Usuário ID:', authData.user?.id);
    console.log('- Email:', authData.user?.email);
    console.log('- Role:', authData.user?.user_metadata?.role);
    console.log('- Access Token:', authData.session?.access_token ? 'Presente' : 'Ausente');

    const accessToken = authData.session?.access_token;

    // 2. Testar GET do perfil atual
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
    } else {
      const profileData = await getProfileResponse.json();
      console.log('✅ Perfil obtido com sucesso:');
      console.log('- ID:', profileData.data?.id);
      console.log('- Username:', profileData.data?.username);
      console.log('- Email:', profileData.data?.email);
      console.log('- Nome completo:', profileData.data?.fullName || 'Não definido');
      console.log('- Role:', profileData.data?.role);
    }

    // 3. Testar PATCH para atualizar perfil
    console.log('\n3. Atualizando perfil...');
    const updateData = {
      fullName: 'João Silva Santos',
      username: 'joao.silva',
      email: 'corretor@teste.com' // Mantém o mesmo email
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
    } else {
      const updateResult = await updateResponse.json();
      console.log('✅ Perfil atualizado com sucesso:');
      console.log('- Mensagem:', updateResult.message);
      console.log('- Dados atualizados:', updateResult.data);
    }

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
    }

    // 5. Testar validação de dados inválidos
    console.log('\n5. Testando validação...');
    const invalidData = {
      fullName: 'A', // Muito curto
      username: 'ab', // Muito curto
      email: 'email-invalido' // Formato inválido
    };

    const validationResponse = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidData),
    });

    if (!validationResponse.ok) {
      const validationError = await validationResponse.json();
      console.log('✅ Validação funcionando corretamente:');
      console.log('- Erro esperado:', validationError.error);
    } else {
      console.log('❌ Validação não está funcionando como esperado');
    }

    // 6. Logout
    console.log('\n6. Fazendo logout...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado com sucesso');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar o teste
if (require.main === module) {
  testProfileAPI();
}

module.exports = { testProfileAPI };