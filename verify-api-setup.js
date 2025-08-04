const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifySetup() {
  console.log('Verifying API setup...\n')
  
  const tables = ['cidades', 'clientes', 'imoveis', 'imovel_imagens']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1)
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: Table exists and accessible`)
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }
  
  console.log('\n📋 Setup Instructions:')
  console.log('If any tables are missing, please:')
  console.log('1. Go to your Supabase project dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Run the SQL script from create-missing-tables.sql')
  console.log('\n🚀 Once all tables exist, the API endpoints will work:')
  console.log('- GET /api/imoveis - List properties')
  console.log('- POST /api/imoveis - Create property')
  console.log('- GET /api/imoveis/[id] - Get specific property')
  console.log('- PUT /api/imoveis/[id] - Update property')
  console.log('- DELETE /api/imoveis/[id] - Delete property')
}

verifySetup()