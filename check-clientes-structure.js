const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkClientesStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela clientes...');
    
    // Tentar buscar clientes existentes
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao buscar clientes:', error);
      return;
    }
    
    if (clientes && clientes.length > 0) {
      console.log('✅ Estrutura da tabela clientes:');
      console.log(JSON.stringify(clientes[0], null, 2));
    } else {
      console.log('ℹ️ Tabela clientes está vazia');
    }
    
    // Tentar inserir um cliente de teste para ver a estrutura
    const clienteTeste = {
      nome: 'Cliente Teste',
      email: 'teste@email.com',
      telefone: '(18) 99999-9999',
      cpf_cnpj: '123.456.789-00',
      endereco: 'Rua Teste, 123'
    };
    
    console.log('\n🧪 Testando inserção de cliente...');
    const { data: clienteInserido, error: errorInsert } = await supabase
      .from('clientes')
      .insert(clienteTeste)
      .select();
    
    if (errorInsert) {
      console.error('❌ Erro ao inserir cliente teste:', errorInsert);
    } else {
      console.log('✅ Cliente teste inserido com sucesso:');
      console.log(JSON.stringify(clienteInserido[0], null, 2));
      
      // Remover o cliente teste
      await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteInserido[0].id);
      
      console.log('🗑️ Cliente teste removido');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkClientesStructure(); 