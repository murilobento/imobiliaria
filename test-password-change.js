#!/usr/bin/env node

/**
 * Script para testar a alteração de senha
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

async function testPasswordChange() {
  console.log('🧪 Testando Alteração de Senha...\n');

  try {
    // 1. Fazer login
    console.log('1. Fazendo login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'corretor@teste.com',
      password: '123456'
    });

    if (authError) {
      throw new Error(`Login falhou: ${authError.message}`);
    }

    console.log('✅ Login realizado com sucesso');
    console.log('- Email:', authData.user?.email);

    const accessToken = authData.session?.access_token;

    // 2. Testar alteração de senha
    console.log('\n2. Alterando senha...');
    const passwordData = {
      currentPassword: '123456',
      newPassword: 'NovaSenh@123',
      confirmPassword: 'NovaSenh@123'
    };

    const changeResponse = await fetch(`${BASE_URL}/api/user/password`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(passwordData),
    });

    if (!changeResponse.ok) {
      const errorData = await changeResponse.json();
      console.log('❌ Erro ao alterar senha:', errorData);
      return;
    }

    const changeResult = await changeResponse.json();
    console.log('✅ Senha alterada com sucesso:');
    console.log('- Mensagem:', changeResult.message);

    // 3. Fazer logout
    console.log('\n3. Fazendo logout...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado');

    // 4. Testar login com nova senha
    console.log('\n4. Testando login com nova senha...');
    const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
      email: 'corretor@teste.com',
      password: 'NovaSenh@123'
    });

    if (newAuthError) {
      console.log('❌ Erro ao fazer login com nova senha:', newAuthError.message);
      return;
    }

    console.log('✅ Login com nova senha realizado com sucesso!');

    // 5. Reverter senha para o valor original
    console.log('\n5. Revertendo senha para valor original...');
    const revertData = {
      currentPassword: 'NovaSenh@123',
      newPassword: '123456',
      confirmPassword: '123456'
    };

    const revertResponse = await fetch(`${BASE_URL}/api/user/password`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${newAuthData.session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(revertData),
    });

    if (revertResponse.ok) {
      console.log('✅ Senha revertida para valor original');
    } else {
      console.log('⚠️  Não foi possível reverter a senha');
    }

    // 6. Logout final
    console.log('\n6. Fazendo logout final...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado com sucesso');

    console.log('\n🎉 Teste de alteração de senha concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar o teste
if (require.main === module) {
  testPasswordChange();
}

module.exports = { testPasswordChange };