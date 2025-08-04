'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, X, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../../Common/LoadingSpinner';
import { 
  ContratoAluguel, 
  ContratoFormData, 
  CreateContratoData,
  CONTRATO_STATUS,
  FINANCEIRO_CONSTANTS 
} from '../../../../types/financeiro';
import { Imovel } from '../../../../types/imovel';
import { Cliente } from '../../../../types/cliente';
import { supabase } from '../../../../lib/supabase';
import { IntegracaoService } from '../../../../lib/services/integracaoService';

interface ContratoFormProps {
  contrato?: ContratoAluguel;
  onSave: (data: CreateContratoData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
}

const initialFormData: ContratoFormData = {
  imovel_id: '',
  inquilino_id: '',
  proprietario_id: '',
  valor_aluguel: '',
  valor_deposito: '',
  data_inicio: '',
  data_fim: '',
  dia_vencimento: 10,
  status: CONTRATO_STATUS.ATIVO,
  observacoes: ''
};

export default function ContratoForm({
  contrato,
  onSave,
  onCancel,
  loading = false,
  className = ''
}: ContratoFormProps) {
  const [formData, setFormData] = useState<ContratoFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available properties
  const { data: imoveis, isLoading: imoveisLoading } = useQuery({
    queryKey: ['imoveis-disponiveis', contrato?.id],
    queryFn: async () => {
      // If editing, get all properties that are available OR the current property
      if (contrato) {
        const { data, error } = await supabase
          .from('imoveis')
          .select('id, nome, endereco_completo, bairro, cidade:cidades(nome), finalidade')
          .in('finalidade', ['aluguel', 'ambos'])
          .eq('ativo', true)
          .order('nome');
        
        if (error) throw error;
        
        // Filter to show only available properties + current property
        const availableProperties = await IntegracaoService.getImoveisDisponiveis();
        const currentProperty = data.find(p => p.id === contrato.imovel_id);
        
        const filteredProperties = data.filter(property => 
          availableProperties.some(ap => ap.id === property.id) || 
          property.id === contrato.imovel_id
        );
        
        return filteredProperties as (Imovel & { cidade: { nome: string } })[];
      } else {
        // For new contracts, only show available properties
        return await IntegracaoService.getImoveisDisponiveis();
      }
    }
  });

  // Fetch clients
  const { data: clientes, isLoading: clientesLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, email, telefone')
        .order('nome');
      
      if (error) throw error;
      return data as Cliente[];
    }
  });

  // Initialize form with contract data if editing
  useEffect(() => {
    if (contrato) {
      setFormData({
        imovel_id: contrato.imovel_id,
        inquilino_id: contrato.inquilino_id,
        proprietario_id: contrato.proprietario_id || '',
        valor_aluguel: contrato.valor_aluguel.toString(),
        valor_deposito: contrato.valor_deposito?.toString() || '',
        data_inicio: contrato.data_inicio,
        data_fim: contrato.data_fim,
        dia_vencimento: contrato.dia_vencimento,
        status: contrato.status,
        observacoes: contrato.observacoes || ''
      });
    }
  }, [contrato]);

  // Handle input changes
  const handleInputChange = useCallback((
    field: keyof ContratoFormData,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.imovel_id) {
      newErrors.imovel_id = 'Selecione um imóvel';
    }
    if (!formData.inquilino_id) {
      newErrors.inquilino_id = 'Selecione um inquilino';
    }
    if (!formData.valor_aluguel) {
      newErrors.valor_aluguel = 'Informe o valor do aluguel';
    }
    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Informe a data de início';
    }
    if (!formData.data_fim) {
      newErrors.data_fim = 'Informe a data de fim';
    }

    // Validate values
    const valorAluguel = parseFloat(formData.valor_aluguel);
    if (formData.valor_aluguel && (isNaN(valorAluguel) || valorAluguel < FINANCEIRO_CONSTANTS.VALOR_MIN)) {
      newErrors.valor_aluguel = `Valor deve ser maior que R$ ${FINANCEIRO_CONSTANTS.VALOR_MIN}`;
    }

    const valorDeposito = parseFloat(formData.valor_deposito);
    if (formData.valor_deposito && (isNaN(valorDeposito) || valorDeposito < 0)) {
      newErrors.valor_deposito = 'Valor do depósito deve ser maior ou igual a zero';
    }

    // Validate dates
    if (formData.data_inicio && formData.data_fim) {
      const dataInicio = new Date(formData.data_inicio);
      const dataFim = new Date(formData.data_fim);
      
      if (dataFim <= dataInicio) {
        newErrors.data_fim = 'Data de fim deve ser posterior à data de início';
      }
    }

    // Validate due day
    if (formData.dia_vencimento < FINANCEIRO_CONSTANTS.DIA_VENCIMENTO_MIN || 
        formData.dia_vencimento > FINANCEIRO_CONSTANTS.DIA_VENCIMENTO_MAX) {
      newErrors.dia_vencimento = `Dia deve estar entre ${FINANCEIRO_CONSTANTS.DIA_VENCIMENTO_MIN} e ${FINANCEIRO_CONSTANTS.DIA_VENCIMENTO_MAX}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData: CreateContratoData = {
        imovel_id: formData.imovel_id,
        inquilino_id: formData.inquilino_id,
        proprietario_id: formData.proprietario_id || undefined,
        valor_aluguel: parseFloat(formData.valor_aluguel),
        valor_deposito: formData.valor_deposito ? parseFloat(formData.valor_deposito) : undefined,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        dia_vencimento: formData.dia_vencimento,
        status: formData.status,
        observacoes: formData.observacoes || undefined
      };

      await onSave(submitData);
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSave]);

  const isLoading = imoveisLoading || clientesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner text="Carregando dados..." />
      </div>
    );
  }

  return (
    <div className={`bg-white shadow-sm rounded-lg ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {contrato ? 'Editar Contrato' : 'Novo Contrato'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Property and Tenant Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imóvel *
            </label>
            <select
              value={formData.imovel_id}
              onChange={(e) => handleInputChange('imovel_id', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.imovel_id ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading || isSubmitting}
            >
              <option value="">Selecione um imóvel</option>
              {imoveis?.map((imovel) => (
                <option key={imovel.id} value={imovel.id}>
                  {imovel.nome} - {imovel.bairro && `${imovel.bairro}, `}{imovel.cidade?.nome}
                </option>
              ))}
            </select>
            {errors.imovel_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.imovel_id}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inquilino *
            </label>
            <select
              value={formData.inquilino_id}
              onChange={(e) => handleInputChange('inquilino_id', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.inquilino_id ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading || isSubmitting}
            >
              <option value="">Selecione um inquilino</option>
              {clientes?.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome} - {cliente.email || cliente.telefone}
                </option>
              ))}
            </select>
            {errors.inquilino_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.inquilino_id}
              </p>
            )}
          </div>
        </div>

        {/* Owner Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proprietário
          </label>
          <select
            value={formData.proprietario_id}
            onChange={(e) => handleInputChange('proprietario_id', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || isSubmitting}
          >
            <option value="">Selecione um proprietário (opcional)</option>
            {clientes?.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome} - {cliente.email || cliente.telefone}
              </option>
            ))}
          </select>
        </div>

        {/* Financial Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor do Aluguel *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.valor_aluguel}
              onChange={(e) => handleInputChange('valor_aluguel', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.valor_aluguel ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0,00"
              disabled={loading || isSubmitting}
            />
            {errors.valor_aluguel && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.valor_aluguel}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor do Depósito
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.valor_deposito}
              onChange={(e) => handleInputChange('valor_deposito', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.valor_deposito ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0,00"
              disabled={loading || isSubmitting}
            />
            {errors.valor_deposito && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.valor_deposito}
              </p>
            )}
          </div>
        </div>

        {/* Contract Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Início *
            </label>
            <input
              type="date"
              value={formData.data_inicio}
              onChange={(e) => handleInputChange('data_inicio', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.data_inicio ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading || isSubmitting}
            />
            {errors.data_inicio && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.data_inicio}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Fim *
            </label>
            <input
              type="date"
              value={formData.data_fim}
              onChange={(e) => handleInputChange('data_fim', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.data_fim ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading || isSubmitting}
            />
            {errors.data_fim && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.data_fim}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dia do Vencimento *
            </label>
            <input
              type="number"
              min={FINANCEIRO_CONSTANTS.DIA_VENCIMENTO_MIN}
              max={FINANCEIRO_CONSTANTS.DIA_VENCIMENTO_MAX}
              value={formData.dia_vencimento}
              onChange={(e) => handleInputChange('dia_vencimento', parseInt(e.target.value))}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.dia_vencimento ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading || isSubmitting}
            />
            {errors.dia_vencimento && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.dia_vencimento}
              </p>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || isSubmitting}
          >
            <option value={CONTRATO_STATUS.ATIVO}>Ativo</option>
            <option value={CONTRATO_STATUS.SUSPENSO}>Suspenso</option>
            <option value={CONTRATO_STATUS.ENCERRADO}>Encerrado</option>
          </select>
        </div>

        {/* Observations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            rows={3}
            maxLength={FINANCEIRO_CONSTANTS.OBSERVACOES_MAX_LENGTH}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Observações adicionais sobre o contrato..."
            disabled={loading || isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.observacoes.length}/{FINANCEIRO_CONSTANTS.OBSERVACOES_MAX_LENGTH} caracteres
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading || isSubmitting}
          >
            <X className="h-4 w-4 mr-2 inline" />
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || isSubmitting}
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" text="Salvando..." />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2 inline" />
                {contrato ? 'Atualizar' : 'Criar'} Contrato
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}