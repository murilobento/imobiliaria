'use client';

import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import LoadingSpinner from '../../Common/LoadingSpinner';
import { 
  DespesaImovel, 
  DespesaFormData, 
  CreateDespesaData,
  DESPESA_CATEGORIA_LABELS,
  DESPESA_STATUS_LABELS,
  FINANCEIRO_CONSTANTS
} from '../../../../types/financeiro';
import { createDespesa, updateDespesa } from '../../../../lib/api/despesas';
import { getImoveis } from '../../../../lib/api/imoveis';
import { Imovel } from '../../../../types/imovel';

interface DespesaFormProps {
  despesa?: DespesaImovel | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function DespesaForm({ despesa, onSubmit, onCancel }: DespesaFormProps) {
  const [formData, setFormData] = useState<DespesaFormData>({
    imovel_id: '',
    categoria: 'outros',
    descricao: '',
    valor: '',
    data_despesa: new Date().toISOString().split('T')[0],
    data_pagamento: '',
    status: 'pendente',
    observacoes: ''
  });

  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingImoveis, setLoadingImoveis] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load properties and populate form if editing
  useEffect(() => {
    loadImoveis();
    
    if (despesa) {
      setFormData({
        imovel_id: despesa.imovel_id,
        categoria: despesa.categoria,
        descricao: despesa.descricao,
        valor: despesa.valor.toString(),
        data_despesa: despesa.data_despesa,
        data_pagamento: despesa.data_pagamento || '',
        status: despesa.status,
        observacoes: despesa.observacoes || ''
      });
    }
  }, [despesa]);

  const loadImoveis = async () => {
    try {
      setLoadingImoveis(true);
      const response = await getImoveis({}, { page: 1, limit: 1000 });
      setImoveis(response.data);
    } catch (err) {
      console.error('Erro ao carregar imóveis:', err);
    } finally {
      setLoadingImoveis(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.imovel_id) {
      newErrors.imovel_id = 'Selecione um imóvel';
    }

    if (!formData.categoria) {
      newErrors.categoria = 'Selecione uma categoria';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    } else if (formData.descricao.length > FINANCEIRO_CONSTANTS.DESCRICAO_MAX_LENGTH) {
      newErrors.descricao = `Descrição deve ter no máximo ${FINANCEIRO_CONSTANTS.DESCRICAO_MAX_LENGTH} caracteres`;
    }

    if (!formData.valor) {
      newErrors.valor = 'Valor é obrigatório';
    } else {
      const valor = parseFloat(formData.valor);
      if (isNaN(valor) || valor < FINANCEIRO_CONSTANTS.VALOR_MIN) {
        newErrors.valor = `Valor deve ser maior que ${FINANCEIRO_CONSTANTS.VALOR_MIN}`;
      }
    }

    if (!formData.data_despesa) {
      newErrors.data_despesa = 'Data da despesa é obrigatória';
    }

    // Validate payment date if status is paid
    if (formData.status === 'pago' && !formData.data_pagamento) {
      newErrors.data_pagamento = 'Data de pagamento é obrigatória quando status é "Pago"';
    }

    // Validate payment date is not before expense date
    if (formData.data_pagamento && formData.data_despesa) {
      const dataDespesa = new Date(formData.data_despesa);
      const dataPagamento = new Date(formData.data_pagamento);
      
      if (dataPagamento < dataDespesa) {
        newErrors.data_pagamento = 'Data de pagamento não pode ser anterior à data da despesa';
      }
    }

    // Validate observations length
    if (formData.observacoes && formData.observacoes.length > FINANCEIRO_CONSTANTS.OBSERVACOES_MAX_LENGTH) {
      newErrors.observacoes = `Observações devem ter no máximo ${FINANCEIRO_CONSTANTS.OBSERVACOES_MAX_LENGTH} caracteres`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const despesaData: CreateDespesaData = {
        imovel_id: formData.imovel_id,
        categoria: formData.categoria,
        descricao: formData.descricao.trim(),
        valor: parseFloat(formData.valor),
        data_despesa: formData.data_despesa,
        data_pagamento: formData.data_pagamento || undefined,
        status: formData.status,
        observacoes: formData.observacoes.trim() || undefined
      };

      if (despesa?.id) {
        await updateDespesa(despesa.id, despesaData);
      } else {
        await createDespesa(despesaData);
      }

      onSubmit();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Erro ao salvar despesa'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DespesaFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-clear payment date when status changes from paid
    if (field === 'status' && value !== 'pago') {
      setFormData(prev => ({ ...prev, data_pagamento: '' }));
    }
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    return numericValue;
  };

  if (loadingImoveis) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner text="Carregando formulário..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{errors.submit}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imóvel *
          </label>
          <select
            value={formData.imovel_id}
            onChange={(e) => handleInputChange('imovel_id', e.target.value)}
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.imovel_id ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Selecione um imóvel</option>
            {imoveis.map((imovel) => (
              <option key={imovel.id} value={imovel.id}>
                {imovel.nome || `${imovel.tipo} - ${imovel.endereco_completo}`}
              </option>
            ))}
          </select>
          {errors.imovel_id && (
            <p className="mt-1 text-sm text-red-600">{errors.imovel_id}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria *
          </label>
          <select
            value={formData.categoria}
            onChange={(e) => handleInputChange('categoria', e.target.value)}
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.categoria ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          >
            {Object.entries(DESPESA_CATEGORIA_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {errors.categoria && (
            <p className="mt-1 text-sm text-red-600">{errors.categoria}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {Object.entries(DESPESA_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição *
          </label>
          <input
            type="text"
            value={formData.descricao}
            onChange={(e) => handleInputChange('descricao', e.target.value)}
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.descricao ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ex: Reparo na torneira do banheiro"
            maxLength={FINANCEIRO_CONSTANTS.DESCRICAO_MAX_LENGTH}
            required
          />
          {errors.descricao && (
            <p className="mt-1 text-sm text-red-600">{errors.descricao}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.descricao.length}/{FINANCEIRO_CONSTANTS.DESCRICAO_MAX_LENGTH} caracteres
          </p>
        </div>

        {/* Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              R$
            </span>
            <input
              type="text"
              value={formData.valor}
              onChange={(e) => handleInputChange('valor', formatCurrency(e.target.value))}
              className={`w-full border rounded-md pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.valor ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0,00"
              required
            />
          </div>
          {errors.valor && (
            <p className="mt-1 text-sm text-red-600">{errors.valor}</p>
          )}
        </div>

        {/* Expense Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data da Despesa *
          </label>
          <input
            type="date"
            value={formData.data_despesa}
            onChange={(e) => handleInputChange('data_despesa', e.target.value)}
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.data_despesa ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          />
          {errors.data_despesa && (
            <p className="mt-1 text-sm text-red-600">{errors.data_despesa}</p>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data do Pagamento {formData.status === 'pago' && '*'}
          </label>
          <input
            type="date"
            value={formData.data_pagamento}
            onChange={(e) => handleInputChange('data_pagamento', e.target.value)}
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.data_pagamento ? 'border-red-300' : 'border-gray-300'
            }`}
            required={formData.status === 'pago'}
          />
          {errors.data_pagamento && (
            <p className="mt-1 text-sm text-red-600">{errors.data_pagamento}</p>
          )}
        </div>

        {/* Observations */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            rows={3}
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.observacoes ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Informações adicionais sobre a despesa..."
            maxLength={FINANCEIRO_CONSTANTS.OBSERVACOES_MAX_LENGTH}
          />
          {errors.observacoes && (
            <p className="mt-1 text-sm text-red-600">{errors.observacoes}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {formData.observacoes.length}/{FINANCEIRO_CONSTANTS.OBSERVACOES_MAX_LENGTH} caracteres
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2 inline" />
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner size="sm" text="Salvando..." />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2 inline" />
              {despesa ? 'Atualizar' : 'Salvar'} Despesa
            </>
          )}
        </button>
      </div>
    </form>
  );
}