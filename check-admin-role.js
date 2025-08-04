const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAdminRole() {
  try {
    console.log('🔍 Checking admin@imobiliaria.com role...');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error listing users:', error);
      return;
    }
    
    const adminUser = users.users.find(u => u.email === 'admin@imobiliaria.com');
    
    if (!adminUser) {
      console.error('❌ User admin@imobiliaria.com not found');
      return;
    }
    
    console.log('✅ User found:');
    console.log('📧 Email:', adminUser.email);
    console.log('🆔 ID:', adminUser.id);
    console.log('📊 User Metadata:', JSON.stringify(adminUser.user_metadata, null, 2));
    console.log('🎭 Role:', adminUser.user_metadata?.role || 'NO ROLE SET');
    console.log('📅 Created:', adminUser.created_at);
    console.log('🔐 Last Sign In:', adminUser.last_sign_in_at);
    
    // If role is not set, set it now
    if (!adminUser.user_metadata?.role || adminUser.user_metadata.role !== 'admin') {
      console.log('\n🔧 Role not set correctly, updating...');
      
      const { data, error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
        user_metadata: {
          role: 'admin'
        }
      });
      
      if (updateError) {
        console.error('❌ Error updating role:', updateError);
      } else {
        console.log('✅ Role updated to admin successfully!');
        console.log('📊 New metadata:', JSON.stringify(data.user.user_metadata, null, 2));
      }
    } else {
      console.log('✅ Role is correctly set to admin');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAdminRole();