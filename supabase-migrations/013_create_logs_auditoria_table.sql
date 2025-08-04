-- Criar tabela de logs de auditoria para operações automáticas
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('processamento_vencimentos', 'atualizacao_status', 'envio_notificacoes', 'calculo_juros')),
  detalhes JSONB NOT NULL DEFAULT '{}',
  resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('sucesso', 'erro', 'parcial')),
  mensagem TEXT,
  user_id UUID REFERENCES auth.users(id),
  data_execucao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  tempo_execucao_ms INTEGER,
  registros_afetados INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_data_execucao ON logs_auditoria(data_execucao DESC);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_tipo ON logs_auditoria(tipo);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_resultado ON logs_auditoria(resultado);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_operacao ON logs_auditoria(operacao);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_user_id ON logs_auditoria(user_id);

-- Criar índice composto para consultas comuns
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_tipo_data ON logs_auditoria(tipo, data_execucao DESC);

-- Comentários para documentação
COMMENT ON TABLE logs_auditoria IS 'Tabela para armazenar logs de auditoria das operações automáticas do sistema';
COMMENT ON COLUMN logs_auditoria.operacao IS 'Nome da operação executada (ex: processamento_vencimentos, envio_notificacoes)';
COMMENT ON COLUMN logs_auditoria.tipo IS 'Categoria da operação para agrupamento e filtros';
COMMENT ON COLUMN logs_auditoria.detalhes IS 'Dados detalhados da operação em formato JSON';
COMMENT ON COLUMN logs_auditoria.resultado IS 'Resultado da operação: sucesso, erro ou parcial';
COMMENT ON COLUMN logs_auditoria.mensagem IS 'Mensagem descritiva do resultado da operação';
COMMENT ON COLUMN logs_auditoria.tempo_execucao_ms IS 'Tempo de execução da operação em milissegundos';
COMMENT ON COLUMN logs_auditoria.registros_afetados IS 'Número de registros afetados pela operação';

-- Política de segurança (RLS)
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura apenas para usuários autenticados
CREATE POLICY "Usuários podem ver logs de auditoria" ON logs_auditoria
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção apenas pelo sistema (service role)
CREATE POLICY "Sistema pode inserir logs de auditoria" ON logs_auditoria
  FOR INSERT WITH CHECK (true);

-- Função para limpeza automática de logs antigos (opcional)
CREATE OR REPLACE FUNCTION limpar_logs_auditoria_antigos()
RETURNS INTEGER AS $$
DECLARE
  registros_removidos INTEGER;
BEGIN
  -- Remove logs mais antigos que 90 dias
  DELETE FROM logs_auditoria 
  WHERE data_execucao < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS registros_removidos = ROW_COUNT;
  
  RETURN registros_removidos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário na função
COMMENT ON FUNCTION limpar_logs_auditoria_antigos() IS 'Remove logs de auditoria mais antigos que 90 dias';