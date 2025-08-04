/**
 * Script para limpar o rate limiting
 */

const { createClient } = require('@supabase/supabase-js');

async function clearRateLimit() {
  try {
    console.log('🔄 Limpando rate limiting...');
    
    const supabase = createClient(
      'https://wmmfqzykbsbmzuazaikp.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbWZxenlrYnNibXp1YXphaWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU1OTA3NiwiZXhwIjoyMDY5MTM1MDc2fQ._w-yLvDS0UOsubibQ6TLlU_vjVuu5PYcODC4_1XLDmU'
    );
    
    // Limpar rate limits por IP
    console.log('🧹 Limpando rate limits por IP...');
    const { error: ipError } = await supabase
      .from('rate_limits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (ipError && ipError.code !== 'PGRST116') {
      console.log('⚠️ Tabela rate_limits não existe ou está vazia:', ipError.message);
    } else {
      console.log('✅ Rate limits por IP limpos');
    }
    
    // Limpar rate limits por conta
    console.log('🧹 Limpando rate limits por conta...');
    const { error: accountError } = await supabase
      .from('account_rate_limits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (accountError && accountError.code !== 'PGRST116') {
      console.log('⚠️ Tabela account_rate_limits não existe ou está vazia:', accountError.message);
    } else {
      console.log('✅ Rate limits por conta limpos');
    }
    
    console.log('✅ Rate limiting limpo com sucesso!');
    console.log('🎯 Agora você pode testar o login normalmente');
    
  } catch (error) {
    console.error('💥 Erro ao limpar rate limiting:', error);
  }
}

clearRateLimit();