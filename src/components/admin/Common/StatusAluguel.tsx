import React from 'react';
import { Home, User, Calendar, DollarSign } from 'lucide-react';
import { ImovelStatusAluguel } from '@/lib/services/integracaoService';

interface StatusAluguelProps {
  status: ImovelStatusAluguel;
  showDetails?: boolean;
  className?: string;
}

export default function StatusAluguel({ status, showDetails = false, className = '' }: StatusAluguelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!status.alugado) {
    return (
      <div className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 ${className}`}>
        <Home className="w-3 h-3 mr-1" />
        Disponível
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 ${className}`}>
        <Home className="w-3 h-3 mr-1" />
        Alugado
      </div>
    );
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center mb-2">
        <div className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          <Home className="w-3 h-3 mr-1" />
          Alugado
        </div>
      </div>
      
      {status.contrato_ativo && (
        <div className="space-y-2 text-sm text-gray-600">
          {status.inquilino && (
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2 text-gray-400" />
              <span className="font-medium">{status.inquilino.nome}</span>
            </div>
          )}
          
          {status.valor_aluguel && (
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
              <span>{formatCurrency(status.valor_aluguel)}/mês</span>
            </div>
          )}
          
          {status.data_inicio && status.data_fim && (
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                {formatDate(status.data_inicio)} - {formatDate(status.data_fim)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}