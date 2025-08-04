/**
 * Debug específico da API de alteração de senha
 */

// Simular as funções necessárias
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function debugPasswordChange() {
  try {
    console.log('🔍 Debugando API de alteração de senha...');
    
    const supabase = createClient(
      'https://wmmfqzykbsbmzuazaikp.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbWZxenlrYnNibXp1YXphaWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU1OTA3NiwiZXhwIjoyMDY5MTM1MDc2fQ._w-yLvDS0UOsubibQ6TLlU_vjVuu5PYcODC4_1XLDmU'
    );
    
    // 1. Verificar se existe um usuário admin
    console.log('1️⃣ Verificando usuários existentes...');
    const { data: users, error: usersError } = await supabase
      .from('auth_users')
      .select('*');
    
    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }
    
    console.log('✅ Usuários encontrados:', users.length);
    if (users.length > 0) {
      console.log('Primeiro usuário:', {
        id: users[0].id,
        username: users[0].username,
        role: users[0].role
      });
      
      // 2. Testar verificação de senha
      console.log('\n2️⃣ Testando verificação de senha...');
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, users[0].password_hash);
      console.log('Senha "admin123" é válida?', isValid);
      
      if (isValid) {
        // 3. Testar hash de nova senha
        console.log('\n3️⃣ Testando hash de nova senha...');
        const newPassword = 'NewPassword123!';
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        console.log('Nova senha hasheada com sucesso');
        
        // 4. Testar atualização (sem executar)
        console.log('\n4️⃣ Simulando atualização de senha...');
        console.log('UPDATE auth_users SET password_hash = ? WHERE id = ?');
        console.log('Parâmetros:', [newPasswordHash.substring(0, 20) + '...', users[0].id]);
        console.log('✅ Simulação bem-sucedida');
      }
    } else {
      console.log('❌ Nenhum usuário encontrado');
    }
    
  } catch (error) {
    console.error('💥 Erro no debug:', error);
  }
}

debugPasswordChange();