import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

async function testApiImovel() {
  console.log('Testando API de imóveis...')
  
  try {
    // Usar o ID correto do imóvel
    const response = await fetch('http://localhost:3000/api/imoveis/b3fe7ab2-673a-4d45-8b21-71101ba0dcd8')
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Erro na API:', error)
      return
    }
    
    const imovel = await response.json()
    console.log('Imóvel encontrado:', imovel)
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error)
  }
}

testApiImovel()