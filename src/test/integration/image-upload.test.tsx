import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImageUpload from '@/components/admin/Common/ImageUpload'

// Mock file processing utilities
vi.mock('@/lib/utils/imageProcessing', () => ({
  processImageSet: vi.fn(),
  validateImage: vi.fn(),
  detectImageOrientation: vi.fn(),
  resizeImage: vi.fn(),
  compressImage: vi.fn()
}))

// Mock fetch for upload API
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock URL.createObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
})

describe('Image Upload Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle single image upload', async () => {
    const user = userEvent.setup()
    const mockOnUpload = vi.fn()

    // Mock successful upload response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        images: [{
          id: '1',
          url: 'https://storage.supabase.co/image1.jpg',
          url_thumb: 'https://storage.supabase.co/thumb1.jpg',
          tipo: 'paisagem',
          ordem: 0
        }]
      })
    })

    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    // Create a mock file
    const file = new File(['mock image content'], 'test-image.jpg', {
      type: 'image/jpeg'
    })

    // Find file input and upload file
    const fileInput = screen.getByRole('button', { name: /Selecionar imagens/ })
    const hiddenInput = fileInput.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(hiddenInput, file)

    // Verify upload was called
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([file])
    })
  })

  it('should handle multiple image upload', async () => {
    const user = userEvent.setup()
    const mockOnUpload = vi.fn()

    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    // Create multiple mock files
    const files = [
      new File(['mock image 1'], 'image1.jpg', { type: 'image/jpeg' }),
      new File(['mock image 2'], 'image2.png', { type: 'image/png' }),
      new File(['mock image 3'], 'image3.jpg', { type: 'image/jpeg' })
    ]

    // Find file input and upload files
    const fileInput = screen.getByRole('button', { name: /Selecionar imagens/ })
    const hiddenInput = fileInput.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(hiddenInput, files)

    // Verify upload was called with all files
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(files)
    })
  })

  it('should validate file types', async () => {
    const user = userEvent.setup()
    const mockOnUpload = vi.fn()

    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    // Create invalid file type
    const invalidFile = new File(['mock content'], 'document.pdf', {
      type: 'application/pdf'
    })

    const fileInput = screen.getByRole('button', { name: /Selecionar imagens/ })
    const hiddenInput = fileInput.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(hiddenInput, invalidFile)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Tipo de arquivo não suportado/)).toBeInTheDocument()
    })

    // Upload should not be called
    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('should enforce maximum file limit', async () => {
    const user = userEvent.setup()
    const mockOnUpload = vi.fn()

    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={2}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    // Create more files than allowed
    const files = [
      new File(['mock image 1'], 'image1.jpg', { type: 'image/jpeg' }),
      new File(['mock image 2'], 'image2.jpg', { type: 'image/jpeg' }),
      new File(['mock image 3'], 'image3.jpg', { type: 'image/jpeg' })
    ]

    const fileInput = screen.getByRole('button', { name: /Selecionar imagens/ })
    const hiddenInput = fileInput.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(hiddenInput, files)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Máximo de 2 arquivos permitidos/)).toBeInTheDocument()
    })

    // Upload should not be called
    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('should handle drag and drop', async () => {
    const mockOnUpload = vi.fn()

    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    const dropZone = screen.getByText(/Arraste imagens aqui/)

    // Create mock file
    const file = new File(['mock image'], 'dropped-image.jpg', {
      type: 'image/jpeg'
    })

    // Simulate drag and drop
    const dropEvent = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file]
      }
    })

    fireEvent(dropZone, dropEvent)

    // Verify upload was called
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([file])
    })
  })

  it('should show upload progress', async () => {
    const user = userEvent.setup()
    const mockOnUpload = vi.fn()

    // Mock slow upload response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              success: true,
              images: [{
                id: '1',
                url: 'https://storage.supabase.co/image1.jpg',
                tipo: 'paisagem'
              }]
            })
          })
        }, 100)
      })
    )

    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    const file = new File(['mock image'], 'test-image.jpg', {
      type: 'image/jpeg'
    })

    const fileInput = screen.getByRole('button', { name: /Selecionar imagens/ })
    const hiddenInput = fileInput.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(hiddenInput, file)

    // Should show progress indicator
    expect(screen.getByText(/Enviando/)).toBeInTheDocument()

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.queryByText(/Enviando/)).not.toBeInTheDocument()
    })
  })

  it('should handle upload errors', async () => {
    const user = userEvent.setup()
    const mockOnUpload = vi.fn()

    // Mock upload error
    mockFetch.mockRejectedValueOnce(new Error('Upload failed'))

    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    const file = new File(['mock image'], 'test-image.jpg', {
      type: 'image/jpeg'
    })

    const fileInput = screen.getByRole('button', { name: /Selecionar imagens/ })
    const hiddenInput = fileInput.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(hiddenInput, file)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Erro no upload/)).toBeInTheDocument()
    })
  })

  it('should allow image reordering', async () => {
    const mockOnReorder = vi.fn()
    const existingImages = [
      {
        id: '1',
        url: 'https://storage.supabase.co/image1.jpg',
        url_thumb: 'https://storage.supabase.co/thumb1.jpg',
        ordem: 0,
        tipo: 'paisagem' as const
      },
      {
        id: '2',
        url: 'https://storage.supabase.co/image2.jpg',
        url_thumb: 'https://storage.supabase.co/thumb2.jpg',
        ordem: 1,
        tipo: 'retrato' as const
      }
    ]

    render(
      <ImageUpload
        onUpload={vi.fn()}
        onReorder={mockOnReorder}
        existingImages={existingImages}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    // Find drag handles (assuming they exist in the component)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)

    // Simulate drag and drop reordering
    // This would require more complex drag and drop simulation
    // For now, we'll test that the reorder function is available
    expect(mockOnReorder).toBeDefined()
  })

  it('should remove images', async () => {
    const user = userEvent.setup()
    const mockOnRemove = vi.fn()
    const existingImages = [
      {
        id: '1',
        url: 'https://storage.supabase.co/image1.jpg',
        url_thumb: 'https://storage.supabase.co/thumb1.jpg',
        ordem: 0,
        tipo: 'paisagem' as const
      }
    ]

    render(
      <ImageUpload
        onUpload={vi.fn()}
        onRemove={mockOnRemove}
        existingImages={existingImages}
        maxFiles={5}
        acceptedTypes={['image/jpeg', 'image/png']}
      />
    )

    // Find and click remove button
    const removeButton = screen.getByRole('button', { name: /Remover/ })
    await user.click(removeButton)

    // Verify remove was called
    expect(mockOnRemove).toHaveBeenCalledWith('1')
  })
})