/**
 * Script para testar as mensagens de erro do login
 */

const testLoginErrors = async () => {
  try {
    console.log('🔍 Testando mensagens de erro do login...');
    
    // Teste 1: Usuário inexistente
    console.log('\n1️⃣ Testando usuário inexistente...');
    const response1 = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'usuario_inexistente',
        password: 'qualquer_senha'
      }),
    });

    console.log('📥 Status:', response1.status);
    const result1 = await response1.json();
    console.log('📥 Resposta:', JSON.stringify(result1, null, 2));

    // Teste 2: Senha incorreta
    console.log('\n2️⃣ Testando senha incorreta...');
    const response2 = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'senha_errada'
      }),
    });

    console.log('📥 Status:', response2.status);
    const result2 = await response2.json();
    console.log('📥 Resposta:', JSON.stringify(result2, null, 2));

    // Teste 3: Campos vazios
    console.log('\n3️⃣ Testando campos vazios...');
    const response3 = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: '',
        password: ''
      }),
    });

    console.log('📥 Status:', response3.status);
    const result3 = await response3.json();
    console.log('📥 Resposta:', JSON.stringify(result3, null, 2));

    // Teste 4: Login correto (para comparação)
    console.log('\n4️⃣ Testando login correto...');
    const response4 = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });

    console.log('📥 Status:', response4.status);
    const result4 = await response4.json();
    console.log('📥 Resposta:', JSON.stringify(result4, null, 2));

  } catch (error) {
    console.error('💥 Erro:', error);
  }
};

// Executar o teste
testLoginErrors();