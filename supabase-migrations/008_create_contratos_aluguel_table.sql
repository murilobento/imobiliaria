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
  CONSTRAINT valid_contract_dates CHECK (data_fim > data_inicio),
  CONSTRAINT unique_active_contract_per_property UNIQUE (imovel_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Remover a constraint única temporariamente para permitir múltiplos contratos não ativos
ALTER TABLE contratos_aluguel DROP CONSTRAINT IF EXISTS unique_active_contract_per_property;

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

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_contratos_aluguel_updated_at 
  BEFORE UPDATE ON contratos_aluguel 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para validar se o imóvel está disponível para aluguel
CREATE OR REPLACE FUNCTION validate_imovel_disponivel()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o imóvel existe e está ativo
  IF NOT EXISTS (
    SELECT 1 FROM imoveis 
    WHERE id = NEW.imovel_id 
    AND ativo = true 
    AND (finalidade = 'aluguel' OR finalidade = 'ambos')
  ) THEN
    RAISE EXCEPTION 'Imóvel não está disponível para aluguel';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar disponibilidade do imóvel
CREATE TRIGGER validate_imovel_disponivel_trigger
  BEFORE INSERT OR UPDATE ON contratos_aluguel
  FOR EACH ROW
  EXECUTE FUNCTION validate_imovel_disponivel();