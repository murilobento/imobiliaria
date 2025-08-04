-- Criar tabela de despesas dos imóveis
CREATE TABLE IF NOT EXISTS despesas_imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id UUID REFERENCES imoveis(id) NOT NULL,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN (
    'manutencao', 
    'impostos', 
    'seguros', 
    'administracao', 
    'condominio',
    'agua',
    'energia',
    'gas',
    'internet',
    'limpeza',
    'jardinagem',
    'seguranca',
    'outros'
  )),
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  data_despesa DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_payment_status CHECK (
    (status = 'pago' AND data_pagamento IS NOT NULL) OR
    (status != 'pago' AND data_pagamento IS NULL)
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_despesas_imovel_id ON despesas_imoveis(imovel_id);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas_imoveis(categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_data_despesa ON despesas_imoveis(data_despesa);
CREATE INDEX IF NOT EXISTS idx_despesas_data_pagamento ON despesas_imoveis(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas_imoveis(status);
CREATE INDEX IF NOT EXISTS idx_despesas_user_id ON despesas_imoveis(user_id);

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_despesas_imovel_categoria 
  ON despesas_imoveis(imovel_id, categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_imovel_data 
  ON despesas_imoveis(imovel_id, data_despesa);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria_data 
  ON despesas_imoveis(categoria, data_despesa);
CREATE INDEX IF NOT EXISTS idx_despesas_status_data 
  ON despesas_imoveis(status, data_despesa);

-- Índice para relatórios mensais/anuais
CREATE INDEX IF NOT EXISTS idx_despesas_mes_ano 
  ON despesas_imoveis(EXTRACT(YEAR FROM data_despesa), EXTRACT(MONTH FROM data_despesa));

-- Habilitar Row Level Security
ALTER TABLE despesas_imoveis ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso completo para usuários autenticados
CREATE POLICY "Permitir acesso completo para usuários autenticados" ON despesas_imoveis
  FOR ALL USING (auth.role() = 'authenticated');

-- Política para permitir acesso apenas às próprias despesas (baseado em user_id)
CREATE POLICY "Permitir acesso às próprias despesas" ON despesas_imoveis
  FOR ALL USING (user_id = auth.uid());

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_despesas_imoveis_updated_at 
  BEFORE UPDATE ON despesas_imoveis 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para validar se o imóvel existe
CREATE OR REPLACE FUNCTION validate_imovel_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o imóvel existe
  IF NOT EXISTS (SELECT 1 FROM imoveis WHERE id = NEW.imovel_id) THEN
    RAISE EXCEPTION 'Imóvel não encontrado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar existência do imóvel
CREATE TRIGGER validate_imovel_exists_trigger
  BEFORE INSERT OR UPDATE ON despesas_imoveis
  FOR EACH ROW
  EXECUTE FUNCTION validate_imovel_exists();

-- Função para atualizar data de pagamento automaticamente
CREATE OR REPLACE FUNCTION update_despesa_pagamento()
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar data de pagamento automaticamente
CREATE TRIGGER update_despesa_pagamento_trigger
  BEFORE UPDATE ON despesas_imoveis
  FOR EACH ROW
  EXECUTE FUNCTION update_despesa_pagamento();

-- View para relatórios de despesas por categoria
CREATE OR REPLACE VIEW vw_despesas_por_categoria AS
SELECT 
  categoria,
  COUNT(*) as total_despesas,
  SUM(valor) as valor_total,
  AVG(valor) as valor_medio,
  MIN(valor) as valor_minimo,
  MAX(valor) as valor_maximo,
  COUNT(CASE WHEN status = 'pago' THEN 1 END) as despesas_pagas,
  SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as valor_pago
FROM despesas_imoveis
GROUP BY categoria;

-- View para relatórios de despesas por imóvel
CREATE OR REPLACE VIEW vw_despesas_por_imovel AS
SELECT 
  d.imovel_id,
  i.nome as imovel_nome,
  COUNT(*) as total_despesas,
  SUM(d.valor) as valor_total,
  AVG(d.valor) as valor_medio,
  COUNT(CASE WHEN d.status = 'pago' THEN 1 END) as despesas_pagas,
  SUM(CASE WHEN d.status = 'pago' THEN d.valor ELSE 0 END) as valor_pago
FROM despesas_imoveis d
JOIN imoveis i ON d.imovel_id = i.id
GROUP BY d.imovel_id, i.nome;