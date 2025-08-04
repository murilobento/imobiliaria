/**
 * Script para verificar as tabelas e colunas existentes
 */

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('🔍 Verificando estrutura das tabelas...');

  try {
    // Tentar consultar a tabela imoveis
    console.log('\n📋 Verificando tabela imoveis...');
    const { data: imoveisData, error: imoveisError } = await supabase
      .from('imoveis')
      .select('*')
      .limit(1);

    if (imoveisError) {
      console.log('❌ Erro na tabela imoveis:', imoveisError.message);
    } else {
      console.log('✅ Tabela imoveis encontrada');
      if (imoveisData && imoveisData.length > 0) {
        console.log('📊 Colunas encontradas:', Object.keys(imoveisData[0]));
        const hasUserId = Object.keys(imoveisData[0]).includes('user_id');
        console.log(`${hasUserId ? '✅' : '❌'} Coluna user_id: ${hasUserId ? 'EXISTE' : 'NÃO EXISTE'}`);
      } else {
        console.log('ℹ️  Tabela vazia, não é possível verificar colunas');
      }
    }

    // Tentar consultar a tabela clientes
    console.log('\n📋 Verificando tabela clientes...');
    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select('*')
      .limit(1);

    if (clientesError) {
      console.log('❌ Erro na tabela clientes:', clientesError.message);
    } else {
      console.log('✅ Tabela clientes encontrada');
      if (clientesData && clientesData.length > 0) {
        console.log('📊 Colunas encontradas:', Object.keys(clientesData[0]));
        const hasUserId = Object.keys(clientesData[0]).includes('user_id');
        console.log(`${hasUserId ? '✅' : '❌'} Coluna user_id: ${hasUserId ? 'EXISTE' : 'NÃO EXISTE'}`);
      } else {
        console.log('ℹ️  Tabela vazia, não é possível verificar colunas');
      }
    }

    console.log('\n🔧 INSTRUÇÕES PARA CRIAR AS COLUNAS:');
    console.log('1. Acesse o painel do Supabase: https://supabase.com/dashboard');
    console.log('2. Vá para SQL Editor');
    console.log('3. Execute o seguinte SQL:');
    console.log('\n-- Adicionar colunas user_id');
    console.log('ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);');
    console.log('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);');
    console.log('\n-- Criar índices');
    console.log('CREATE INDEX IF NOT EXISTS idx_imoveis_user_id ON imoveis(user_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);');
    console.log('\n4. Após executar o SQL, reinicie o servidor de desenvolvimento');

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

checkTables();