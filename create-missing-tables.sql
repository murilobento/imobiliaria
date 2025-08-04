-- Create cidades table
CREATE TABLE IF NOT EXISTS cidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create imoveis table
CREATE TABLE IF NOT EXISTS imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  finalidade VARCHAR(20) NOT NULL,
  valor_venda DECIMAL(12,2),
  valor_aluguel DECIMAL(12,2),
  descricao TEXT,
  quartos INTEGER DEFAULT 0,
  banheiros INTEGER DEFAULT 0,
  area_total DECIMAL(10,2),
  caracteristicas JSONB,
  comodidades JSONB,
  endereco_completo TEXT,
  cidade_id UUID,
  bairro VARCHAR(255),
  destaque BOOLEAN DEFAULT false,
  cliente_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create imovel_imagens table
CREATE TABLE IF NOT EXISTS imovel_imagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id UUID NOT NULL,
  url VARCHAR(500) NOT NULL,
  url_thumb VARCHAR(500),
  storage_path VARCHAR(500),
  ordem INTEGER DEFAULT 0,
  tipo VARCHAR(20) DEFAULT 'paisagem',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints (will be ignored if tables don't exist)
DO $$ 
BEGIN
  -- Add foreign key for cidade_id if cidades table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cidades') THEN
    ALTER TABLE imoveis ADD CONSTRAINT fk_imoveis_cidade 
    FOREIGN KEY (cidade_id) REFERENCES cidades(id);
  END IF;
  
  -- Add foreign key for cliente_id if clientes table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clientes') THEN
    ALTER TABLE imoveis ADD CONSTRAINT fk_imoveis_cliente 
    FOREIGN KEY (cliente_id) REFERENCES clientes(id);
  END IF;
  
  -- Add foreign key for imovel_id
  ALTER TABLE imovel_imagens ADD CONSTRAINT fk_imovel_imagens_imovel 
  FOREIGN KEY (imovel_id) REFERENCES imoveis(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_id ON imoveis(cidade_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_cliente_id ON imoveis(cliente_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo);
CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade ON imoveis(finalidade);
CREATE INDEX IF NOT EXISTS idx_imoveis_destaque ON imoveis(destaque);
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_imovel_id ON imovel_imagens(imovel_id);

-- Enable RLS
ALTER TABLE cidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE imovel_imagens ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY IF NOT EXISTS "Permitir leitura pública de cidades ativas" ON cidades
  FOR SELECT USING (ativa = true);

CREATE POLICY IF NOT EXISTS "Permitir leitura pública de imóveis ativos" ON imoveis
  FOR SELECT USING (ativo = true);

CREATE POLICY IF NOT EXISTS "Permitir leitura pública de imagens" ON imovel_imagens
  FOR SELECT USING (true);

-- Create policies for full access (development)
CREATE POLICY IF NOT EXISTS "Permitir acesso completo a cidades para desenvolvimento" ON cidades
  FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Permitir acesso completo a imóveis para desenvolvimento" ON imoveis
  FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Permitir acesso completo a imagens para desenvolvimento" ON imovel_imagens
  FOR ALL USING (true);

-- Insert some sample cities
INSERT INTO cidades (nome, ativa) VALUES 
  ('São Paulo', true),
  ('Rio de Janeiro', true),
  ('Belo Horizonte', true),
  ('Brasília', true),
  ('Salvador', true)
ON CONFLICT (nome) DO NOTHING;