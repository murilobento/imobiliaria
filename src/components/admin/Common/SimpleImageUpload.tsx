'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface SimpleImageUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

export default function SimpleImageUpload({ onUpload, disabled = false }: SimpleImageUploadProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!disabled) {
      await onUpload(acceptedFiles);
    }
  }, [onUpload, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    disabled
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium text-gray-900 mb-2">
        {isDragActive 
          ? 'Solte as imagens aqui...' 
          : 'Arraste imagens ou clique para selecionar'
        }
      </p>
      <p className="text-sm text-gray-500">
        PNG, JPG, WEBP até 10MB cada
      </p>
      {disabled && (
        <p className="text-xs text-red-500 mt-2">
          Salve o imóvel primeiro para adicionar imagens
        </p>
      )}
    </div>
  );
} 