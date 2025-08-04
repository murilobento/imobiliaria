import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ClientesPage from '@/app/admin/clientes/page'
import CidadesPage from '@/app/admin/cidades/page'
import ImoveisPage from '@/app/admin/imoveis/page'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/admin/clientes',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Test wrapper with QueryClient
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Admin CRUD Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Clientes CRUD', () => {
    it('should load and display clientes list', async () => {
      const mockClientes = [
        {
          id: '1',
          nome: 'João Silva',
          email: 'joao@email.com',
          telefone: '(11) 99999-9999',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockClientes,
          page: 1,
          total: 1,
          totalPages: 1
        })
      })

      render(
        <TestWrapper>
          <ClientesPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument()
        expect(screen.getByText('joao@email.com')).toBeInTheDocument()
      })
    })

    it('should create a new cliente', async () => {
      const user = userEvent.setup()

      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          page: 1,
          total: 0,
          totalPages: 0
        })
      })

      // Mock create request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '1',
          nome: 'Novo Cliente',
          email: 'novo@email.com'
        })
      })

      // Mock reload after create
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: '1',
            nome: 'Novo Cliente',
            email: 'novo@email.com',
            created_at: '2024-01-01T00:00:00Z'
          }],
          page: 1,
          total: 1,
          totalPages: 1
        })
      })

      render(
        <TestWrapper>
          <ClientesPage />
        </TestWrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Novo Cliente')).toBeInTheDocument()
      })

      // Click "Novo Cliente" button
      const newButton = screen.getByText('Novo Cliente')
      await user.click(newButton)

      // Fill form
      const nameInput = screen.getByLabelText(/Nome/)
      const emailInput = screen.getByLabelText(/Email/)

      await user.type(nameInput, 'Novo Cliente')
      await user.type(emailInput, 'novo@email.com')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Criar/ })
      await user.click(submitButton)

      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/clientes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: 'Novo Cliente',
            email: 'novo@email.com',
            telefone: '',
            cpf_cnpj: '',
            endereco: '',
            observacoes: ''
          }),
        })
      })
    })

    it('should delete a cliente with confirmation', async () => {
      const user = userEvent.setup()
      const mockCliente = {
        id: '1',
        nome: 'Cliente para Deletar',
        email: 'deletar@email.com',
        created_at: '2024-01-01T00:00:00Z'
      }

      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockCliente],
          page: 1,
          total: 1,
          totalPages: 1
        })
      })

      // Mock delete request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      // Mock reload after delete
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          page: 1,
          total: 0,
          totalPages: 0
        })
      })

      render(
        <TestWrapper>
          <ClientesPage />
        </TestWrapper>
      )

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Cliente para Deletar')).toBeInTheDocument()
      })

      // Click delete button (assuming it's in the table actions)
      const deleteButton = screen.getByRole('button', { name: /Excluir/ })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /Excluir/ })
      await user.click(confirmButton)

      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/clientes/1', {
          method: 'DELETE',
        })
      })
    })
  })

  describe('Cidades CRUD', () => {
    it('should load and display cidades list', async () => {
      const mockCidades = [
        {
          id: '1',
          nome: 'São Paulo',
          ativa: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockCidades
        })
      })

      render(
        <TestWrapper>
          <CidadesPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('São Paulo')).toBeInTheDocument()
        expect(screen.getByText('Ativa')).toBeInTheDocument()
      })
    })

    it('should create a new cidade', async () => {
      const user = userEvent.setup()

      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      })

      // Mock create request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '1',
          nome: 'Nova Cidade',
          ativa: true
        })
      })

      // Mock reload after create
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: '1',
            nome: 'Nova Cidade',
            ativa: true,
            created_at: '2024-01-01T00:00:00Z'
          }]
        })
      })

      render(
        <TestWrapper>
          <CidadesPage />
        </TestWrapper>
      )

      // Click "Nova Cidade" button
      const newButton = screen.getByText('Nova Cidade')
      await user.click(newButton)

      // Fill form
      const nameInput = screen.getByLabelText(/Nome da Cidade/)
      await user.type(nameInput, 'Nova Cidade')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Criar/ })
      await user.click(submitButton)

      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/cidades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: 'Nova Cidade',
            ativa: true
          }),
        })
      })
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup()

      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          page: 1,
          total: 0,
          totalPages: 0
        })
      })

      render(
        <TestWrapper>
          <ClientesPage />
        </TestWrapper>
      )

      // Click "Novo Cliente" button
      const newButton = screen.getByText('Novo Cliente')
      await user.click(newButton)

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /Criar/ })
      await user.click(submitButton)

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()

      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          page: 1,
          total: 0,
          totalPages: 0
        })
      })

      render(
        <TestWrapper>
          <ClientesPage />
        </TestWrapper>
      )

      // Click "Novo Cliente" button
      const newButton = screen.getByText('Novo Cliente')
      await user.click(newButton)

      // Fill form with invalid email
      const nameInput = screen.getByLabelText(/Nome/)
      const emailInput = screen.getByLabelText(/Email/)

      await user.type(nameInput, 'Cliente Teste')
      await user.type(emailInput, 'email-invalido')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Criar/ })
      await user.click(submitButton)

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText('Email deve ter um formato válido')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(
        <TestWrapper>
          <ClientesPage />
        </TestWrapper>
      )

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar clientes/)).toBeInTheDocument()
      })
    })

    it('should handle server errors', async () => {
      const user = userEvent.setup()

      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          page: 1,
          total: 0,
          totalPages: 0
        })
      })

      // Mock server error on create
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Nome já existe'
        })
      })

      render(
        <TestWrapper>
          <ClientesPage />
        </TestWrapper>
      )

      // Click "Novo Cliente" button
      const newButton = screen.getByText('Novo Cliente')
      await user.click(newButton)

      // Fill and submit form
      const nameInput = screen.getByLabelText(/Nome/)
      await user.type(nameInput, 'Cliente Duplicado')

      const submitButton = screen.getByRole('button', { name: /Criar/ })
      await user.click(submitButton)

      // Should show server error
      await waitFor(() => {
        expect(screen.getByText('Nome já existe')).toBeInTheDocument()
      })
    })
  })
})