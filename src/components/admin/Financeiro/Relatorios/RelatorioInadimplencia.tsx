'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  DollarSign, 
  Phone, 
  Mail,
  MapPin,
  FileText,
  Filter,
  Download
} from 'lucide-react';

interface PagamentoAtrasado {
  id: string;
  contrato_id: string;
  mes_referencia: string;
  valor_devido: number;
  valor_juros: number;
  valor_multa: number;
  data_vencimento: string;
  dias_atraso: number;
  contrato: {
    id: string;
    valor_aluguel: number;
    imovel: {
      endereco: string;
      cidade: string;
    };
    inquilino: {
      nome: string;
      email?: string;
      telefone?: string;
    };
  };
}

interface RelatorioInadimplenciaData {
  pagamentosAtrasados: PagamentoAtrasado[];
  totalDevido: number;
  totalJuros: number;
  totalMultas: number;
  totalInadimplentes: number;
  resumoPorFaixa: {
    faixa: string;
    quantidade: number;
    valor: number;
  }[];
}

interface RelatorioInadimplenciaProps {
  filtros?: {
    diasMinimos?: number;
    diasMaximos?: number;
    valorMinimo?: number;
    valorMaximo?: number;
  };
  onExportar?: (formato: 'pdf' | 'excel') => void;
}

export default function RelatorioInadimplencia({ filtros, onExportar }: RelatorioInadimplenciaProps) {
  const [dados, setDados] = useState<RelatorioInadimplenciaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<'dias' | 'valor' | 'nome'>('dias');

  useEffect(() => {
    fetchRelatorioData();
  }, [filtros]);

  const fetchRelatorioData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filtros?.diasMinimos) params.append('diasMinimos', filtros.diasMinimos.toString());
      if (filtros?.diasMaximos) params.append('diasMaximos', filtros.diasMaximos.toString());
      if (filtros?.valorMinimo) params.append('valorMinimo', filtros.valorMinimo.toString());
      if (filtros?.valorMaximo) params.append('valorMaximo', filtros.valorMaximo.toString());

      const response = await fetch(`/api/relatorios/inadimplencia?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar relatório de inadimplência');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getSeverityColor = (diasAtraso: number) => {
    if (diasAtraso <= 15) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (diasAtraso <= 30) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSeverityIcon = (diasAtraso: number) => {
    if (diasAtraso <= 15) return <Clock className="h-4 w-4" />;
    if (diasAtraso <= 30) return <AlertTriangle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const filtrarPagamentos = (pagamentos: PagamentoAtrasado[]) => {
    let filtered = [...pagamentos];

    if (filtroAtivo === 'critico') {
      filtered = filtered.filter(p => p.dias_atraso > 30);
    } else if (filtroAtivo === 'moderado') {
      filtered = filtered.filter(p => p.dias_atraso > 15 && p.dias_atraso <= 30);
    } else if (filtroAtivo === 'leve') {
      filtered = filtered.filter(p => p.dias_atraso <= 15);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (ordenacao) {
        case 'dias':
          return b.dias_atraso - a.dias_atraso;
        case 'valor':
          return (b.valor_devido + b.valor_juros + b.valor_multa) - (a.valor_devido + a.valor_juros + a.valor_multa);
        case 'nome':
          return a.contrato.inquilino.nome.localeCompare(b.contrato.inquilino.nome);
        default:
          return 0;
      }
    });

    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2">Carregando relatório de inadimplência...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
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
          Não há pagamentos em atraso no momento.
        </p>
      </div>
    );
  }

  const pagamentosFiltrados = filtrarPagamentos(dados.pagamentosAtrasados);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatório de Inadimplência</h2>
          <p className="text-sm text-gray-600 mt-1">
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            {dados.totalInadimplentes} contratos com pagamentos em atraso
          </p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Devido</p>
              <p className="text-2xl font-semibold text-red-600">
                {formatCurrency(dados.totalDevido)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Juros Acumulados</p>
              <p className="text-2xl font-semibold text-orange-600">
                {formatCurrency(dados.totalJuros)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Multas</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {formatCurrency(dados.totalMultas)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inadimplentes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {dados.totalInadimplentes}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo por faixa de atraso */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Resumo por Faixa de Atraso</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dados.resumoPorFaixa.map((faixa, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900">{faixa.faixa}</h4>
              <p className="text-sm text-gray-600">{faixa.quantidade} contratos</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(faixa.valor)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros e ordenação */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
            <select
              value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="leve">Atraso Leve (até 15 dias)</option>
              <option value="moderado">Atraso Moderado (16-30 dias)</option>
              <option value="critico">Atraso Crítico (30+ dias)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as 'dias' | 'valor' | 'nome')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="dias">Dias de Atraso</option>
              <option value="valor">Valor Total</option>
              <option value="nome">Nome do Inquilino</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista detalhada de inadimplentes */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Pagamentos em Atraso ({pagamentosFiltrados.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inquilino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Imóvel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atraso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Devido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Juros/Multa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagamentosFiltrados.map((pagamento) => {
                const valorTotal = pagamento.valor_devido + pagamento.valor_juros + pagamento.valor_multa;
                const severityClass = getSeverityColor(pagamento.dias_atraso);
                
                return (
                  <tr key={pagamento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {pagamento.contrato.inquilino.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <MapPin className="inline h-4 w-4 mr-1 text-gray-400" />
                        {pagamento.contrato.imovel.endereco}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pagamento.contrato.imovel.cidade}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <Calendar className="inline h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(pagamento.data_vencimento)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Ref: {formatDate(pagamento.mes_referencia)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityClass}`}>
                        {getSeverityIcon(pagamento.dias_atraso)}
                        <span className="ml-1">{pagamento.dias_atraso} dias</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(pagamento.valor_devido)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-orange-600">
                        Juros: {formatCurrency(pagamento.valor_juros)}
                      </div>
                      <div className="text-sm text-red-600">
                        Multa: {formatCurrency(pagamento.valor_multa)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatCurrency(valorTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {pagamento.contrato.inquilino.telefone && (
                          <a
                            href={`tel:${pagamento.contrato.inquilino.telefone}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="Ligar"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {pagamento.contrato.inquilino.email && (
                          <a
                            href={`mailto:${pagamento.contrato.inquilino.email}`}
                            className="text-green-600 hover:text-green-800"
                            title="Enviar email"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagamentosFiltrados.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhum pagamento encontrado
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Não há pagamentos em atraso com os filtros selecionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}