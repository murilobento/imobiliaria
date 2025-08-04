const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTables() {
  console.log('Creating tables...')
  
  try {
    // Test if we can access the database
    console.log('Testing database connection...')
    const { data, error } = await supabase.from('cidades').select('count').limit(1)
    
    if (error) {
      console.log('Error accessing cidades table:', error.message)
      console.log('This might mean the tables need to be created in Supabase dashboard.')
    } else {
      console.log('✓ Database connection successful')
      console.log('✓ Cidades table exists')
    }

    // Test imoveis table
    const { data: imoveisData, error: imoveisError } = await supabase.from('imoveis').select('count').limit(1)
    
    if (imoveisError) {
      console.log('Error accessing imoveis table:', imoveisError.message)
      console.log('The imoveis table needs to be created.')
    } else {
      console.log('✓ Imoveis table exists')
    }

    // Test clientes table
    const { data: clientesData, error: clientesError } = await supabase.from('clientes').select('count').limit(1)
    
    if (clientesError) {
      console.log('Error accessing clientes table:', clientesError.message)
      console.log('The clientes table needs to be created.')
    } else {
      console.log('✓ Clientes table exists')
    }

    // Test imovel_imagens table
    const { data: imagensData, error: imagensError } = await supabase.from('imovel_imagens').select('count').limit(1)
    
    if (imagensError) {
      console.log('Error accessing imovel_imagens table:', imagensError.message)
      console.log('The imovel_imagens table needs to be created.')
    } else {
      console.log('✓ Imovel_imagens table exists')
    }

  } catch (error) {
    console.error('Error:', error.message)
  }
}

createTables()