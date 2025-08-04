/**
 * Script para resetar a senha do admin
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    console.log('🔄 Resetando senha do admin...');
    
    const supabase = createClient(
      'https://wmmfqzykbsbmzuazaikp.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbWZxenlrYnNibXp1YXphaWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU1OTA3NiwiZXhwIjoyMDY5MTM1MDc2fQ._w-yLvDS0UOsubibQ6TLlU_vjVuu5PYcODC4_1XLDmU'
    );
    
    // Nova senha simples para teste
    const newPassword = 'admin123';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔐 Atualizando senha para "admin123"...');
    console.log('🔍 Hash gerado:', passwordHash.substring(0, 20) + '...');
    
    const { data, error } = await supabase
      .from('auth_users')
      .update({ password_hash: passwordHash })
      .eq('username', 'admin')
      .select();
    
    if (error) {
      console.error('❌ Erro ao atualizar senha:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Senha do admin resetada com sucesso!');
      console.log('🔑 Username: admin');
      console.log('🔑 Password: admin123');
      console.log('⚠️  Lembre-se de alterar esta senha após o login!');
    } else {
      console.log('❌ Usuário admin não encontrado');
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

resetAdminPassword();