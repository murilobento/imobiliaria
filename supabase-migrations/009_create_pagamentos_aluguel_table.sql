-- Criar tabela de pagamentos de aluguel
CREATE TABLE IF NOT EXISTS pagamentos_aluguel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID REFERENCES contratos_aluguel(id) ON DELETE CASCADE NOT NULL,
  mes_referencia DATE NOT NULL, -- Primeiro dia do mês de referência
  valor_devido DECIMAL(10,2) NOT NULL CHECK (valor_devido > 0),
  valor_pago DECIMAL(10,2) CHECK (valor_pago >= 0),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_juros DECIMAL(10,2) DEFAULT 0 CHECK (valor_juros >= 0),
  valor_multa DECIMAL(10,2) DEFAULT 0 CHECK (valor_multa >= 0),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_payment_date CHECK (
    data_pagamento IS NULL OR 
    (status = 'pago' AND data_pagamento IS NOT NULL)
  ),
  CONSTRAINT valid_paid_amount CHECK (
    valor_pago IS NULL OR 
    (status = 'pago' AND valor_pago > 0)
  ),
  CONSTRAINT unique_payment_per_contract_month UNIQUE (contrato_id, mes_referencia)
);

-- Índices otimizados para performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_contrato_id ON pagamentos_aluguel(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mes_referencia ON pagamentos_aluguel(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_vencimento ON pagamentos_aluguel(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_pagamento ON pagamentos_aluguel(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos_aluguel(status);

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_pagamentos_status_vencimento 
  ON pagamentos_aluguel(status, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_contrato_status 
  ON pagamentos_aluguel(contrato_id, status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mes_status 
  ON pagamentos_aluguel(mes_referencia, status);

-- Índice para relatórios de inadimplência (pagamentos atrasados)
CREATE INDEX IF NOT EXISTS idx_pagamentos_atrasados 
  ON pagamentos_aluguel(data_vencimento, status) 
  WHERE status IN ('pendente', 'atrasado');

-- Habilitar Row Level Security
ALTER TABLE pagamentos_aluguel ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso completo para usuários autenticados
CREATE POLICY "Permitir acesso completo para usuários autenticados" ON pagamentos_aluguel
  FOR ALL USING (auth.role() = 'authenticated');

-- Política para permitir acesso baseado no contrato (através do user_id do contrato)
CREATE POLICY "Permitir acesso baseado no contrato" ON pagamentos_aluguel
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contratos_aluguel 
      WHERE id = pagamentos_aluguel.contrato_id 
      AND user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_pagamentos_aluguel_updated_at 
  BEFORE UPDATE ON pagamentos_aluguel 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar status automaticamente baseado na data
CREATE OR REPLACE FUNCTION update_pagamento_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está sendo marcado como pago, definir data_pagamento se não foi definida
  IF NEW.status = 'pago' AND OLD.status != 'pago' THEN
    IF NEW.data_pagamento IS NULL THEN
      NEW.data_pagamento = CURRENT_DATE;
    END IF;
  END IF;
  
  -- Se não está mais pago, limpar data_pagamento
  IF NEW.status != 'pago' AND OLD.status = 'pago' THEN
    NEW.data_pagamento = NULL;
  END IF;
  
  -- Atualizar status para atrasado se passou do vencimento e ainda está pendente
  IF NEW.status = 'pendente' AND NEW.data_vencimento < CURRENT_DATE THEN
    NEW.status = 'atrasado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status automaticamente
CREATE TRIGGER update_pagamento_status_trigger
  BEFORE UPDATE ON pagamentos_aluguel
  FOR EACH ROW
  EXECUTE FUNCTION update_pagamento_status();

-- Função para processar vencimentos diários (será chamada por job/cron)
CREATE OR REPLACE FUNCTION processar_vencimentos_diarios()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Atualizar pagamentos pendentes que passaram do vencimento para atrasado
  UPDATE pagamentos_aluguel 
  SET status = 'atrasado', updated_at = NOW()
  WHERE status = 'pendente' 
  AND data_vencimento < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;