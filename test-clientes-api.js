// Simple test script for clientes API
// Run with: node test-clientes-api.js

const BASE_URL = 'http://localhost:3000/api/clientes'

async function testAPI() {
  console.log('🧪 Testing Clientes API...\n')

  try {
    // Test 1: GET /api/clientes
    console.log('1. Testing GET /api/clientes')
    const listResponse = await fetch(BASE_URL)
    const listData = await listResponse.json()
    
    if (listResponse.ok) {
      console.log('✅ GET /api/clientes - Success')
      console.log(`   Found ${listData.total} clientes`)
      console.log(`   Page ${listData.page} of ${listData.totalPages}`)
    } else {
      console.log('❌ GET /api/clientes - Failed')
      console.log('   Error:', listData.error)
    }

    // Test 2: POST /api/clientes
    console.log('\n2. Testing POST /api/clientes')
    const newCliente = {
      nome: 'Teste Cliente',
      email: 'teste@email.com',
      telefone: '(11) 99999-0000',
      cpf_cnpj: '111.222.333-44',
      endereco: 'Rua de Teste, 123',
      observacoes: 'Cliente criado via teste'
    }

    const createResponse = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newCliente)
    })
    const createData = await createResponse.json()

    if (createResponse.ok) {
      console.log('✅ POST /api/clientes - Success')
      console.log(`   Created cliente with ID: ${createData.id}`)
      
      // Test 3: GET /api/clientes/[id]
      console.log('\n3. Testing GET /api/clientes/[id]')
      const getResponse = await fetch(`${BASE_URL}/${createData.id}`)
      const getData = await getResponse.json()
      
      if (getResponse.ok) {
        console.log('✅ GET /api/clientes/[id] - Success')
        console.log(`   Retrieved cliente: ${getData.nome}`)
      } else {
        console.log('❌ GET /api/clientes/[id] - Failed')
        console.log('   Error:', getData.error)
      }

      // Test 4: PUT /api/clientes/[id]
      console.log('\n4. Testing PUT /api/clientes/[id]')
      const updateData = {
        nome: 'Teste Cliente Atualizado',
        observacoes: 'Cliente atualizado via teste'
      }

      const updateResponse = await fetch(`${BASE_URL}/${createData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })
      const updatedData = await updateResponse.json()

      if (updateResponse.ok) {
        console.log('✅ PUT /api/clientes/[id] - Success')
        console.log(`   Updated cliente: ${updatedData.nome}`)
      } else {
        console.log('❌ PUT /api/clientes/[id] - Failed')
        console.log('   Error:', updatedData.error)
      }

      // Test 5: DELETE /api/clientes/[id]
      console.log('\n5. Testing DELETE /api/clientes/[id]')
      const deleteResponse = await fetch(`${BASE_URL}/${createData.id}`, {
        method: 'DELETE'
      })
      const deleteData = await deleteResponse.json()

      if (deleteResponse.ok) {
        console.log('✅ DELETE /api/clientes/[id] - Success')
        console.log('   Cliente deleted successfully')
      } else {
        console.log('❌ DELETE /api/clientes/[id] - Failed')
        console.log('   Error:', deleteData.error)
      }

    } else {
      console.log('❌ POST /api/clientes - Failed')
      console.log('   Error:', createData.error)
    }

    // Test 6: Search functionality
    console.log('\n6. Testing search functionality')
    const searchResponse = await fetch(`${BASE_URL}?search=João`)
    const searchData = await searchResponse.json()
    
    if (searchResponse.ok) {
      console.log('✅ Search functionality - Success')
      console.log(`   Found ${searchData.total} results for "João"`)
    } else {
      console.log('❌ Search functionality - Failed')
      console.log('   Error:', searchData.error)
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }

  console.log('\n🏁 Test completed!')
}

// Run the test
testAPI()