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

async function setCorretorRole() {
  try {
    console.log('🔍 Setting corretor@teste.com as real-estate-agent...');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error listing users:', error);
      return;
    }
    
    const user = users.users.find(u => u.email === 'corretor@teste.com');
    
    if (!user) {
      console.error('❌ User corretor@teste.com not found');
      return;
    }
    
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        role: 'real-estate-agent'
      }
    });
    
    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }
    
    console.log('✅ User corretor@teste.com updated to real-estate-agent role');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setCorretorRole();