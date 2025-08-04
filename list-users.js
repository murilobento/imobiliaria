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

async function listUsers() {
  try {
    console.log('🔍 Listing all users...');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error listing users:', error);
      return;
    }
    
    console.log(`✅ Found ${users.users.length} users:`);
    
    users.users.forEach((user, index) => {
      console.log(`\n${index + 1}. User:`, {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'no role set',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at
      });
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

listUsers();