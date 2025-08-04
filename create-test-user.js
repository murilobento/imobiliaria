const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    console.log('🔍 Creating test user: corretor@teste.com');
    
    // Create user with real-estate-agent role
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'corretor@teste.com',
      password: '123456',
      email_confirm: true,
      user_metadata: {
        role: 'real-estate-agent'
      }
    });
    
    if (error) {
      console.error('❌ Error creating user:', error);
      return;
    }
    
    console.log('✅ Test user created successfully!');
    console.log('User details:', {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role,
      created_at: data.user.created_at
    });
    
    console.log('\n📋 Login credentials:');
    console.log('Email: corretor@teste.com');
    console.log('Password: 123456');
    console.log('Role: real-estate-agent (Corretor de Imóveis)');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser();