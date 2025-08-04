#!/usr/bin/env node

/**
 * Script para migrar usuários do sistema antigo para Supabase Auth
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Dados dos usuários antigos (você pode ajustar conforme necessário)
const OLD_USERS = [
  {
    username: 'murilo',
    email: 'murilo@imobiliaria.com',
    role: 'admin',
    password: 'admin123' // Senha padrão - deve ser alterada após migração
  },
  {
    username: 'admin',
    email: 'admin2@imobiliaria.com', // Email diferente para evitar conflito
    role: 'admin',
    password: 'admin123' // Senha padrão - deve ser alterada após migração
  }
];

async function migrateUsersToSupabase() {
  try {
    console.log('🔄 Iniciando migração de usuários para Supabase Auth...');

    // Criar cliente Supabase com service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verificar se já existe o usuário admin@imobiliaria.com
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Erro ao listar usuários: ${listError.message}`);
    }

    console.log(`📊 Usuários existentes no Supabase: ${existingUsers.users.length}`);

    for (const oldUser of OLD_USERS) {
      console.log(`\n👤 Processando usuário: ${oldUser.username} (${oldUser.email})`);

      // Verificar se o usuário já existe
      const existingUser = existingUsers.users.find(u => u.email === oldUser.email);
      
      if (existingUser) {
        console.log(`⚠️  Usuário ${oldUser.email} já existe no Supabase. Pulando...`);
        continue;
      }

      // Criar usuário no Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: oldUser.email,
        password: oldUser.password,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          role: oldUser.role,
          name: oldUser.username,
          migrated_from: 'old_system',
          migrated_at: new Date().toISOString()
        }
      });

      if (error) {
        console.error(`❌ Erro ao criar usuário ${oldUser.email}:`, error.message);
        continue;
      }

      console.log(`✅ Usuário ${oldUser.email} criado com sucesso!`);
      console.log(`   ID: ${data.user.id}`);
      console.log(`   Role: ${oldUser.role}`);
    }

    console.log('\n🎉 Migração concluída!');
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Todos os usuários foram criados com a senha padrão "admin123"');
    console.log('   - Recomende que alterem as senhas no primeiro login');
    console.log('   - Verifique se os roles estão corretos');

  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
}

// Executar migração
migrateUsersToSupabase();