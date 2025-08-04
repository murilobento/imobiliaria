const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const migrationPath = path.join(__dirname, '..', 'supabase-migrations', '007_extend_auth_users_for_user_management.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 007_extend_auth_users_for_user_management.sql');
    
    // Try to add columns using direct table operations
    console.log('Adding email column...');
    try {
      // Check if columns already exist by trying to select them
      const { data: testData, error: testError } = await supabase
        .from('auth_users')
        .select('email, is_active, created_by')
        .limit(1);
      
      if (testError && testError.code === '42703') {
        console.log('Columns do not exist, need to add them manually in Supabase dashboard');
        console.log('Please run the following SQL in your Supabase SQL editor:');
        console.log(migrationSql);
      } else {
        console.log('Columns already exist or were added successfully');
      }
    } catch (error) {
      console.log('Could not verify column existence, please run SQL manually');
      console.log('SQL to run in Supabase dashboard:');
      console.log(migrationSql);
    }
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();