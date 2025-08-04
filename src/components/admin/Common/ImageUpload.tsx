'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { X, Upload, Image as ImageIcon, Move, AlertCircle } from 'lucide-react';

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

export interface ExistingImage {
  id: string;
  url: string;
  url_thumb?: string;
  ordem: number;
  tipo: 'retrato' | 'paisagem';
}

interface ImageUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  acceptedTypes?: string[];
  existingImages?: ExistingImage[];
  onRemove?: (imageId: string) => void;
  onReorder?: (images: (UploadedImage | ExistingImage)[]) => void;
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({
  onUpload,
  maxFiles = 10,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  existingImages = [],
  onRemove,
  onReorder,
  disabled = false,
  className = ''
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combina imagens existentes e carregadas
  const allImages = [...existingImages, ...uploadedImages];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('onDrop called with files:', acceptedFiles);
    
    if (disabled) {
      console.log('Upload disabled');
      return;
    }

    // Verifica limite de arquivos
    const totalFiles = allImages.length + acceptedFiles.length;
    if (totalFiles > maxFiles) {
      alert(`Máximo de ${maxFiles} imagens permitidas`);
      return;
    }

    // Cria previews das novas imagens
    const newImages: UploadedImage[] = acceptedFiles.map(file => ({
      id: `upload-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
      progress: 0
    }));

    setUploadedImages(prev => [...prev, ...newImages]);

    try {
      // Simula progresso de upload
      for (const image of newImages) {
        setUploadedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, progress: 50 }
              : img
          )
        );
      }

      await onUpload(acceptedFiles);

      // Marca como concluído
      setUploadedImages(prev => 
        prev.map(img => 
          newImages.some(newImg => newImg.id === img.id)
            ? { ...img, uploading: false, progress: 100 }
            : img
        )
      );
    } catch (error) {
      // Marca erro
      setUploadedImages(prev => 
        prev.map(img => 
          newImages.some(newImg => newImg.id === img.id)
            ? { 
                ...img, 
                uploading: false, 
                error: error instanceof Error ? error.message : 'Erro no upload'
              }
            : img
        )
      );
    }
  }, [allImages.length, maxFiles, onUpload, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxFiles - allImages.length,
    disabled: disabled || allImages.length >= maxFiles
  });

  const handleRemove = (imageId: string) => {
    if (disabled) return;

    // Remove da lista de uploaded
    const uploadedImage = uploadedImages.find(img => img.id === imageId);
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage.preview);
      setUploadedImages(prev => prev.filter(img => img.id !== imageId));
      return;
    }

    // Remove da lista de existentes
    if (onRemove) {
      onRemove(imageId);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (disabled || draggedIndex === null) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (disabled || draggedIndex === null) return;
    e.preventDefault();

    if (draggedIndex !== dropIndex) {
      const newImages = [...allImages];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(dropIndex, 0, draggedImage);

      if (onReorder) {
        onReorder(newImages);
      }
    }

    handleDragEnd();
  };

  const handleRetry = async (imageId: string) => {
    const image = uploadedImages.find(img => img.id === imageId);
    if (!image) return;

    setUploadedImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, uploading: true, progress: 0, error: undefined }
          : img
      )
    );

    try {
      await onUpload([image.file]);
      setUploadedImages(prev => 
        prev.map(img => 
          img.id === imageId 
            ? { ...img, uploading: false, progress: 100 }
            : img
        )
      );
    } catch (error) {
      setUploadedImages(prev => 
        prev.map(img => 
          img.id === imageId 
            ? { 
                ...img, 
                uploading: false, 
                error: error instanceof Error ? error.message : 'Erro no upload'
              }
            : img
        )
      );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Área de Drop */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled || allImages.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive 
            ? 'Solte as imagens aqui...' 
            : disabled || allImages.length >= maxFiles
              ? 'Limite de imagens atingido'
              : 'Arraste imagens ou clique para selecionar'
          }
        </p>
        <button
          type="button"
          onClick={() => {
            console.log('Test button clicked');
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Teste: Selecionar Arquivos
        </button>
        <p className="text-sm text-gray-500">
          Máximo {maxFiles} imagens • PNG, JPG, WEBP até 10MB cada
        </p>
        <p className="text-xs text-gray-400 mt-2">
          {allImages.length} de {maxFiles} imagens
        </p>
        {disabled && (
          <p className="text-xs text-red-500 mt-2">
            Salve o imóvel primeiro para adicionar imagens
          </p>
        )}
      </div>

      {/* Grid de Imagens */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allImages.map((image, index) => {
            const isExisting = 'url' in image;
            const isUploaded = 'file' in image;
            const imageUrl = isExisting ? image.url : (image as UploadedImage).preview;
            const isUploading = isUploaded && (image as UploadedImage).uploading;
            const hasError = isUploaded && (image as UploadedImage).error;
            const progress = isUploaded ? (image as UploadedImage).progress || 0 : 100;

            return (
              <div
                key={image.id}
                draggable={!disabled && !isUploading}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative group rounded-lg overflow-hidden border-2 transition-all
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  ${dragOverIndex === index ? 'border-blue-500 scale-105' : 'border-gray-200'}
                  ${!disabled && !isUploading ? 'cursor-move' : ''}
                `}
              >
                {/* Imagem */}
                <div className="aspect-square bg-gray-100 relative">
                  <Image
                    src={imageUrl}
                    alt={`Upload ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized={isUploaded} // Para previews locais
                  />
                  
                  {/* Overlay de Loading */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <div className="text-sm">{progress}%</div>
                      </div>
                    </div>
                  )}

                  {/* Overlay de Erro */}
                  {hasError && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                      <div className="text-white text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <div className="text-xs">Erro no upload</div>
                        <button
                          onClick={() => handleRetry(image.id)}
                          className="text-xs underline mt-1"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botão de Remover */}
                  {!disabled && !isUploading && (
                    <button
                      onClick={() => handleRemove(image.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Indicador de Ordem */}
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>

                  {/* Indicador de Tipo */}
                  {isExisting && (
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {image.tipo}
                    </div>
                  )}

                  {/* Ícone de Arrastar */}
                  {!disabled && !isUploading && (
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Move className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mensagem quando não há imagens */}
      {allImages.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="mx-auto h-12 w-12 mb-4" />
          <p>Nenhuma imagem carregada</p>
        </div>
      )}
    </div>
  );
}