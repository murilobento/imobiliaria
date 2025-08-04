'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImovelFormData, ImovelTipo, ImovelFinalidade, Imovel } from '@/types/imovel';
import { Cidade } from '@/types/cidade';
import { Cliente } from '@/types/cliente';

import ImageUpload, { ExistingImage } from '@/components/admin/Common/ImageUpload';
import LoadingSpinner, { ButtonSpinner } from '@/components/admin/Common/LoadingSpinner';
import { useImovelValidation } from '@/hooks/useFormValidation';
import { useErrorContext } from '@/components/admin/Common/ErrorProvider';
import { useNetworkAwareOperation } from '@/hooks/useNetworkStatus';
import { imoveisApi } from '@/lib/api/client';
import { useCidades } from '@/lib/api/cidades';
import { useClientes } from '@/lib/api/clientes';

interface ImovelFormProps {
  imovel?: Imovel;
  onSubmit: (data: ImovelFormData) => Promise<void>;
  isLoading?: boolean;
}

const TIPOS_IMOVEL: ImovelTipo[] = [
  'Apartamento',
  'Casa',
  'Terreno',
  'Chácara',
  'Sítio',
  'Fazenda'
];

const FINALIDADES: { value: ImovelFinalidade; label: string }[] = [
  { value: 'venda', label: 'Venda' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'ambos', label: 'Venda e Aluguel' }
];

const CARACTERISTICAS_OPCOES = [
  'Piscina',
  'Churrasqueira',
  'Jardim',
  'Garagem',
  'Portaria 24h',
  'Elevador',
  'Sacada',
  'Varanda',
  'Área de serviço',
  'Quintal',
  'Área gourmet',
  'Academia',
  'Playground',
  'Salão de festas',
  'Quadra esportiva'
];

const COMODIDADES_OPCOES = [
  'Ar condicionado',
  'Aquecimento',
  'Internet',
  'TV a cabo',
  'Mobiliado',
  'Semi-mobiliado',
  'Cozinha equipada',
  'Armários embutidos',
  'Box de vidro',
  'Piso laminado',
  'Piso cerâmico',
  'Piso de madeira',
  'Closet',
  'Suíte',
  'Hidromassagem'
];

export default function ImovelForm({ imovel, onSubmit, isLoading = false }: ImovelFormProps) {
  const router = useRouter();

  // Initial form data
  const initialFormData: ImovelFormData = {
    nome: '',
    tipo: 'Casa',
    finalidade: 'venda',
    valor_venda: '',
    valor_aluguel: '',
    descricao: '',
    quartos: 0,
    banheiros: 0,
    area_total: '',
    caracteristicas: [],
    comodidades: [],
    endereco_completo: '',
    cidade_id: '',
    bairro: '',
    destaque: false,
    cliente_id: '',
    ativo: true
  };

  // Use validation hook
  const {
    fields,
    isValid,
    isSubmitting,
    setFieldValue,
    setFieldErrors,
    validateAllFields,
    getValues,
    setSubmitting,
    getFieldProps,
    hasFieldError,
    getFieldError
  } = useImovelValidation(initialFormData);

  // Use error handling hooks
  const { showSuccess, showError } = useErrorContext();
  const { executeIfOnline, isOnline } = useNetworkAwareOperation();

  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);

  // Carregar dados iniciais
  useEffect(() => {
    // Se está editando, preencher dados do imóvel
    if (imovel) {
      // Preencher campos do formulário
      setFieldValue('nome', imovel.nome);
      setFieldValue('tipo', imovel.tipo);
      setFieldValue('finalidade', imovel.finalidade);
      setFieldValue('valor_venda', imovel.valor_venda?.toString() || '');
      setFieldValue('valor_aluguel', imovel.valor_aluguel?.toString() || '');
      setFieldValue('descricao', imovel.descricao || '');
      setFieldValue('quartos', imovel.quartos);
      setFieldValue('banheiros', imovel.banheiros);
      setFieldValue('area_total', imovel.area_total?.toString() || '');
      setFieldValue('caracteristicas', imovel.caracteristicas || []);
      setFieldValue('comodidades', imovel.comodidades || []);
      setFieldValue('endereco_completo', imovel.endereco_completo || '');
      setFieldValue('cidade_id', imovel.cidade_id || '');
      setFieldValue('bairro', imovel.bairro || '');
      setFieldValue('destaque', imovel.destaque);
      setFieldValue('cliente_id', imovel.cliente_id || '');
      setFieldValue('ativo', imovel.ativo);

      // Converter imagens existentes para o formato do componente
      if (imovel.imagens) {
        const convertedImages: ExistingImage[] = imovel.imagens.map(img => ({
          id: img.id!,
          url: img.url,
          url_thumb: img.url_thumb,
          ordem: img.ordem,
          tipo: img.tipo
        }));
        setExistingImages(convertedImages);
      }
    }
  }, [imovel, setFieldValue]);

  // Usar hooks para carregar cidades e clientes com cache
  const { data: cidades = [], isLoading: isLoadingCidades } = useCidades();
  const { data: clientes = [], isLoading: isLoadingClientes } = useClientes();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFieldValue(name as keyof ImovelFormData, checked);
    } else if (type === 'number') {
      setFieldValue(name as keyof ImovelFormData, parseInt(value) || 0);
    } else {
      setFieldValue(name as keyof ImovelFormData, value);
    }
  };

  const handleArrayChange = (field: 'caracteristicas' | 'comodidades', value: string) => {
    const currentArray = fields[field].value as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];

    setFieldValue(field, newArray);
  };

  const handleImageUpload = async (files: File[]) => {
    if (!imovel?.id) {
      showError('Salve o imóvel primeiro antes de adicionar imagens');
      return;
    }

    await executeIfOnline(
      async () => {
        const result = await imoveisApi.uploadImages(imovel.id!, files, (progress) => {
          // Você pode adicionar um indicador de progresso aqui se necessário
        }) as {
          success: boolean;
          uploaded: Array<{
            id: string;
            url: string;
            url_thumb: string;
            ordem: number;
            tipo: string;
          }>;
          errors: Array<{
            index: number;
            filename: string;
            error: string;
          }>;
          summary: {
            total: number;
            successful: number;
            failed: number;
          };
        };

        if (result.errors && result.errors.length > 0) {
          showError(`${result.summary.successful} imagens enviadas, ${result.summary.failed} falharam`);
        } else {
          showSuccess(`${result.summary.successful} imagens enviadas com sucesso`);
        }

        // Atualizar lista de imagens existentes
        const newImages: ExistingImage[] = result.uploaded.map((img) => ({
          id: img.id,
          url: img.url,
          url_thumb: img.url_thumb,
          ordem: img.ordem,
          tipo: img.tipo as "retrato" | "paisagem"
        }));

        setExistingImages(prev => [...prev, ...newImages]);
      },
      {
        offlineMessage: 'Upload de imagens requer conexão com a internet'
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todos os campos
    const isFormValid = validateAllFields();

    if (!isFormValid) {
      showError('Por favor, corrija os erros nos campos indicados');
      return;
    }

    try {
      const formData = getValues();
      await onSubmit(formData);
      showSuccess(imovel ? 'Imóvel atualizado com sucesso' : 'Imóvel criado com sucesso');
    } catch (error) {
      showError('Erro ao salvar imóvel');
    }
  };

  if (isLoadingCidades || isLoadingClientes) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informações Básicas */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Informações Básicas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                Nome do Imóvel *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={fields.nome.value}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Casa com 3 quartos no Centro"
              />
            </div>

            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
                Tipo *
              </label>
              <select
                id="tipo"
                name="tipo"
                value={fields.tipo.value}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {TIPOS_IMOVEL.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="finalidade" className="block text-sm font-medium text-gray-700">
                Finalidade *
              </label>
              <select
                id="finalidade"
                name="finalidade"
                value={fields.finalidade.value}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {FINALIDADES.map(finalidade => (
                  <option key={finalidade.value} value={finalidade.value}>
                    {finalidade.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="destaque"
                name="destaque"
                checked={fields.destaque.value}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="destaque" className="ml-2 block text-sm text-gray-900">
                Imóvel em destaque
              </label>
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Valores
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(fields.finalidade.value === 'venda' || fields.finalidade.value === 'ambos') && (
              <div>
                <label htmlFor="valor_venda" className="block text-sm font-medium text-gray-700">
                  Valor de Venda (R$) {fields.finalidade.value === 'venda' ? '*' : ''}
                </label>
                <input
                  type="number"
                  id="valor_venda"
                  name="valor_venda"
                  value={fields.valor_venda.value}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${hasFieldError('valor_venda') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  placeholder="0,00"
                />
                {hasFieldError('valor_venda') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('valor_venda')}</p>
                )}
              </div>
            )}

            {(fields.finalidade.value === 'aluguel' || fields.finalidade.value === 'ambos') && (
              <div>
                <label htmlFor="valor_aluguel" className="block text-sm font-medium text-gray-700">
                  Valor de Aluguel (R$) {fields.finalidade.value === 'aluguel' ? '*' : ''}
                </label>
                <input
                  type="number"
                  id="valor_aluguel"
                  name="valor_aluguel"
                  value={fields.valor_aluguel.value}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${hasFieldError('valor_aluguel') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  placeholder="0,00"
                />
                {hasFieldError('valor_aluguel') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('valor_aluguel')}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Características do Imóvel */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Características do Imóvel
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label htmlFor="quartos" className="block text-sm font-medium text-gray-700">
                Quartos
              </label>
              <input
                type="number"
                id="quartos"
                name="quartos"
                value={fields.quartos.value}
                onChange={handleInputChange}
                min="0"
                max="20"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="banheiros" className="block text-sm font-medium text-gray-700">
                Banheiros
              </label>
              <input
                type="number"
                id="banheiros"
                name="banheiros"
                value={fields.banheiros.value}
                onChange={handleInputChange}
                min="0"
                max="20"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="area_total" className="block text-sm font-medium text-gray-700">
                Área Total (m²)
              </label>
              <input
                type="number"
                id="area_total"
                name="area_total"
                value={fields.area_total.value}
                onChange={handleInputChange}
                min="1"
                step="0.01"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <textarea
              id="descricao"
              name="descricao"
              value={fields.descricao.value}
              onChange={handleInputChange}
              rows={4}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descreva as principais características do imóvel..."
            />
          </div>
        </div>        {
/* Localização */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Localização
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="cidade_id" className="block text-sm font-medium text-gray-700">
                Cidade
              </label>
              <select
                id="cidade_id"
                name="cidade_id"
                value={fields.cidade_id.value}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma cidade</option>
                {cidades.map(cidade => (
                  <option key={cidade.id} value={cidade.id}>
                    {cidade.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bairro" className="block text-sm font-medium text-gray-700">
                Bairro
              </label>
              <input
                type="text"
                id="bairro"
                name="bairro"
                value={fields.bairro.value}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Centro"
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="endereco_completo" className="block text-sm font-medium text-gray-700">
              Endereço Completo
            </label>
            <textarea
              id="endereco_completo"
              name="endereco_completo"
              value={fields.endereco_completo.value}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rua, número, complemento, CEP..."
            />
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Cliente Proprietário
          </h3>

          <div>
            <label htmlFor="cliente_id" className="block text-sm font-medium text-gray-700">
              Cliente
            </label>
            <select
              id="cliente_id"
              name="cliente_id"
              value={fields.cliente_id.value}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome} {cliente.email && `(${cliente.email})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Características */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Características
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {CARACTERISTICAS_OPCOES.map(caracteristica => (
              <label key={caracteristica} className="flex items-center">
                <input
                  type="checkbox"
                  checked={fields.caracteristicas.value.includes(caracteristica)}
                  onChange={() => handleArrayChange('caracteristicas', caracteristica)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{caracteristica}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Comodidades */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Comodidades
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {COMODIDADES_OPCOES.map(comodidade => (
              <label key={comodidade} className="flex items-center">
                <input
                  type="checkbox"
                  checked={fields.comodidades.value.includes(comodidade)}
                  onChange={() => handleArrayChange('comodidades', comodidade)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{comodidade}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Upload de Imagens */}
        {imovel?.id && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Imagens do Imóvel
            </h3>

            <ImageUpload
              onUpload={handleImageUpload}
              existingImages={existingImages}
              maxFiles={20}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Status
          </h3>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="ativo"
              name="ativo"
              checked={fields.ativo.value}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
              Imóvel ativo (visível no site)
            </label>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {isLoading && (
              <>
                <ButtonSpinner size="sm" />
                <span className="ml-2">Salvando...</span>
              </>
            )}
            {!isLoading && (imovel ? 'Atualizar Imóvel' : 'Criar Imóvel')}
          </button>
        </div>
      </form>
    </div>
  );
}