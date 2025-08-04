const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wmmfqzykbsbmzuazaikp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbWZxenlrYnNibXp1YXphaWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU1OTA3NiwiZXhwIjoyMDY5MTM1MDc2fQ._w-yLvDS0UOsubibQ6TLlU_vjVuu5PYcODC4_1XLDmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Creating notificacoes table...');
    
    // Create notificacoes table
    const { error: notificacoesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS notificacoes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('vencimento_proximo', 'pagamento_atrasado', 'contrato_vencendo', 'lembrete_cobranca')),
          titulo VARCHAR(200) NOT NULL,
          mensagem TEXT NOT NULL,
          prioridade VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
          status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'lida', 'cancelada')),
          data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
          data_envio TIMESTAMP,
          data_leitura TIMESTAMP,
          user_id UUID NOT NULL,
          contrato_id UUID,
          pagamento_id UUID,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (notificacoesError) {
      console.error('Error creating notificacoes table:', notificacoesError);
    } else {
      console.log('✓ notificacoes table created successfully');
    }

    console.log('Creating configuracoes_notificacao table...');
    
    // Create configuracoes_notificacao table
    const { error: configError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS configuracoes_notificacao (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE,
          dias_aviso_vencimento INTEGER NOT NULL DEFAULT 3 CHECK (dias_aviso_vencimento >= 0 AND dias_aviso_vencimento <= 30),
          notificar_vencimento_proximo BOOLEAN NOT NULL DEFAULT true,
          notificar_pagamento_atrasado BOOLEAN NOT NULL DEFAULT true,
          dias_lembrete_atraso INTEGER NOT NULL DEFAULT 7 CHECK (dias_lembrete_atraso >= 1 AND dias_lembrete_atraso <= 30),
          max_lembretes_atraso INTEGER NOT NULL DEFAULT 3 CHECK (max_lembretes_atraso >= 1 AND max_lembretes_atraso <= 10),
          dias_aviso_contrato_vencendo INTEGER NOT NULL DEFAULT 30 CHECK (dias_aviso_contrato_vencendo >= 0 AND dias_aviso_contrato_vencendo <= 90),
          notificar_contrato_vencendo BOOLEAN NOT NULL DEFAULT true,
          ativo BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });

    if (configError) {
      console.error('Error creating configuracoes_notificacao table:', configError);
    } else {
      console.log('✓ configuracoes_notificacao table created successfully');
    }

    console.log('Tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createTables();