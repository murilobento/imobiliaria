const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wmmfqzykbsbmzuazaikp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbWZxenlrYnNibXp1YXphaWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU1OTA3NiwiZXhwIjoyMDY5MTM1MDc2fQ._w-yLvDS0UOsubibQ6TLlU_vjVuu5PYcODC4_1XLDmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Creating tables manually...');

    // Check if tables exist first
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['notificacoes', 'configuracoes_notificacao']);

    if (tablesError) {
      console.log('Could not check existing tables, proceeding with creation...');
    } else {
      const existingTables = tables.map(t => t.table_name);
      console.log('Existing tables:', existingTables);
    }

    // Try to insert a test record to see if tables exist
    console.log('Testing if notificacoes table exists...');
    const { error: testError } = await supabase
      .from('notificacoes')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('Tables do not exist or are not accessible:', testError.message);
      console.log('Please create the tables manually in Supabase dashboard using the SQL from supabase-migrations/012_create_notificacoes_tables.sql');
    } else {
      console.log('✓ Tables appear to exist and are accessible');
    }

    // Test configuration table
    console.log('Testing if configuracoes_notificacao table exists...');
    const { error: configTestError } = await supabase
      .from('configuracoes_notificacao')
      .select('id')
      .limit(1);

    if (configTestError) {
      console.log('Configuration table error:', configTestError.message);
    } else {
      console.log('✓ Configuration table appears to exist and is accessible');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

createTables();