// Set up environment variables for tests BEFORE any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Make vi available globally as jest
Object.assign(global, { jest: vi })

// Mock Supabase client globally
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}))

vi.mock('@/lib/supabase-auth', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}))

// Test user interface
export interface TestUser {
  id: string
  email: string
  role: string
}

// Create a test user
export async function createTestUser(role: 'admin' | 'user' = 'user'): Promise<TestUser> {
  const testEmail = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`
  
  const { data: user, error } = await supabase
    .from('auth_users')
    .insert({
      email: testEmail,
      password_hash: 'test-hash',
      role: role,
      active: true
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role
  }
}

// Create auth headers for API requests
export async function createAuthHeaders(userId: string): Promise<Record<string, string>> {
  // In a real implementation, you would create a JWT token here
  // For testing purposes, we'll use a simple approach
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer test-token-${userId}`,
    'x-user-id': userId // Custom header for testing
  }
}

// Clean up test data
export async function cleanupTestData(): Promise<void> {
  try {
    // Clean up in reverse order of dependencies
    await supabase.from('pagamentos_aluguel').delete().neq('id', '')
    await supabase.from('despesas_imoveis').delete().neq('id', '')
    await supabase.from('contratos_aluguel').delete().neq('id', '')
    await supabase.from('imoveis').delete().neq('id', '')
    await supabase.from('clientes').delete().neq('id', '')
    await supabase.from('cidades').delete().neq('id', '')
    await supabase.from('auth_users').delete().like('email', '%@test.com')
  } catch (error) {
    console.warn('Error during test cleanup:', error)
  }
}

// Clean up specific test user
export async function cleanupTestUser(userId: string): Promise<void> {
  try {
    await supabase.from('auth_users').delete().eq('id', userId)
  } catch (error) {
    console.warn('Error cleaning up test user:', error)
  }
}