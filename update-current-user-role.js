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

async function updateUserRole() {
  try {
    console.log('🔍 Updating roles for existing users...');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error listing users:', error);
      return;
    }
    
    for (const user of users.users) {
      console.log(`\n🔄 Updating user: ${user.email}`);
      
      // Set admin role for existing users (you can change this logic)
      const roleToSet = user.email.includes('admin') || user.email.includes('murilo') ? 'admin' : 'admin';
      
      const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          role: roleToSet
        }
      });
      
      if (updateError) {
        console.error(`❌ Error updating ${user.email}:`, updateError);
      } else {
        console.log(`✅ Updated ${user.email} to role: ${roleToSet}`);
      }
    }
    
    console.log('\n🎉 All users updated!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateUserRole();