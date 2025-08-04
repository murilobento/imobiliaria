const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCidades() {
  try {
    console.log('🏙️ Verificando cidades disponíveis...');
    
    const { data: cidades, error } = await supabase
      .from('cidades')
      .select('*');
    
    if (error) {
      console.error('❌ Erro ao buscar cidades:', error);
      return;
    }
    
    console.log('✅ Cidades encontradas:');
    cidades.forEach(cidade => {
      console.log(`   - ${cidade.nome} (ID: ${cidade.id})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkCidades(); 