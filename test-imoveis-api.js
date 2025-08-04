const BASE_URL = 'http://localhost:3000';

async function testImoveisAPI() {
  console.log('Testing Imoveis API...\n');

  try {
    // Test GET /api/imoveis
    console.log('1. Testing GET /api/imoveis');
    const response = await fetch(`${BASE_URL}/api/imoveis`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ GET /api/imoveis - Success');
      console.log(`  Found ${data.data.length} imoveis`);
      console.log(`  Pagination: page ${data.pagination.page}, total ${data.pagination.total}`);
    } else {
      console.log('✗ GET /api/imoveis - Failed');
      console.log('  Error:', data.error);
    }

    // Test GET /api/imoveis with filters
    console.log('\n2. Testing GET /api/imoveis with filters');
    const filteredResponse = await fetch(`${BASE_URL}/api/imoveis?tipo=Casa&finalidade=venda&limit=5`);
    const filteredData = await filteredResponse.json();
    
    if (filteredResponse.ok) {
      console.log('✓ GET /api/imoveis with filters - Success');
      console.log(`  Found ${filteredData.data.length} filtered imoveis`);
    } else {
      console.log('✗ GET /api/imoveis with filters - Failed');
      console.log('  Error:', filteredData.error);
    }

    // Test POST /api/imoveis (create new imovel)
    console.log('\n3. Testing POST /api/imoveis');
    const newImovel = {
      nome: 'Casa de Teste API',
      tipo: 'Casa',
      finalidade: 'venda',
      valor_venda: 250000,
      descricao: 'Casa criada via API para teste',
      quartos: 3,
      banheiros: 2,
      area_total: 120.5,
      caracteristicas: ['Garagem', 'Quintal'],
      comodidades: ['Piscina', 'Churrasqueira'],
      endereco_completo: 'Rua de Teste, 123',
      bairro: 'Bairro Teste',
      destaque: false,
      ativo: true
    };

    const createResponse = await fetch(`${BASE_URL}/api/imoveis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newImovel)
    });

    const createdData = await createResponse.json();
    
    if (createResponse.ok) {
      console.log('✓ POST /api/imoveis - Success');
      console.log(`  Created imovel with ID: ${createdData.id}`);
      console.log(`  Name: ${createdData.nome}`);
      
      // Test GET /api/imoveis/[id]
      console.log('\n4. Testing GET /api/imoveis/[id]');
      const getByIdResponse = await fetch(`${BASE_URL}/api/imoveis/${createdData.id}`);
      const getByIdData = await getByIdResponse.json();
      
      if (getByIdResponse.ok) {
        console.log('✓ GET /api/imoveis/[id] - Success');
        console.log(`  Retrieved imovel: ${getByIdData.nome}`);
      } else {
        console.log('✗ GET /api/imoveis/[id] - Failed');
        console.log('  Error:', getByIdData.error);
      }

      // Test PUT /api/imoveis/[id]
      console.log('\n5. Testing PUT /api/imoveis/[id]');
      const updateData = {
        nome: 'Casa de Teste API - Atualizada',
        valor_venda: 280000,
        destaque: true
      };

      const updateResponse = await fetch(`${BASE_URL}/api/imoveis/${createdData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const updatedData = await updateResponse.json();
      
      if (updateResponse.ok) {
        console.log('✓ PUT /api/imoveis/[id] - Success');
        console.log(`  Updated name: ${updatedData.nome}`);
        console.log(`  Updated price: R$ ${updatedData.valor_venda}`);
        console.log(`  Destaque: ${updatedData.destaque}`);
      } else {
        console.log('✗ PUT /api/imoveis/[id] - Failed');
        console.log('  Error:', updatedData.error);
      }

      // Test DELETE /api/imoveis/[id]
      console.log('\n6. Testing DELETE /api/imoveis/[id]');
      const deleteResponse = await fetch(`${BASE_URL}/api/imoveis/${createdData.id}`, {
        method: 'DELETE'
      });

      const deleteData = await deleteResponse.json();
      
      if (deleteResponse.ok) {
        console.log('✓ DELETE /api/imoveis/[id] - Success');
        console.log(`  Deleted imovel: ${deleteData.nome}`);
      } else {
        console.log('✗ DELETE /api/imoveis/[id] - Failed');
        console.log('  Error:', deleteData.error);
      }

    } else {
      console.log('✗ POST /api/imoveis - Failed');
      console.log('  Error:', createdData.error);
    }

  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.log('\nMake sure the development server is running with: npm run dev');
  }
}

// Run the test
testImoveisAPI();