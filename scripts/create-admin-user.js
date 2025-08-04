#!/usr/bin/env node

/**
 * Script para criar usuário admin no Supabase Auth
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function createAdminUser() {
  try {
    console.log('🔐 Criando usuário admin no Supabase Auth...');

    // Usar service role key para criar usuário
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Dados do admin
    const adminEmail = 'admin@imobiliaria.com';
    const adminPassword = 'admin123';

    // Criar usuário admin
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        role: 'admin',
        name: 'Administrador'
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Usuário admin já existe!');
        console.log('📧 Email: admin@imobiliaria.com');
        console.log('🔑 Senha: admin123');
        return;
      }
      throw error;
    }

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Senha:', adminPassword);
    console.log('🆔 ID:', data.user.id);
    console.log('');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    process.exit(1);
  }
}

createAdminUser();