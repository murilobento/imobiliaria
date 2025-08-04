/**
 * Test script to debug admin authentication
 * This script tests the API without authentication to verify error handling
 */

const fetch = require('node-fetch');

async function testAdminAuth() {
  try {
    console.log('Testing admin authentication without token...');
    
    // Test the API without authentication to verify it returns 401
    const response = await fetch('http://localhost:3000/api/admin/users?page=1&limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('Response body:', result);

    if (response.status === 401) {
      console.log('✅ Authentication properly blocks unauthorized requests');
    } else {
      console.log('❌ Authentication may not be working correctly');
    }

  } catch (error) {
    console.error('Error testing admin auth:', error);
  }
}

testAdminAuth();