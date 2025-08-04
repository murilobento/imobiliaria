// Tipos para sistema de notificações

export const NOTIFICACAO_TIPO = {
  VENCIMENTO_PROXIMO: 'vencimento_proximo',
  PAGAMENTO_ATRASADO: 'pagamento_atrasado',
  CONTRATO_VENCENDO: 'contrato_vencendo',
  LEMBRETE_COBRANCA: 'lembrete_cobranca'
} as const;

export const NOTIFICACAO_STATUS = {
  PENDENTE: 'pendente',
  ENVIADA: 'enviada',
  LIDA: 'lida',
  CANCELADA: 'cancelada'
} as const;

export const NOTIFICACAO_PRIORIDADE = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente'
} as const;

export type NotificacaoTipo = typeof NOTIFICACAO_TIPO[keyof typeof NOTIFICACAO_TIPO];
export type NotificacaoStatus = typeof NOTIFICACAO_STATUS[keyof typeof NOTIFICACAO_STATUS];
export type NotificacaoPrioridade = typeof NOTIFICACAO_PRIORIDADE[keyof typeof NOTIFICACAO_PRIORIDADE];

// Interface para Notificação
export interface Notificacao {
  id?: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  prioridade: NotificacaoPrioridade;
  status: NotificacaoStatus;
  data_criacao: string;
  data_envio?: string;
  data_leitura?: string;
  user_id: string;
  // Dados relacionados
  contrato_id?: string;
  pagamento_id?: string;
  // Metadados
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Interface para Configuração de Notificações
export interface ConfiguracaoNotificacao {
  id?: string;
  user_id: string;
  // Configurações de vencimento
  dias_aviso_vencimento: number; // Dias antes do vencimento para notificar
  notificar_vencimento_proximo: boolean;
  // Configurações de atraso
  notificar_pagamento_atrasado: boolean;
  dias_lembrete_atraso: number; // Intervalo em dias para lembretes de atraso
  max_lembretes_atraso: number; // Máximo de lembretes por pagamento
  // Configurações de contrato
  dias_aviso_contrato_vencendo: number; // Dias antes do fim do contrato
  notificar_contrato_vencendo: boolean;
  // Configurações gerais
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tipos para criação
export interface CreateNotificacaoData {
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  prioridade: NotificacaoPrioridade;
  user_id: string;
  contrato_id?: string;
  pagamento_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateConfiguracaoNotificacaoData {
  user_id: string;
  dias_aviso_vencimento?: number;
  notificar_vencimento_proximo?: boolean;
  notificar_pagamento_atrasado?: boolean;
  dias_lembrete_atraso?: number;
  max_lembretes_atraso?: number;
  dias_aviso_contrato_vencendo?: number;
  notificar_contrato_vencendo?: boolean;
  ativo?: boolean;
}

// Tipos para atualização
export interface UpdateNotificacaoData {
  id: string;
  status?: NotificacaoStatus;
  data_envio?: string;
  data_leitura?: string;
}

export interface UpdateConfiguracaoNotificacaoData {
  id: string;
  dias_aviso_vencimento?: number;
  notificar_vencimento_proximo?: boolean;
  notificar_pagamento_atrasado?: boolean;
  dias_lembrete_atraso?: number;
  max_lembretes_atraso?: number;
  dias_aviso_contrato_vencendo?: number;
  notificar_contrato_vencendo?: boolean;
  ativo?: boolean;
}

// Tipos para processamento de notificações
export interface ProcessamentoNotificacao {
  notificacoes_criadas: number;
  notificacoes_enviadas: number;
  erros: string[];
  detalhes: {
    vencimentos_proximos: number;
    pagamentos_atrasados: number;
    contratos_vencendo: number;
    lembretes_enviados: number;
  };
}

// Tipos para consultas
export interface NotificacaoFilters {
  tipo?: NotificacaoTipo;
  status?: NotificacaoStatus;
  prioridade?: NotificacaoPrioridade;
  user_id?: string;
  contrato_id?: string;
  data_inicio?: string;
  data_fim?: string;
  apenas_nao_lidas?: boolean;
}

// Constantes para configurações padrão
export const CONFIGURACAO_NOTIFICACAO_PADRAO = {
  DIAS_AVISO_VENCIMENTO: 3,
  NOTIFICAR_VENCIMENTO_PROXIMO: true,
  NOTIFICAR_PAGAMENTO_ATRASADO: true,
  DIAS_LEMBRETE_ATRASO: 7,
  MAX_LEMBRETES_ATRASO: 3,
  DIAS_AVISO_CONTRATO_VENCENDO: 30,
  NOTIFICAR_CONTRATO_VENCENDO: true,
  ATIVO: true
} as const;

// Labels para exibição
export const NOTIFICACAO_TIPO_LABELS: Record<NotificacaoTipo, string> = {
  [NOTIFICACAO_TIPO.VENCIMENTO_PROXIMO]: 'Vencimento Próximo',
  [NOTIFICACAO_TIPO.PAGAMENTO_ATRASADO]: 'Pagamento Atrasado',
  [NOTIFICACAO_TIPO.CONTRATO_VENCENDO]: 'Contrato Vencendo',
  [NOTIFICACAO_TIPO.LEMBRETE_COBRANCA]: 'Lembrete de Cobrança'
};

export const NOTIFICACAO_STATUS_LABELS: Record<NotificacaoStatus, string> = {
  [NOTIFICACAO_STATUS.PENDENTE]: 'Pendente',
  [NOTIFICACAO_STATUS.ENVIADA]: 'Enviada',
  [NOTIFICACAO_STATUS.LIDA]: 'Lida',
  [NOTIFICACAO_STATUS.CANCELADA]: 'Cancelada'
};

export const NOTIFICACAO_PRIORIDADE_LABELS: Record<NotificacaoPrioridade, string> = {
  [NOTIFICACAO_PRIORIDADE.BAIXA]: 'Baixa',
  [NOTIFICACAO_PRIORIDADE.MEDIA]: 'Média',
  [NOTIFICACAO_PRIORIDADE.ALTA]: 'Alta',
  [NOTIFICACAO_PRIORIDADE.URGENTE]: 'Urgente'
};

// Cores para prioridades
export const NOTIFICACAO_PRIORIDADE_CORES: Record<NotificacaoPrioridade, string> = {
  [NOTIFICACAO_PRIORIDADE.BAIXA]: 'text-gray-600 bg-gray-100',
  [NOTIFICACAO_PRIORIDADE.MEDIA]: 'text-blue-600 bg-blue-100',
  [NOTIFICACAO_PRIORIDADE.ALTA]: 'text-orange-600 bg-orange-100',
  [NOTIFICACAO_PRIORIDADE.URGENTE]: 'text-red-600 bg-red-100'
};