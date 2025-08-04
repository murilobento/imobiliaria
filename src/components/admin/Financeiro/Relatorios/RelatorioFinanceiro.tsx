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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';

interface RelatorioFinanceiroData {
  receitas: number;
  despesas: number;
  inadimplencia: number;
  rentabilidade: number;
  totalContratos: number;
  contratosAtivos: number;
  dadosMensais: {
    mes: string;
    receitas: number;
    despesas: number;
    lucro: number;
  }[];
  distribuicaoReceitas: {
    categoria: string;
    valor: number;
    cor: string;
  }[];
}

interface RelatorioFinanceiroProps {
  periodo?: {
    inicio: string;
    fim: string;
  };
  onExportar?: (formato: 'pdf' | 'excel') => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function RelatorioFinanceiro({ periodo, onExportar }: RelatorioFinanceiroProps) {
  const [dados, setDados] = useState<RelatorioFinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRelatorioData();
  }, [periodo]);

  const fetchRelatorioData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (periodo?.inicio) params.append('inicio', periodo.inicio);
      if (periodo?.fim) params.append('fim', periodo.fim);

      const response = await fetch(`/api/relatorios/financeiro?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar relatório financeiro');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando relatório...</span>
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
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum dado encontrado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Não há dados financeiros para o período selecionado.
        </p>
      </div>
    );
  }

  const lucroLiquido = dados.receitas - dados.despesas;
  const margemLucro = dados.receitas > 0 ? (lucroLiquido / dados.receitas) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header com período e ações */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatório Financeiro</h2>
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
              Exportar PDF
            </button>
            <button
              onClick={() => onExportar('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Exportar Excel
            </button>
          </div>
        )}
      </div>

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Receitas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(dados.receitas)}
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
              <p className="text-sm font-medium text-gray-500">Despesas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(dados.despesas)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className={`h-8 w-8 ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Lucro Líquido</p>
              <p className={`text-2xl font-semibold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(lucroLiquido)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Margem de Lucro</p>
              <p className={`text-2xl font-semibold ${margemLucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(margemLucro)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de evolução mensal */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Evolução Mensal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dados.dadosMensais}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="receitas" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Receitas"
            />
            <Line 
              type="monotone" 
              dataKey="despesas" 
              stroke="#EF4444" 
              strokeWidth={2}
              name="Despesas"
            />
            <Line 
              type="monotone" 
              dataKey="lucro" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Lucro"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de barras - Receitas vs Despesas */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Receitas vs Despesas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dados.dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="receitas" fill="#10B981" name="Receitas" />
              <Bar dataKey="despesas" fill="#EF4444" name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de pizza - Distribuição de receitas */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição de Receitas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dados.distribuicaoReceitas}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="valor"
              >
                {dados.distribuicaoReceitas.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Métricas adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Total de Contratos</h4>
          <p className="text-3xl font-bold text-gray-900">{dados.totalContratos}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Contratos Ativos</h4>
          <p className="text-3xl font-bold text-green-600">{dados.contratosAtivos}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Taxa de Inadimplência</h4>
          <p className="text-3xl font-bold text-red-600">
            {formatPercentage(dados.inadimplencia)}
          </p>
        </div>
      </div>
    </div>
  );
}