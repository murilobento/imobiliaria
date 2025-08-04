/**
 * Script para testar o status de autenticação
 */

const testAuthStatus = async () => {
  try {
    console.log('🔍 Testando status de autenticação...');
    
    // Primeiro, vamos verificar se há um token válido
    const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Status da verificação:', verifyResponse.status);
    const verifyResult = await verifyResponse.json();
    console.log('📥 Resultado da verificação:', JSON.stringify(verifyResult, null, 2));

    if (verifyResponse.ok) {
      console.log('✅ Usuário está autenticado');
      
      // Agora vamos tentar alterar a senha
      console.log('\n🔄 Tentando alterar senha...');
      
      const testData = {
        currentPassword: 'admin123',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      const passwordResponse = await fetch('http://localhost:3000/api/user/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData),
      });

      console.log('📥 Status da alteração de senha:', passwordResponse.status);
      const passwordResult = await passwordResponse.json();
      console.log('📥 Resultado da alteração:', JSON.stringify(passwordResult, null, 2));

    } else {
      console.log('❌ Usuário não está autenticado');
      console.log('💡 Você precisa fazer login primeiro no navegador');
    }

  } catch (error) {
    console.error('💥 Erro:', error);
  }
};

// Executar o teste
testAuthStatus();