require('dotenv').config({ path: '.env.local' });

async function resetAdminPassword() {
  console.log('🔄 Resetando senha do admin via Supabase...\n');

  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('1. Buscando usuário admin...');
    
    // Find admin user
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }

    const adminUser = users.users.find(user => user.email === 'admin@imobiliaria.com');
    
    if (!adminUser) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }

    console.log('✅ Usuário admin encontrado:', adminUser.email);
    console.log('- ID:', adminUser.id);

    console.log('\n2. Resetando senha...');
    
    // Reset password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id,
      { 
        password: 'admin123',
        email_confirm: true
      }
    );

    if (error) {
      console.error('❌ Erro ao resetar senha:', error);
      return;
    }

    console.log('✅ Senha resetada com sucesso!');
    console.log('- Nova senha: admin123');
    console.log('- Email:', data.user.email);

    console.log('\n3. Testando login...');
    
    // Test login with new password
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'admin@imobiliaria.com',
      password: 'admin123'
    });

    if (loginError) {
      console.error('❌ Erro no teste de login:', loginError);
      return;
    }

    console.log('✅ Login testado com sucesso!');
    console.log('- Usuário:', loginData.user.email);
    console.log('- Role:', loginData.user.user_metadata?.role);

    // Logout after test
    await supabaseClient.auth.signOut();

    console.log('\n🎉 SUCESSO!');
    console.log('Credenciais do admin resetadas:');
    console.log('- Email: admin@imobiliaria.com');
    console.log('- Senha: admin123');
    console.log('\nAgora você pode fazer login no sistema!');

  } catch (error) {
    console.error('❌ Erro durante o reset:', error.message);
  }
}

resetAdminPassword();