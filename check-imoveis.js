import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente não configuradas corretamente')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkImoveis() {
  console.log('Verificando dados na tabela de imóveis...')
  
  // Verificar se a tabela existe e contar registros
  const { count, error: countError } = await supabase
    .from('imoveis')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.error('Erro ao contar imóveis:', countError)
    return
  }
  
  console.log(`Total de imóveis: ${count}`)
  
  // Buscar alguns registros
  const { data, error } = await supabase
    .from('imoveis')
    .select('*')
    .limit(5)
  
  if (error) {
    console.error('Erro ao buscar imóveis:', error)
    return
  }
  
  console.log('Imóveis encontrados:', data)
}

checkImoveis()