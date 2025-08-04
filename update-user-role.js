const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Required variables:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
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
        console.log('🔍 Searching for user: teste@teste.com');

        // Get user by email
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('❌ Error listing users:', listError);
            return;
        }

        const user = users.users.find(u => u.email === 'teste@teste.com');

        if (!user) {
            console.error('❌ User not found: teste@teste.com');
            return;
        }

        console.log('✅ User found:', {
            id: user.id,
            email: user.email,
            current_role: user.user_metadata?.role || 'user'
        });

        // Update user metadata to set admin role
        const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                role: 'admin'
            }
        });

        if (error) {
            console.error('❌ Error updating user role:', error);
            return;
        }

        console.log('✅ User role updated successfully!');
        console.log('New user data:', {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role
        });

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

updateUserRole();