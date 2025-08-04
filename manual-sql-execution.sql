-- ====================================================================
-- EXECUTE ESTE SQL NO PAINEL DO SUPABASE PARA RESOLVER OS ERROS HTTP 400
-- ====================================================================
-- Acesse: https://supabase.com/dashboard -> Seu projeto -> SQL Editor
-- Cole este código e execute

-- ====================================================================
-- 1. CRIAR TABELA CONTRATOS_ALUGUEL
-- ====================================================================

-- Criar tabela de contratos de aluguel
CREATE TABLE IF NOT EXISTS contratos_aluguel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id UUID REFERENCES imoveis(id) NOT NULL,
  inquilino_id UUID REFERENCES clientes(id) NOT NULL,
  proprietario_id UUID REFERENCES clientes(id),
  valor_aluguel DECIMAL(10,2) NOT NULL CHECK (valor_aluguel > 0),
  valor_deposito DECIMAL(10,2) CHECK (valor_deposito >= 0),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado', 'suspenso')),
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_contract_dates CHECK (data_fim > data_inicio)
);

-- Criar índice único parcial apenas para contratos ativos
CREATE UNIQUE INDEX IF NOT EXISTS idx_contratos_imovel_ativo 
  ON contratos_aluguel(imovel_id) 
  WHERE status = 'ativo';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contratos_imovel_id ON contratos_aluguel(imovel_id);
CREATE INDEX IF NOT EXISTS idx_contratos_inquilino_id ON contratos_aluguel(inquilino_id);
CREATE INDEX IF NOT EXISTS idx_contratos_proprietario_id ON contratos_aluguel(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos_aluguel(status);
CREATE INDEX IF NOT EXISTS idx_contratos_data_inicio ON contratos_aluguel(data_inicio);
CREATE INDEX IF NOT EXISTS idx_contratos_data_fim ON contratos_aluguel(data_fim);
CREATE INDEX IF NOT EXISTS idx_contratos_user_id ON contratos_aluguel(user_id);

-- Habilitar Row Level Security
ALTER TABLE contratos_aluguel ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso completo para usuários autenticados
CREATE POLICY "Permitir acesso completo para usuários autenticados" ON contratos_aluguel
  FOR ALL USING (auth.role() = 'authenticated');

-- Política para permitir acesso apenas aos próprios contratos (baseado em user_id)
CREATE POLICY "Permitir acesso aos próprios contratos" ON contratos_aluguel
  FOR ALL USING (user_id = auth.uid());

-- ====================================================================
-- 2. CRIAR TABELA PAGAMENTOS_ALUGUEL
-- ====================================================================

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

-- ====================================================================
-- 3. CRIAR TABELA DESPESAS_IMOVEIS
-- ====================================================================

-- Criar tabela de despesas dos imóveis
CREATE TABLE IF NOT EXISTS despesas_imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id UUID REFERENCES imoveis(id) NOT NULL,
  contrato_id UUID REFERENCES contratos_aluguel(id),
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN (
    'manutencao', 'reforma', 'limpeza', 'seguranca', 'administracao',
    'seguro', 'iptu', 'condominio', 'agua', 'luz', 'gas', 'internet',
    'telefone', 'outros'
  )),
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  responsavel VARCHAR(20) DEFAULT 'proprietario' CHECK (responsavel IN ('proprietario', 'inquilino', 'imobiliaria')),
  recorrente BOOLEAN DEFAULT false,
  frequencia_meses INTEGER CHECK (frequencia_meses > 0),
  observacoes TEXT,
  anexos JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_despesas_imovel_id ON despesas_imoveis(imovel_id);
CREATE INDEX IF NOT EXISTS idx_despesas_contrato_id ON despesas_imoveis(contrato_id);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas_imoveis(categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas_imoveis(status);
CREATE INDEX IF NOT EXISTS idx_despesas_data_vencimento ON despesas_imoveis(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_despesas_data_pagamento ON despesas_imoveis(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_despesas_responsavel ON despesas_imoveis(responsavel);
CREATE INDEX IF NOT EXISTS idx_despesas_recorrente ON despesas_imoveis(recorrente);
CREATE INDEX IF NOT EXISTS idx_despesas_user_id ON despesas_imoveis(user_id);

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_despesas_imovel_status 
  ON despesas_imoveis(imovel_id, status);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria_status 
  ON despesas_imoveis(categoria, status);
CREATE INDEX IF NOT EXISTS idx_despesas_vencimento_status 
  ON despesas_imoveis(data_vencimento, status);

-- Habilitar Row Level Security
ALTER TABLE despesas_imoveis ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso completo para usuários autenticados
CREATE POLICY "Permitir acesso completo para usuários autenticados" ON despesas_imoveis
  FOR ALL USING (auth.role() = 'authenticated');

-- Política para permitir acesso apenas às próprias despesas (baseado em user_id)
CREATE POLICY "Permitir acesso às próprias despesas" ON despesas_imoveis
  FOR ALL USING (user_id = auth.uid());

-- ====================================================================
-- 4. FUNÇÕES E TRIGGERS AUXILIARES
-- ====================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_contratos_aluguel_updated_at 
  BEFORE UPDATE ON contratos_aluguel 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagamentos_aluguel_updated_at 
  BEFORE UPDATE ON pagamentos_aluguel 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_despesas_imoveis_updated_at 
  BEFORE UPDATE ON despesas_imoveis 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- FINALIZADO! 
-- ====================================================================
-- Após executar este SQL, as tabelas estarão criadas e os erros HTTP 400
-- na aplicação devem ser resolvidos.
-- ====================================================================