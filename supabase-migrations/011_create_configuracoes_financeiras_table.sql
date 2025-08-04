-- Criar tabela de configurações financeiras
CREATE TABLE IF NOT EXISTS configuracoes_financeiras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  taxa_juros_mensal DECIMAL(5,4) DEFAULT 0.01 CHECK (taxa_juros_mensal >= 0 AND taxa_juros_mensal <= 1), -- 1% ao mês máximo 100%
  taxa_multa DECIMAL(5,4) DEFAULT 0.02 CHECK (taxa_multa >= 0 AND taxa_multa <= 1), -- 2% máximo 100%
  taxa_comissao DECIMAL(5,4) DEFAULT 0.10 CHECK (taxa_comissao >= 0 AND taxa_comissao <= 1), -- 10% máximo 100%
  dias_carencia INTEGER DEFAULT 5 CHECK (dias_carencia >= 0 AND dias_carencia <= 30),
  dias_notificacao_vencimento INTEGER DEFAULT 3 CHECK (dias_notificacao_vencimento >= 0 AND dias_notificacao_vencimento <= 30),
  dias_notificacao_renovacao INTEGER DEFAULT 30 CHECK (dias_notificacao_renovacao >= 0 AND dias_notificacao_renovacao <= 365),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para garantir apenas uma configuração por usuário
  CONSTRAINT unique_config_per_user UNIQUE (user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_user_id ON configuracoes_financeiras(user_id);

-- Habilitar Row Level Security
ALTER TABLE configuracoes_financeiras ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso completo para usuários autenticados
CREATE POLICY "Permitir acesso completo para usuários autenticados" ON configuracoes_financeiras
  FOR ALL USING (auth.role() = 'authenticated');

-- Política para permitir acesso apenas às próprias configurações (baseado em user_id)
CREATE POLICY "Permitir acesso às próprias configurações" ON configuracoes_financeiras
  FOR ALL USING (user_id = auth.uid());

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_configuracoes_financeiras_updated_at 
  BEFORE UPDATE ON configuracoes_financeiras 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para obter configurações financeiras (com fallback para padrões)
CREATE OR REPLACE FUNCTION get_configuracoes_financeiras(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  taxa_juros_mensal DECIMAL(5,4),
  taxa_multa DECIMAL(5,4),
  taxa_comissao DECIMAL(5,4),
  dias_carencia INTEGER,
  dias_notificacao_vencimento INTEGER,
  dias_notificacao_renovacao INTEGER
) AS $$
BEGIN
  -- Tentar buscar configurações do usuário específico
  IF p_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      cf.taxa_juros_mensal,
      cf.taxa_multa,
      cf.taxa_comissao,
      cf.dias_carencia,
      cf.dias_notificacao_vencimento,
      cf.dias_notificacao_renovacao
    FROM configuracoes_financeiras cf
    WHERE cf.user_id = p_user_id;
    
    -- Se encontrou configurações, retornar
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Se não encontrou ou não foi especificado user_id, retornar configurações padrão
  RETURN QUERY
  SELECT 
    0.01::DECIMAL(5,4) as taxa_juros_mensal,
    0.02::DECIMAL(5,4) as taxa_multa,
    0.10::DECIMAL(5,4) as taxa_comissao,
    5::INTEGER as dias_carencia,
    3::INTEGER as dias_notificacao_vencimento,
    30::INTEGER as dias_notificacao_renovacao;
END;
$$ LANGUAGE plpgsql;

-- Função para criar configurações padrão para um usuário
CREATE OR REPLACE FUNCTION create_default_configuracoes_financeiras(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  config_id UUID;
BEGIN
  -- Verificar se já existe configuração para o usuário
  SELECT id INTO config_id 
  FROM configuracoes_financeiras 
  WHERE user_id = p_user_id;
  
  -- Se não existe, criar configuração padrão
  IF config_id IS NULL THEN
    INSERT INTO configuracoes_financeiras (
      user_id,
      taxa_juros_mensal,
      taxa_multa,
      taxa_comissao,
      dias_carencia,
      dias_notificacao_vencimento,
      dias_notificacao_renovacao
    ) VALUES (
      p_user_id,
      0.01, -- 1% ao mês
      0.02, -- 2% de multa
      0.10, -- 10% de comissão
      5,    -- 5 dias de carência
      3,    -- 3 dias antes do vencimento
      30    -- 30 dias antes da renovação
    ) RETURNING id INTO config_id;
  END IF;
  
  RETURN config_id;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular juros e multa
CREATE OR REPLACE FUNCTION calcular_juros_multa(
  p_valor_devido DECIMAL(10,2),
  p_dias_atraso INTEGER,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  valor_juros DECIMAL(10,2),
  valor_multa DECIMAL(10,2),
  valor_total DECIMAL(10,2)
) AS $$
DECLARE
  config RECORD;
BEGIN
  -- Obter configurações financeiras
  SELECT * INTO config FROM get_configuracoes_financeiras(p_user_id) LIMIT 1;
  
  -- Se não há atraso, retornar zeros
  IF p_dias_atraso <= config.dias_carencia THEN
    RETURN QUERY SELECT 
      0.00::DECIMAL(10,2) as valor_juros,
      0.00::DECIMAL(10,2) as valor_multa,
      p_valor_devido as valor_total;
    RETURN;
  END IF;
  
  -- Calcular juros (proporcional aos dias de atraso)
  DECLARE
    juros DECIMAL(10,2);
    multa DECIMAL(10,2);
    total DECIMAL(10,2);
  BEGIN
    -- Juros = valor * taxa_mensal * (dias_atraso / 30)
    juros := p_valor_devido * config.taxa_juros_mensal * (p_dias_atraso::DECIMAL / 30);
    
    -- Multa = valor * taxa_multa (aplicada uma vez)
    multa := p_valor_devido * config.taxa_multa;
    
    -- Total = valor original + juros + multa
    total := p_valor_devido + juros + multa;
    
    RETURN QUERY SELECT juros, multa, total;
  END;
END;
$$ LANGUAGE plpgsql;

-- Inserir configuração padrão global (para casos onde não há usuário específico)
INSERT INTO configuracoes_financeiras (
  id,
  taxa_juros_mensal,
  taxa_multa,
  taxa_comissao,
  dias_carencia,
  dias_notificacao_vencimento,
  dias_notificacao_renovacao,
  user_id
) VALUES (
  gen_random_uuid(),
  0.01, -- 1% ao mês
  0.02, -- 2% de multa
  0.10, -- 10% de comissão
  5,    -- 5 dias de carência
  3,    -- 3 dias antes do vencimento
  30,   -- 30 dias antes da renovação
  NULL  -- Configuração global
) ON CONFLICT (user_id) DO NOTHING;