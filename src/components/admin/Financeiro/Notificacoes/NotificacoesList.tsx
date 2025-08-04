'use client';

import React, { useState, useEffect } from 'react';
import { 
  Notificacao, 
  NotificacaoFilters,
  NOTIFICACAO_TIPO_LABELS,
  NOTIFICACAO_STATUS_LABELS,
  NOTIFICACAO_PRIORIDADE_LABELS,
  NOTIFICACAO_PRIORIDADE_CORES,
  NOTIFICACAO_TIPO,
  NOTIFICACAO_STATUS,
  NOTIFICACAO_PRIORIDADE
} from '@/types/notificacao';

interface NotificacoesListProps {
  filters?: Partial<NotificacaoFilters>;
  onNotificacaoClick?: (notificacao: Notificacao) => void;
  showFilters?: boolean;
  limit?: number;
}

interface NotificacoesResponse {
  success: boolean;
  data: Notificacao[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function NotificacoesList({ 
  filters = {}, 
  onNotificacaoClick,
  showFilters = true,
  limit = 20 
}: NotificacoesListProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Estados dos filtros
  const [localFilters, setLocalFilters] = useState<Partial<NotificacaoFilters>>({
    apenas_nao_lidas: true,
    ...filters
  });

  const fetchNotificacoes = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.entries(localFilters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await fetch(`/api/notificacoes?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar notificações');
      }

      const data: NotificacoesResponse = await response.json();
      
      if (data.success) {
        setNotificacoes(data.data);
        setTotal(data.total);
        setCurrentPage(data.page);
        setTotalPages(data.totalPages);
      } else {
        throw new Error('Erro na resposta da API');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificacoes(1);
  }, [localFilters]);

  const handleFilterChange = (key: keyof NotificacaoFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const handleNotificacaoClick = async (notificacao: Notificacao) => {
    // Marcar como lida se ainda não foi lida
    if (notificacao.status !== NOTIFICACAO_STATUS.LIDA) {
      try {
        const response = await fetch(`/api/notificacoes/${notificacao.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'marcar_como_lida' }),
        });

        if (response.ok) {
          // Atualizar o estado local
          setNotificacoes(prev => 
            prev.map(n => 
              n.id === notificacao.id 
                ? { ...n, status: NOTIFICACAO_STATUS.LIDA, data_leitura: new Date().toISOString() }
                : n
            )
          );
        }
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    }

    if (onNotificacaoClick) {
      onNotificacaoClick(notificacao);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case NOTIFICACAO_PRIORIDADE.URGENTE:
        return '🚨';
      case NOTIFICACAO_PRIORIDADE.ALTA:
        return '⚠️';
      case NOTIFICACAO_PRIORIDADE.MEDIA:
        return '📋';
      case NOTIFICACAO_PRIORIDADE.BAIXA:
        return '📝';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando notificações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={localFilters.tipo || ''}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {Object.entries(NOTIFICACAO_TIPO_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={localFilters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {Object.entries(NOTIFICACAO_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridade
              </label>
              <select
                value={localFilters.prioridade || ''}
                onChange={(e) => handleFilterChange('prioridade', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {Object.entries(NOTIFICACAO_PRIORIDADE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.apenas_nao_lidas || false}
                  onChange={(e) => handleFilterChange('apenas_nao_lidas', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Apenas não lidas</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Notificações */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              Notificações ({total})
            </h3>
            <button
              onClick={() => fetchNotificacoes(currentPage)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {notificacoes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nenhuma notificação encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notificacoes.map((notificacao) => (
              <div
                key={notificacao.id}
                onClick={() => handleNotificacaoClick(notificacao)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  notificacao.status === NOTIFICACAO_STATUS.LIDA ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-2xl">
                    {getPrioridadeIcon(notificacao.prioridade)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-sm font-medium ${
                        notificacao.status === NOTIFICACAO_STATUS.LIDA 
                          ? 'text-gray-600' 
                          : 'text-gray-900'
                      }`}>
                        {notificacao.titulo}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          NOTIFICACAO_PRIORIDADE_CORES[notificacao.prioridade as keyof typeof NOTIFICACAO_PRIORIDADE_CORES]
                        }`}>
                          {NOTIFICACAO_PRIORIDADE_LABELS[notificacao.prioridade as keyof typeof NOTIFICACAO_PRIORIDADE_LABELS]}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatarData(notificacao.data_criacao)}
                        </span>
                      </div>
                    </div>
                    
                    <p className={`text-sm ${
                      notificacao.status === NOTIFICACAO_STATUS.LIDA 
                        ? 'text-gray-500' 
                        : 'text-gray-700'
                    }`}>
                      {notificacao.mensagem}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>
                          {NOTIFICACAO_TIPO_LABELS[notificacao.tipo as keyof typeof NOTIFICACAO_TIPO_LABELS]}
                        </span>
                        <span>
                          {NOTIFICACAO_STATUS_LABELS[notificacao.status as keyof typeof NOTIFICACAO_STATUS_LABELS]}
                        </span>
                      </div>
                      
                      {notificacao.status !== NOTIFICACAO_STATUS.LIDA && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Página {currentPage} de {totalPages} ({total} total)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => fetchNotificacoes(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => fetchNotificacoes(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}