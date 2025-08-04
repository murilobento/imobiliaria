'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Home, 
  Calculator,
  MapPin,
  Calendar,
  FileText,
  Filter,
  Download
} from 'lucide-react';

interface RentabilidadeImovel {
  id: string;
  endereco: string;
  cidade: string;
  tipo: string;
  valor_aluguel: number;
  receita_total: number;
  despesas_total: number;
  lucro_liquido: number;
  rentabilidade_percentual: number;
  ocupacao_percentual: number;
  meses_ocupado: number;
  total_meses: number;
  despesas_por_categoria: {
    categoria: string;
    valor: number;
  }[];
  historico_mensal: {
    mes: string;
    receita: number;
    despesas: number;
    lucro: number;
  }[];
}

interface RelatorioRentabilidadeData {
  imoveis: RentabilidadeImovel[];
  resumo: {
    receita_total: number;
    despesas_total: number;
    lucro_total: number;
    rentabilidade_media: number;
    ocupacao_media: number;
    melhor_imovel: {
      endereco: string;
      rentabilidade: number;
    };
    pior_imovel: {
      endereco: string;
      rentabilidade: number;
    };
  };
}

interface RelatorioRentabilidadeProps {
  periodo?: {
    inicio: string;
    fim: string;
  };
  filtros?: {
    cidade?: string;
    tipo?: string;
    rentabilidadeMinima?: number;
  };
  onExportar?: (formato: 'pdf' | 'excel') => void;
}

export default function RelatorioRentabilidade({ periodo, filtros, onExportar }: RelatorioRentabilidadeProps) {
  const [dados, setDados] = useState<RelatorioRentabilidadeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imovelSelecionado, setImovelSelecionado] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<'rentabilidade' | 'receita' | 'lucro'>('rentabilidade');

  useEffect(() => {
    fetchRelatorioData();
  }, [periodo, filtros]);

  const fetchRelatorioData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (periodo?.inicio) params.append('inicio', periodo.inicio);
      if (periodo?.fim) params.append('fim', periodo.fim);
      if (filtros?.cidade) params.append('cidade', filtros.cidade);
      if (filtros?.tipo) params.append('tipo', filtros.tipo);
      if (filtros?.rentabilidadeMinima) params.append('rentabilidadeMinima', filtros.rentabilidadeMinima.toString());

      const response = await fetch(`/api/relatorios/rentabilidade?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar relatório de rentabilidade');
      }

      const data = await response.json();
      setDados(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getRentabilidadeColor = (rentabilidade: number) => {
    if (rentabilidade >= 10) return 'text-green-600';
    if (rentabilidade >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRentabilidadeBadge = (rentabilidade: number) => {
    if (rentabilidade >= 10) return 'bg-green-100 text-green-800 border-green-200';
    if (rentabilidade >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const ordenarImoveis = (imoveis: RentabilidadeImovel[]) => {
    return [...imoveis].sort((a, b) => {
      switch (ordenacao) {
        case 'rentabilidade':
          return b.rentabilidade_percentual - a.rentabilidade_percentual;
        case 'receita':
          return b.receita_total - a.receita_total;
        case 'lucro':
          return b.lucro_liquido - a.lucro_liquido;
        default:
          return 0;
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando relatório de rentabilidade...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <FileText className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erro ao carregar relatório</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchRelatorioData}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="text-center py-8">
        <Home className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum dado encontrado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Não há dados de rentabilidade para o período selecionado.
        </p>
      </div>
    );
  }

  const imoveisOrdenados = ordenarImoveis(dados.imoveis);
  const imovelDetalhado = imovelSelecionado 
    ? dados.imoveis.find(i => i.id === imovelSelecionado)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatório de Rentabilidade</h2>
          {periodo && (
            <p className="text-sm text-gray-600 mt-1">
              <Calendar className="inline h-4 w-4 mr-1" />
              {new Date(periodo.inicio).toLocaleDateString('pt-BR')} até{' '}
              {new Date(periodo.fim).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        {onExportar && (
          <div className="flex space-x-2">
            <button
              onClick={() => onExportar('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <Download className="inline h-4 w-4 mr-1" />
              PDF
            </button>
            <button
              onClick={() => onExportar('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              <Download className="inline h-4 w-4 mr-1" />
              Excel
            </button>
          </div>
        )}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Receita Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(dados.resumo.receita_total)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Despesas Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(dados.resumo.despesas_total)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Lucro Total</p>
              <p className={`text-2xl font-semibold ${dados.resumo.lucro_total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(dados.resumo.lucro_total)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Rentabilidade Média</p>
              <p className={`text-2xl font-semibold ${getRentabilidadeColor(dados.resumo.rentabilidade_media)}`}>
                {formatPercentage(dados.resumo.rentabilidade_media)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Melhores e piores imóveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Melhor Performance</h3>
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">
                {dados.resumo.melhor_imovel.endereco}
              </p>
              <p className="text-2xl font-semibold text-green-600">
                {formatPercentage(dados.resumo.melhor_imovel.rentabilidade)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pior Performance</h3>
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">
                {dados.resumo.pior_imovel.endereco}
              </p>
              <p className="text-2xl font-semibold text-red-600">
                {formatPercentage(dados.resumo.pior_imovel.rentabilidade)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de rentabilidade por imóvel */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rentabilidade por Imóvel</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={imoveisOrdenados.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="endereco" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Rentabilidade']}
              labelFormatter={(label) => `Imóvel: ${label}`}
            />
            <Bar 
              dataKey="rentabilidade_percentual" 
              fill="#3B82F6"
              name="Rentabilidade (%)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Controles de ordenação */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center space-x-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as 'rentabilidade' | 'receita' | 'lucro')}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="rentabilidade">Rentabilidade</option>
            <option value="receita">Receita</option>
            <option value="lucro">Lucro Líquido</option>
          </select>
        </div>
      </div>

      {/* Lista detalhada de imóveis */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Análise Detalhada por Imóvel ({dados.imoveis.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Imóvel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aluguel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receita
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Despesas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lucro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rentabilidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ocupação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {imoveisOrdenados.map((imovel) => (
                <tr key={imovel.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      <MapPin className="inline h-4 w-4 mr-1 text-gray-400" />
                      {imovel.endereco}
                    </div>
                    <div className="text-sm text-gray-500">
                      {imovel.cidade} • {imovel.tipo}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(imovel.valor_aluguel)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {formatCurrency(imovel.receita_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {formatCurrency(imovel.despesas_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={imovel.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(imovel.lucro_liquido)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRentabilidadeBadge(imovel.rentabilidade_percentual)}`}>
                      {formatPercentage(imovel.rentabilidade_percentual)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercentage(imovel.ocupacao_percentual)}
                    <div className="text-xs text-gray-500">
                      {imovel.meses_ocupado}/{imovel.total_meses} meses
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setImovelSelecionado(
                        imovelSelecionado === imovel.id ? null : imovel.id
                      )}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {imovelSelecionado === imovel.id ? 'Ocultar' : 'Detalhes'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhes do imóvel selecionado */}
      {imovelDetalhado && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Análise Detalhada: {imovelDetalhado.endereco}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de evolução mensal */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Evolução Mensal</h4>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={imovelDetalhado.historico_mensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Area 
                    type="monotone" 
                    dataKey="receita" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B981"
                    fillOpacity={0.6}
                    name="Receita"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="despesas" 
                    stackId="2"
                    stroke="#EF4444" 
                    fill="#EF4444"
                    fillOpacity={0.6}
                    name="Despesas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Despesas por categoria */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Despesas por Categoria</h4>
              <div className="space-y-3">
                {imovelDetalhado.despesas_por_categoria.map((categoria, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">
                      {categoria.categoria}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(categoria.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}