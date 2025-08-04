-- Criar tabela de imóveis
CREATE TABLE IF NOT EXISTS imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- Apartamento, Casa, Terreno, etc.
  finalidade VARCHAR(20) NOT NULL, -- venda, aluguel, ambos
  valor_venda DECIMAL(12,2),
  valor_aluguel DECIMAL(12,2),
  descricao TEXT,
  quartos INTEGER DEFAULT 0,
  banheiros INTEGER DEFAULT 0,
  area_total DECIMAL(10,2),
  caracteristicas JSONB, -- Array de características
  comodidades JSONB, -- Array de comodidades
  endereco_completo TEXT,
  cidade_id UUID REFERENCES cidades(id),
  bairro VARCHAR(255),
  destaque BOOLEAN DEFAULT false,
  cliente_id UUID REFERENCES clientes(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de imagens dos imóveis
CREATE TABLE IF NOT EXISTS imovel_imagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id UUID REFERENCES imoveis(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  url_thumb VARCHAR(500), -- Thumbnail
  storage_path VARCHAR(500), -- Caminho no Supabase Storage
  ordem INTEGER DEFAULT 0,
  tipo VARCHAR(20) DEFAULT 'paisagem', -- retrato ou paisagem
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_id ON imoveis(cidade_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_cliente_id ON imoveis(cliente_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo);
CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade ON imoveis(finalidade);
CREATE INDEX IF NOT EXISTS idx_imoveis_destaque ON imoveis(destaque);
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_imovel_id ON imovel_imagens(imovel_id);

-- RLS (Row Level Security) policies
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE imovel_imagens ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público (apenas leitura)
CREATE POLICY "Permitir leitura pública de imóveis ativos" ON imoveis
  FOR SELECT USING (ativo = true);

CREATE POLICY "Permitir leitura pública de imagens" ON imovel_imagens
  FOR SELECT USING (true);

-- Políticas para administradores (acesso completo)
-- Nota: Estas políticas assumem que haverá um sistema de autenticação
-- Por enquanto, permitimos acesso completo para desenvolvimento
CREATE POLICY "Permitir acesso completo a imóveis para desenvolvimento" ON imoveis
  FOR ALL USING (true);

CREATE POLICY "Permitir acesso completo a imagens para desenvolvimento" ON imovel_imagens
  FOR ALL USING (true);