'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Calendar, Filter } from 'lucide-react';
import LoadingSpinner from '../../Common/LoadingSpinner';
import { 
  DespesaImovel, 
  DESPESA_CATEGORIA_LABELS,
  DESPESA_STATUS_LABELS 
} from '../../../../types/financeiro';
import { fetchDespesas } from '../../../../lib/api/despesas';
import { getImoveis } from '../../../../lib/api/imoveis';
import { Imovel } from '../../../../types/imovel';

interface CategorySummary {
  categoria: string;
  total: number;
  count: number;
  pago: number;
  pendente: number;
  cancelado: number;
  percentual: number;
}

interface DespesasCategoriaProps {
  imovelId?: string;
  periodo?: {
    inicio: string;
    fim: string;
  };
}

export default function DespesasCategoria({ imovelId, periodo }: DespesasCategoriaProps) {
  const [despesas, setDespesas] = useState<DespesaImovel[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImovel, setSelectedImovel] = useState<string>(imovelId || '');
  const [selectedPeriod, setSelectedPeriod] = useState({
    inicio: periodo?.inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    fim: periodo?.fim || new Date().toISOString().split('T')[0]
  });
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    loadData();
    loadImoveis();
  }, [selectedImovel, selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {
        data_inicio: selectedPeriod.inicio,
        data_fim: selectedPeriod.fim
      };

      if (selectedImovel) {
        filters.imovel_id = selectedImovel;
      }

      const data = await fetchDespesas({
        limit: 1000,
        filters
      });

      setDespesas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const loadImoveis = async () => {
    try {
      const response = await getImoveis({}, { page: 1, limit: 1000 });
      setImoveis(response.data);
    } catch (err) {
      console.error('Erro ao carregar imóveis:', err);
    }
  };

  const categorySummary: CategorySummary[] = React.useMemo(() => {
    const summary: Record<string, CategorySummary> = {};
    const totalGeral = despesas.reduce((sum, d) => sum + d.valor, 0);

    // Initialize all categories
    Object.keys(DESPESA_CATEGORIA_LABELS).forEach(categoria => {
      summary[categoria] = {
        categoria,
        total: 0,
        count: 0,
        pago: 0,
        pendente: 0,
        cancelado: 0,
        percentual: 0
      };
    });

    // Calculate values for each category
    despesas.forEach(despesa => {
      const cat = summary[despesa.categoria];
      if (cat) {
        cat.total += despesa.valor;
        cat.count += 1;
        
        switch (despesa.status) {
          case 'pago':
            cat.pago += despesa.valor;
            break;
          case 'pendente':
            cat.pendente += despesa.valor;
            break;
          case 'cancelado':
            cat.cancelado += despesa.valor;
            break;
        }
      }
    });

    // Calculate percentages
    Object.values(summary).forEach(cat => {
      cat.percentual = totalGeral > 0 ? (cat.total / totalGeral) * 100 : 0;
    });

    return Object.values(summary).sort((a, b) => b.total - a.total);
  }, [despesas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getCategoryColor = (categoria: string) => {
    const colors = {
      manutencao: 'bg-blue-500',
      impostos: 'bg-purple-500',
      seguros: 'bg-indigo-500',
      administracao: 'bg-gray-500',
      outros: 'bg-orange-500'
    };
    return colors[categoria as keyof typeof colors] || 'bg-gray-500';
  };

  const getCategoryLightColor = (categoria: string) => {
    const colors = {
      manutencao: 'bg-blue-100 text-blue-800',
      impostos: 'bg-purple-100 text-purple-800',
      seguros: 'bg-indigo-100 text-indigo-800',
      administracao: 'bg-gray-100 text-gray-800',
      outros: 'bg-orange-100 text-orange-800'
    };
    return colors[categoria as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const totalGeral = categorySummary.reduce((sum, cat) => sum + cat.total, 0);
  const totalPago = categorySummary.reduce((sum, cat) => sum + cat.pago, 0);
  const totalPendente = categorySummary.reduce((sum, cat) => sum + cat.pendente, 0);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <button
          onClick={() => {
            setError(null);
            loadData();
          }}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Despesas por Categoria</h2>
          <p className="text-gray-600">Análise das despesas agrupadas por categoria</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {viewMode === 'chart' ? (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Tabela
              </>
            ) : (
              <>
                <PieChart className="h-4 w-4 mr-2" />
                Gráfico
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Property Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imóvel
            </label>
            <select
              value={selectedImovel}
              onChange={(e) => setSelectedImovel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os imóveis</option>
              {imoveis.map((imovel) => (
                <option key={imovel.id} value={imovel.id}>
                  {imovel.nome || `${imovel.tipo} - ${imovel.endereco_completo}`}
                </option>
              ))}
            </select>
          </div>

          {/* Period Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={selectedPeriod.inicio}
              onChange={(e) => setSelectedPeriod(prev => ({ ...prev, inicio: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Period End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={selectedPeriod.fim}
              onChange={(e) => setSelectedPeriod(prev => ({ ...prev, fim: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Geral</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalGeral)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pago</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalPago)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pendente</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalPendente)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner text="Carregando dados..." />
        </div>
      ) : (
        <>
          {viewMode === 'chart' ? (
            /* Chart View */
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribuição por Categoria</h3>
              
              <div className="space-y-4">
                {categorySummary.map((category) => (
                  <div key={category.categoria} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryLightColor(category.categoria)}`}>
                          {DESPESA_CATEGORIA_LABELS[category.categoria as keyof typeof DESPESA_CATEGORIA_LABELS]}
                        </span>
                        <span className="text-sm text-gray-600">
                          {category.count} despesa{category.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(category.total)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPercentage(category.percentual)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getCategoryColor(category.categoria)}`}
                        style={{ width: `${Math.max(category.percentual, 2)}%` }}
                      />
                    </div>
                    
                    {/* Status Breakdown */}
                    {category.total > 0 && (
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                          Pago: {formatCurrency(category.pago)}
                        </span>
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1" />
                          Pendente: {formatCurrency(category.pendente)}
                        </span>
                        {category.cancelado > 0 && (
                          <span className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />
                            Cancelado: {formatCurrency(category.cancelado)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pendente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentual
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categorySummary.map((category) => (
                    <tr key={category.categoria} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryLightColor(category.categoria)}`}>
                          {DESPESA_CATEGORIA_LABELS[category.categoria as keyof typeof DESPESA_CATEGORIA_LABELS]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {category.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(category.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {formatCurrency(category.pago)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                        {formatCurrency(category.pendente)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(category.percentual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}