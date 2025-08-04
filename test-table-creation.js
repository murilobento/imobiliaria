const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTableCreation() {
  console.log('Testing table creation capabilities...')
  
  try {
    // Try to create a simple test table
    const { data, error } = await supabase.rpc('exec', {
      sql: 'CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT);'
    })
    
    if (error) {
      console.log('Cannot create tables with current permissions:', error.message)
      console.log('\nYou need to run the SQL script in the Supabase dashboard:')
      console.log('1. Go to your Supabase project dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Run the contents of create-missing-tables.sql')
      console.log('\nAlternatively, you can copy and paste this SQL:')
      console.log('---')
      
      const fs = require('fs')
      const sql = fs.readFileSync('create-missing-tables.sql', 'utf8')
      console.log(sql)
      console.log('---')
    } else {
      console.log('✓ Table creation successful')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
    console.log('\nPlease run the SQL script manually in Supabase dashboard.')
  }
}

testTableCreation()