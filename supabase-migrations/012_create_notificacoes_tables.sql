-- Criação das tabelas para sistema de notificações

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('vencimento_proximo', 'pagamento_atrasado', 'contrato_vencendo', 'lembrete_cobranca')),
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  prioridade VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'lida', 'cancelada')),
  data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
  data_envio TIMESTAMP,
  data_leitura TIMESTAMP,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  -- Relacionamentos opcionais
  contrato_id UUID REFERENCES contratos_aluguel(id),
  pagamento_id UUID REFERENCES pagamentos_aluguel(id),
  -- Metadados em JSON
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de configurações de notificação
CREATE TABLE IF NOT EXISTS configuracoes_notificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  -- Configurações de vencimento
  dias_aviso_vencimento INTEGER NOT NULL DEFAULT 3 CHECK (dias_aviso_vencimento >= 0 AND dias_aviso_vencimento <= 30),
  notificar_vencimento_proximo BOOLEAN NOT NULL DEFAULT true,
  -- Configurações de atraso
  notificar_pagamento_atrasado BOOLEAN NOT NULL DEFAULT true,
  dias_lembrete_atraso INTEGER NOT NULL DEFAULT 7 CHECK (dias_lembrete_atraso >= 1 AND dias_lembrete_atraso <= 30),
  max_lembretes_atraso INTEGER NOT NULL DEFAULT 3 CHECK (max_lembretes_atraso >= 1 AND max_lembretes_atraso <= 10),
  -- Configurações de contrato
  dias_aviso_contrato_vencendo INTEGER NOT NULL DEFAULT 30 CHECK (dias_aviso_contrato_vencendo >= 0 AND dias_aviso_contrato_vencendo <= 90),
  notificar_contrato_vencendo BOOLEAN NOT NULL DEFAULT true,
  -- Configurações gerais
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data_criacao ON notificacoes(data_criacao);
CREATE INDEX IF NOT EXISTS idx_notificacoes_contrato_id ON notificacoes(contrato_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_pagamento_id ON notificacoes(pagamento_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_status ON notificacoes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_tipo ON notificacoes(user_id, tipo);

CREATE INDEX IF NOT EXISTS idx_configuracoes_notificacao_user_id ON configuracoes_notificacao(user_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_notificacao_ativo ON configuracoes_notificacao(ativo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS update_notificacoes_updated_at ON notificacoes;
CREATE TRIGGER update_notificacoes_updated_at
    BEFORE UPDATE ON notificacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_notificacao_updated_at ON configuracoes_notificacao;
CREATE TRIGGER update_configuracoes_notificacao_updated_at
    BEFORE UPDATE ON configuracoes_notificacao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) para notificacoes
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias notificações
CREATE POLICY "Users can view own notifications" ON notificacoes
    FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários criarem suas próprias notificações
CREATE POLICY "Users can create own notifications" ON notificacoes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para usuários atualizarem suas próprias notificações
CREATE POLICY "Users can update own notifications" ON notificacoes
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para usuários deletarem suas próprias notificações
CREATE POLICY "Users can delete own notifications" ON notificacoes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS (Row Level Security) para configuracoes_notificacao
ALTER TABLE configuracoes_notificacao ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias configurações
CREATE POLICY "Users can view own notification settings" ON configuracoes_notificacao
    FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários criarem suas próprias configurações
CREATE POLICY "Users can create own notification settings" ON configuracoes_notificacao
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para usuários atualizarem suas próprias configurações
CREATE POLICY "Users can update own notification settings" ON configuracoes_notificacao
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para usuários deletarem suas próprias configurações
CREATE POLICY "Users can delete own notification settings" ON configuracoes_notificacao
    FOR DELETE USING (auth.uid() = user_id);

-- Comentários nas tabelas
COMMENT ON TABLE notificacoes IS 'Tabela para armazenar notificações do sistema financeiro';
COMMENT ON TABLE configuracoes_notificacao IS 'Tabela para configurações personalizáveis de notificações por usuário';

-- Comentários nas colunas principais
COMMENT ON COLUMN notificacoes.tipo IS 'Tipo da notificação: vencimento_proximo, pagamento_atrasado, contrato_vencendo, lembrete_cobranca';
COMMENT ON COLUMN notificacoes.prioridade IS 'Prioridade da notificação: baixa, media, alta, urgente';
COMMENT ON COLUMN notificacoes.status IS 'Status da notificação: pendente, enviada, lida, cancelada';
COMMENT ON COLUMN notificacoes.metadata IS 'Dados adicionais da notificação em formato JSON';

COMMENT ON COLUMN configuracoes_notificacao.dias_aviso_vencimento IS 'Quantos dias antes do vencimento enviar notificação';
COMMENT ON COLUMN configuracoes_notificacao.dias_lembrete_atraso IS 'Intervalo em dias para enviar lembretes de atraso';
COMMENT ON COLUMN configuracoes_notificacao.max_lembretes_atraso IS 'Máximo de lembretes a enviar por pagamento atrasado';
COMMENT ON COLUMN configuracoes_notificacao.dias_aviso_contrato_vencendo IS 'Quantos dias antes do fim do contrato enviar notificação';