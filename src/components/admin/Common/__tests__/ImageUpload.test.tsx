import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ImageUpload, { ExistingImage } from '../ImageUpload';

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false
  }))
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  }
}));

describe('ImageUpload Component', () => {
  const mockOnUpload = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnReorder = vi.fn();

  const existingImages: ExistingImage[] = [
    {
      id: 'existing-1',
      url: '/test-image.jpg',
      url_thumb: '/test-thumb.jpg',
      ordem: 0,
      tipo: 'paisagem'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dropzone area', () => {
    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
      />
    );

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
    expect(screen.getByText(/Arraste imagens ou clique para selecionar/)).toBeInTheDocument();
    expect(screen.getByText(/Máximo 5 imagens/)).toBeInTheDocument();
  });

  it('should display existing images', () => {
    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        existingImages={existingImages}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByAltText('Upload 1')).toBeInTheDocument();
    expect(screen.getByText('paisagem')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Ordem
  });

  it('should call onRemove when remove button is clicked', () => {
    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        existingImages={existingImages}
        onRemove={mockOnRemove}
      />
    );

    const removeButton = screen.getByRole('button');
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith('existing-1');
  });

  it('should show disabled state', () => {
    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        disabled={true}
      />
    );

    const dropzone = screen.getByTestId('dropzone');
    expect(dropzone).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('should show empty state when no images', () => {
    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
      />
    );

    expect(screen.getByText('Nenhuma imagem carregada')).toBeInTheDocument();
  });

  it('should display correct file count', () => {
    render(
      <ImageUpload
        onUpload={mockOnUpload}
        maxFiles={5}
        existingImages={existingImages}
      />
    );

    expect(screen.getByText('1 de 5 imagens')).toBeInTheDocument();
  });
});