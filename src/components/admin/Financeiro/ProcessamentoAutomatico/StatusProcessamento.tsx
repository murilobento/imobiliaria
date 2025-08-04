'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Calendar,
  TrendingUp,
  Bell,
  FileText,
  Activity
} from 'lucide-react';

interface EstatisticasProcessamento {
  ultimo_processamento?: string;
  pagamentos_processados: number;
  pagamentos_vencidos: number;
  notificacoes_enviadas: number;
  tempo_execucao_ms: number;
  sucesso: boolean;
}

interface LogAuditoria {
  id: string;
  operacao: string;
  tipo: 'processamento_vencimentos' | 'atualizacao_status' | 'envio_notificacoes' | 'calculo_juros';
  resultado: 'sucesso' | 'erro' | 'parcial';
  mensagem?: string;
  data_execucao: string;
  tempo_execucao_ms?: number;
  registros_afetados?: number;
}

export default function StatusProcessamento() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasProcessamento | null>(null);
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar estatísticas do último processamento
      const responseEstatisticas = await fetch('/api/processamento-automatico');
      if (!responseEstatisticas.ok) {
        throw new Error('Erro ao carregar estatísticas');
      }
      const dataEstatisticas = await responseEstatisticas.json();
      setEstatisticas(dataEstatisticas.data);

      // Carregar logs recentes
      const responseLogs = await fetch('/api/logs-auditoria?limit=10&page=1');
      if (!responseLogs.ok) {
        throw new Error('Erro ao carregar logs');
      }
      const dataLogs = await responseLogs.json();
      setLogs(dataLogs.data);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const executarProcessamento = async (forcar: boolean = false) => {
    try {
      setProcessando(true);
      setError(null);

      const response = await fetch('/api/pagamentos/processar-vencimentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processamentoCompleto: true,
          forcarExecucao: forcar
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro no processamento');
      }

      // Recarregar dados após processamento
      await carregarDados();

      // Mostrar resultado
      alert(data.message);

    } catch (error) {
      console.error('Erro no processamento:', error);
      setError(error instanceof Error ? error.message : 'Erro no processamento');
    } finally {
      setProcessando(false);
    }
  };

  useEffect(() => {
    carregarDados();
    
    // Atualizar dados a cada 5 minutos
    const interval = setInterval(carregarDados, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatarTempo = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const formatarDataHora = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR');
  };

  const getStatusBadge = (resultado: string) => {
    switch (resultado) {
      case 'sucesso':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Sucesso
        </Badge>;
      case 'erro':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Erro
        </Badge>;
      case 'parcial':
        return <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Parcial
        </Badge>;
      default:
        return <Badge variant="secondary">{resultado}</Badge>;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'processamento_vencimentos':
        return <Calendar className="w-4 h-4" />;
      case 'atualizacao_status':
        return <RefreshCw className="w-4 h-4" />;
      case 'envio_notificacoes':
        return <Bell className="w-4 h-4" />;
      case 'calculo_juros':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Carregando dados do processamento...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-700">
              <XCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status do Último Processamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status do Processamento Automático
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estatisticas ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {estatisticas.pagamentos_processados}
                  </div>
                  <div className="text-sm text-blue-700">Pagamentos Processados</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {estatisticas.pagamentos_vencidos}
                  </div>
                  <div className="text-sm text-orange-700">Pagamentos Vencidos</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {estatisticas.notificacoes_enviadas}
                  </div>
                  <div className="text-sm text-purple-700">Notificações Enviadas</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatarTempo(estatisticas.tempo_execucao_ms)}
                  </div>
                  <div className="text-sm text-green-700">Tempo de Execução</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Último processamento: {' '}
                      {estatisticas.ultimo_processamento 
                        ? formatarDataHora(estatisticas.ultimo_processamento)
                        : 'Nunca executado'
                      }
                    </span>
                  </div>
                  {getStatusBadge(estatisticas.sucesso ? 'sucesso' : 'erro')}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => carregarDados()}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => executarProcessamento(false)}
                    disabled={processando}
                  >
                    {processando ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4 mr-2" />
                    )}
                    Executar Agora
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => executarProcessamento(true)}
                    disabled={processando}
                  >
                    Forçar Execução
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhum processamento encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs Recentes de Auditoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTipoIcon(log.tipo)}
                    <div>
                      <div className="font-medium text-sm">{log.operacao}</div>
                      <div className="text-xs text-gray-600">
                        {formatarDataHora(log.data_execucao)}
                        {log.tempo_execucao_ms && (
                          <span className="ml-2">
                            • {formatarTempo(log.tempo_execucao_ms)}
                          </span>
                        )}
                        {log.registros_afetados && (
                          <span className="ml-2">
                            • {log.registros_afetados} registros
                          </span>
                        )}
                      </div>
                      {log.mensagem && (
                        <div className="text-xs text-gray-500 mt-1">
                          {log.mensagem}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(log.resultado)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhum log encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}