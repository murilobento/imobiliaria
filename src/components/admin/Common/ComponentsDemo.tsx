'use client';

import React, { useState } from 'react';
import ImageUpload, { UploadedImage, ExistingImage } from './ImageUpload';

export default function ComponentsDemo() {
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([
    {
      id: 'existing-1',
      url: '/hero-bg.jpg',
      url_thumb: '/hero-bg.jpg',
      ordem: 0,
      tipo: 'paisagem'
    }
  ]);

  const handleUpload = async (files: File[]) => {
    console.log('Uploading files:', files);
    
    // Simula delay de upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simula erro ocasional para teste
    if (Math.random() < 0.3) {
      throw new Error('Erro simulado de upload');
    }
    
    console.log('Upload completed successfully');
  };

  const handleRemove = (imageId: string) => {
    console.log('Removing image:', imageId);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleReorder = (images: (UploadedImage | ExistingImage)[]) => {
    console.log('Reordering images:', images);
    const existingOnly = images.filter(img => 'url' in img) as ExistingImage[];
    setExistingImages(existingOnly.map((img, index) => ({ ...img, ordem: index })));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Teste do Componente ImageUpload</h1>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Upload de Imagens</h2>
          <ImageUpload
            onUpload={handleUpload}
            maxFiles={5}
            existingImages={existingImages}
            onRemove={handleRemove}
            onReorder={handleReorder}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Upload Desabilitado</h2>
          <ImageUpload
            onUpload={handleUpload}
            maxFiles={3}
            disabled={true}
          />
        </div>
      </div>
    </div>
  );
}