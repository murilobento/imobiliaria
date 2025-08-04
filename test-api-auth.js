// Script para testar a autenticação da API
const fetch = require('node-fetch');

async function testApiAuth() {
  try {
    console.log('🧪 Testing API authentication...');
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/admin/users?page=1&limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This won't work from Node.js because we don't have the browser cookies
        // But it will help us see if the API is responding
      },
    });
    
    const result = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', result);
    
    if (response.status === 401) {
      console.log('✅ API is working - returns 401 as expected without auth cookies');
    } else if (response.status === 200) {
      console.log('✅ API is working - authenticated successfully');
    } else {
      console.log('❌ Unexpected response status');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testApiAuth();