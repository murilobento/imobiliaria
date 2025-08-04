import React from 'react';
import { Home, Calendar, DollarSign, ExternalLink } from 'lucide-react';
import { ClienteContratosAtivos } from '@/lib/services/integracaoService';
import Link from 'next/link';

interface ContratosAtivosProps {
  contratos: ClienteContratosAtivos;
  showDetails?: boolean;
  className?: string;
}

export default function ContratosAtivos({ contratos, showDetails = false, className = '' }: ContratosAtivosProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (contratos.total_contratos === 0) {
    return (
      <div className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 ${className}`}>
        <Home className="w-3 h-3 mr-1" />
        Sem contratos ativos
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ${className}`}>
        <Home className="w-3 h-3 mr-1" />
        {contratos.total_contratos} contrato{contratos.total_contratos > 1 ? 's' : ''} ativo{contratos.total_contratos > 1 ? 's' : ''}
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          <Home className="w-3 h-3 mr-1" />
          {contratos.total_contratos} contrato{contratos.total_contratos > 1 ? 's' : ''} ativo{contratos.total_contratos > 1 ? 's' : ''}
        </div>
        
        {contratos.valor_total_mensal > 0 && (
          <div className="text-sm font-semibold text-blue-800">
            Total: {formatCurrency(contratos.valor_total_mensal)}/mês
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {contratos.contratos.map((contrato) => (
          <div key={contrato.id} className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">
                {contrato.imovel?.nome || 'Imóvel não identificado'}
              </h4>
              <Link
                href={`/admin/financeiro/contratos/${contrato.id}`}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                <span>{formatCurrency(contrato.valor_aluguel)}/mês</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                <span>Início: {formatDate(contrato.data_inicio)}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                <span>Fim: {formatDate(contrato.data_fim)}</span>
              </div>
            </div>
            
            {contrato.imovel && (
              <div className="mt-2 text-xs text-gray-500">
                {contrato.imovel.endereco_completo && (
                  <div>{contrato.imovel.endereco_completo}</div>
                )}
                {contrato.imovel.bairro && contrato.imovel.cidade && (
                  <div>{contrato.imovel.bairro}, {contrato.imovel.cidade.nome}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-blue-200">
        <Link
          href="/admin/financeiro/contratos"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Ver todos os contratos →
        </Link>
      </div>
    </div>
  );
}