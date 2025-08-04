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

async function createAdminUser() {
  try {
    console.log('🔍 Creating admin user: admin@imobiliaria.com');
    
    // Create user with admin role
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@imobiliaria.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        name: 'Administrador'
      }
    });
    
    if (error) {
      if (error.message.includes('already been registered')) {
        console.log('✅ Admin user already exists!');
        console.log('Email: admin@imobiliaria.com');
        console.log('Password: admin123');
        return;
      }
      console.error('❌ Error creating user:', error);
      return;
    }
    
    console.log('✅ Admin user created successfully!');
    console.log('User details:', {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role,
      name: data.user.user_metadata?.name,
      created_at: data.user.created_at
    });
    
    console.log('\n📋 Login credentials:');
    console.log('Email: admin@imobiliaria.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createAdminUser();