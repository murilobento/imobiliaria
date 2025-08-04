'use client';

import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Calendar,
  Filter,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';

interface ExportOptions {
  formato: 'pdf' | 'excel';
  tipoRelatorio: 'financeiro' | 'inadimplencia' | 'rentabilidade';
  periodo: {
    inicio: string;
    fim: string;
  };
  filtros?: {
    cidade?: string;
    tipo?: string;
    status?: string;
    valorMinimo?: number;
    valorMaximo?: number;
  };
  incluirGraficos: boolean;
  incluirDetalhes: boolean;
  agruparPor?: 'mes' | 'imovel' | 'categoria';
}

interface ExportarRelatorioProps {
  tipoRelatorio: 'financeiro' | 'inadimplencia' | 'rentabilidade';
  dadosParaExportar?: any;
  onExportComplete?: (success: boolean, filename?: string) => void;
}

export default function ExportarRelatorio({ 
  tipoRelatorio, 
  dadosParaExportar,
  onExportComplete 
}: ExportarRelatorioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [options, setOptions] = useState<ExportOptions>({
    formato: 'pdf',
    tipoRelatorio,
    periodo: {
      inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      fim: new Date().toISOString().split('T')[0]
    },
    incluirGraficos: true,
    incluirDetalhes: true,
    agruparPor: 'mes'
  });

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const exportData = {
        ...options,
        dados: dadosParaExportar
      };

      const response = await fetch('/api/relatorios/exportar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Erro ao exportar relatório');
      }

      // Para PDF e Excel, esperamos um blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Criar nome do arquivo
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `relatorio-${options.tipoRelatorio}-${timestamp}.${options.formato === 'pdf' ? 'pdf' : 'xlsx'}`;
      
      // Fazer download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Relatório exportado com sucesso: ${filename}`);
      onExportComplete?.(true, filename);
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      onExportComplete?.(false);
    } finally {
      setLoading(false);
    }
  };

  const getTipoRelatorioLabel = (tipo: string) => {
    switch (tipo) {
      case 'financeiro': return 'Financeiro';
      case 'inadimplencia': return 'Inadimplência';
      case 'rentabilidade': return 'Rentabilidade';
      default: return tipo;
    }
  };

  const getFormatoIcon = (formato: 'pdf' | 'excel') => {
    return formato === 'pdf' ? 
      <FileText className="h-5 w-5" /> : 
      <FileSpreadsheet className="h-5 w-5" />;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar Relatório
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Exportar Relatório {getTipoRelatorioLabel(tipoRelatorio)}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Fechar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Formato */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Formato de Exportação
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOptions(prev => ({ ...prev, formato: 'pdf' }))}
                className={`flex items-center justify-center p-4 border-2 rounded-lg ${
                  options.formato === 'pdf'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="h-6 w-6 mr-2" />
                <div className="text-left">
                  <div className="font-medium">PDF</div>
                  <div className="text-sm text-gray-500">Documento formatado</div>
                </div>
              </button>
              
              <button
                onClick={() => setOptions(prev => ({ ...prev, formato: 'excel' }))}
                className={`flex items-center justify-center p-4 border-2 rounded-lg ${
                  options.formato === 'excel'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className="h-6 w-6 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Excel</div>
                  <div className="text-sm text-gray-500">Planilha editável</div>
                </div>
              </button>
            </div>
          </div>

          {/* Período */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="inline h-4 w-4 mr-1" />
              Período
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data Início</label>
                <input
                  type="date"
                  value={options.periodo.inicio}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    periodo: { ...prev.periodo, inicio: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={options.periodo.fim}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    periodo: { ...prev.periodo, fim: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Opções de conteúdo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Settings className="inline h-4 w-4 mr-1" />
              Opções de Conteúdo
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.incluirGraficos}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    incluirGraficos: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Incluir gráficos e visualizações</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.incluirDetalhes}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    incluirDetalhes: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Incluir dados detalhados</span>
              </label>
            </div>
          </div>

          {/* Agrupamento (apenas para alguns tipos) */}
          {(tipoRelatorio === 'financeiro' || tipoRelatorio === 'rentabilidade') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Filter className="inline h-4 w-4 mr-1" />
                Agrupar Dados Por
              </label>
              <select
                value={options.agruparPor}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  agruparPor: e.target.value as 'mes' | 'imovel' | 'categoria'
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="mes">Mês</option>
                <option value="imovel">Imóvel</option>
                <option value="categoria">Categoria</option>
              </select>
            </div>
          )}

          {/* Filtros adicionais */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Filtros Adicionais (Opcional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cidade</label>
                <input
                  type="text"
                  placeholder="Filtrar por cidade"
                  value={options.filtros?.cidade || ''}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    filtros: { ...prev.filtros, cidade: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de Imóvel</label>
                <select
                  value={options.filtros?.tipo || ''}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    filtros: { ...prev.filtros, tipo: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Todos os tipos</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="comercial">Comercial</option>
                  <option value="terreno">Terreno</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mensagens de status */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Exportando...
                </>
              ) : (
                <>
                  {getFormatoIcon(options.formato)}
                  <span className="ml-2">Exportar {options.formato.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>

          {/* Preview das configurações */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Resumo da Exportação</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Formato:</strong> {options.formato.toUpperCase()}</p>
              <p><strong>Período:</strong> {new Date(options.periodo.inicio).toLocaleDateString('pt-BR')} até {new Date(options.periodo.fim).toLocaleDateString('pt-BR')}</p>
              <p><strong>Gráficos:</strong> {options.incluirGraficos ? 'Incluídos' : 'Não incluídos'}</p>
              <p><strong>Detalhes:</strong> {options.incluirDetalhes ? 'Incluídos' : 'Não incluídos'}</p>
              {options.agruparPor && (
                <p><strong>Agrupamento:</strong> Por {options.agruparPor}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}