/**
 * Script para criar as colunas user_id nas tabelas de imóveis e clientes
 * Execute com: node create-user-id-columns.js
 */

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (usando service key para operações admin)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  console.log('💡 Certifique-se de ter essas variáveis no seu arquivo .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_name', tableName)
    .eq('table_schema', 'public');
  
  return !error && data && data.length > 0;
}

async function checkColumnExists(tableName, columnName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', tableName)
    .eq('column_name', columnName)
    .eq('table_schema', 'public');
  
  return !error && data && data.length > 0;
}

async function createUserIdColumns() {
  console.log('🚀 Iniciando verificação e criação das colunas user_id...');

  try {
    // Verificar se as tabelas existem
    const imoveisExists = await checkTableExists('imoveis');
    const clientesExists = await checkTableExists('clientes');

    if (!imoveisExists) {
      console.error('❌ Tabela "imoveis" não encontrada');
      return;
    }

    if (!clientesExists) {
      console.error('❌ Tabela "clientes" não encontrada');
      return;
    }

    console.log('✅ Tabelas encontradas');

    // Verificar se as colunas já existem
    const imoveisUserIdExists = await checkColumnExists('imoveis', 'user_id');
    const clientesUserIdExists = await checkColumnExists('clientes', 'user_id');

    if (imoveisUserIdExists) {
      console.log('ℹ️  Coluna user_id já existe na tabela imoveis');
    } else {
      console.log('📝 Coluna user_id precisa ser criada na tabela imoveis');
    }

    if (clientesUserIdExists) {
      console.log('ℹ️  Coluna user_id já existe na tabela clientes');
    } else {
      console.log('📝 Coluna user_id precisa ser criada na tabela clientes');
    }

    // Se as colunas não existem, mostrar instruções para criar manualmente
    if (!imoveisUserIdExists || !clientesUserIdExists) {
      console.log('\n🔧 INSTRUÇÕES PARA CRIAR AS COLUNAS:');
      console.log('1. Acesse o painel do Supabase (https://supabase.com/dashboard)');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute o seguinte SQL:\n');
      
      if (!imoveisUserIdExists) {
        console.log('-- Adicionar coluna user_id à tabela imoveis');
        console.log('ALTER TABLE imoveis ADD COLUMN user_id UUID REFERENCES auth.users(id);');
        console.log('CREATE INDEX idx_imoveis_user_id ON imoveis(user_id);\n');
      }
      
      if (!clientesUserIdExists) {
        console.log('-- Adicionar coluna user_id à tabela clientes');
        console.log('ALTER TABLE clientes ADD COLUMN user_id UUID REFERENCES auth.users(id);');
        console.log('CREATE INDEX idx_clientes_user_id ON clientes(user_id);\n');
      }
      
      console.log('4. Após executar o SQL, reinicie o servidor de desenvolvimento');
    } else {
      console.log('✅ Todas as colunas já existem!');
    }

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    console.log('\n💡 SOLUÇÃO ALTERNATIVA:');
    console.log('Execute manualmente no SQL Editor do Supabase:');
    console.log('\nALTER TABLE imoveis ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);');
    console.log('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_imoveis_user_id ON imoveis(user_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);');
  }
}

// Executar o script
createUserIdColumns();