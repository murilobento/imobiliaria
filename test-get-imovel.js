import { getImovelById } from './src/lib/api/imoveis.ts'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

async function testGetImovel() {
  console.log('Testando função getImovelById...')
  
  try {
    // Usar o ID correto do imóvel
    const imovel = await getImovelById('b3fe7ab2-673a-4d45-8b21-71101ba0dcd8')
    console.log('Imóvel encontrado:', imovel)
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error)
  }
}

testGetImovel()