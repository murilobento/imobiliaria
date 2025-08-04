#!/usr/bin/env node

/**
 * Script para criar as tabelas de autenticação necessárias
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAuthTables() {
  console.log('🔧 Criando tabelas de autenticação...\n');

  try {
    // 1. Criar tabela auth_users
    console.log('1. Criando tabela auth_users...');
    const { error: authUsersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.auth_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'real-estate-agent',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_login TIMESTAMP WITH TIME ZONE,
          created_by UUID,
          failed_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP WITH TIME ZONE
        );
      `
    });

    if (authUsersError) {
      console.error('❌ Erro ao criar tabela auth_users:', authUsersError);
    } else {
      console.log('✅ Tabela auth_users criada com sucesso');
    }

    // 2. Criar tabela auth_sessions
    console.log('2. Criando tabela auth_sessions...');
    const { error: authSessionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.auth_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
          token_jti VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ip_address INET,
          user_agent TEXT
        );
      `
    });

    if (authSessionsError) {
      console.error('❌ Erro ao criar tabela auth_sessions:', authSessionsError);
    } else {
      console.log('✅ Tabela auth_sessions criada com sucesso');
    }

    // 3. Criar índices
    console.log('3. Criando índices...');
    const { error: indexesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_auth_users_username ON public.auth_users(username);
        CREATE INDEX IF NOT EXISTS idx_auth_users_email ON public.auth_users(email);
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON public.auth_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_jti ON public.auth_sessions(token_jti);
        CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON public.auth_sessions(expires_at);
      `
    });

    if (indexesError) {
      console.error('❌ Erro ao criar índices:', indexesError);
    } else {
      console.log('✅ Índices criados com sucesso');
    }

    // 4. Criar função para limpeza de sessões expiradas
    console.log('4. Criando função de limpeza...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM public.auth_sessions 
          WHERE expires_at < NOW();
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (functionError) {
      console.error('❌ Erro ao criar função de limpeza:', functionError);
    } else {
      console.log('✅ Função de limpeza criada com sucesso');
    }

    // 5. Criar usuário admin padrão
    console.log('5. Criando usuário admin padrão...');
    const bcrypt = require('bcryptjs');
    const adminPasswordHash = await bcrypt.hash('admin123', 12);

    const { error: adminError } = await supabase
      .from('auth_users')
      .upsert({
        username: 'admin',
        email: 'admin@imobiliaria.com',
        password_hash: adminPasswordHash,
        role: 'admin',
        is_active: true
      }, {
        onConflict: 'username'
      });

    if (adminError) {
      console.error('❌ Erro ao criar usuário admin:', adminError);
    } else {
      console.log('✅ Usuário admin criado com sucesso');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Email: admin@imobiliaria.com');
    }

    console.log('\n🎉 Tabelas de autenticação criadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createAuthTables();
}

module.exports = { createAuthTables };