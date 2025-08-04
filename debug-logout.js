require('dotenv').config({ path: '.env.local' });

async function debugLogout() {
  console.log('🔍 Diagnosticando problema do logout...\n');

  try {
    console.log('1. Verificando configuração do Supabase...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Variáveis de ambiente do Supabase não encontradas');
      return;
    }
    
    console.log('✅ Variáveis de ambiente configuradas');
    console.log(`- URL: ${supabaseUrl.substring(0, 30)}...`);
    console.log(`- Key: ${supabaseKey.substring(0, 30)}...`);

    console.log('\n2. Testando logout via API direta...');
    
    // Primeiro, vamos fazer login
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Fazendo login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@imobiliaria.com',
      password: 'admin123'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      return;
    }
    
    console.log('✅ Login realizado com sucesso');
    console.log(`- Usuário: ${loginData.user?.email}`);
    console.log(`- Session: ${loginData.session ? 'Presente' : 'Ausente'}`);
    
    // Agora vamos testar o logout
    console.log('\nFazendo logout...');
    const { error: logoutError } = await supabase.auth.signOut();
    
    if (logoutError) {
      console.log('❌ Erro no logout:', logoutError.message);
    } else {
      console.log('✅ Logout realizado com sucesso via API');
    }
    
    // Verificar se ainda há sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Erro ao verificar sessão:', sessionError.message);
    } else {
      console.log(`- Sessão após logout: ${session ? 'AINDA PRESENTE ❌' : 'Removida ✅'}`);
    }

    console.log('\n3. Possíveis causas do problema:');
    console.log('');
    console.log('a) Cookies não sendo limpos no navegador');
    console.log('b) Múltiplas instâncias do cliente Supabase');
    console.log('c) Configuração de domínio/CORS');
    console.log('d) Cache do navegador');
    console.log('e) Configuração de cookies do Supabase');
    
    console.log('\n4. Soluções a implementar:');
    console.log('');
    console.log('✅ Implementar limpeza manual de cookies');
    console.log('✅ Forçar reload da página após logout');
    console.log('✅ Limpar localStorage/sessionStorage');
    console.log('✅ Usar signOut com escopo global');

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error.message);
  }
}

debugLogout();