-- Criar tabela de cidades
CREATE TABLE IF NOT EXISTS cidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cidades_nome ON cidades(nome);
CREATE INDEX IF NOT EXISTS idx_cidades_ativa ON cidades(ativa);

-- Habilitar Row Level Security
ALTER TABLE cidades ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Permitir leitura pública de cidades ativas" ON cidades;
DROP POLICY IF EXISTS "Permitir todas operações para admins" ON cidades;
DROP POLICY IF EXISTS "Permitir acesso completo para desenvolvimento" ON cidades;

-- Política para permitir leitura pública de cidades ativas
CREATE POLICY "Permitir leitura pública de cidades ativas" ON cidades
  FOR SELECT USING (ativa = true);

-- Política para permitir acesso completo (desenvolvimento)
-- Em produção, isso deveria ser mais restritivo
CREATE POLICY "Permitir acesso completo para desenvolvimento" ON cidades
  FOR ALL USING (true);

-- Inserir algumas cidades de exemplo
INSERT INTO cidades (nome, ativa) VALUES 
  ('São Paulo', true),
  ('Rio de Janeiro', true),
  ('Belo Horizonte', true),
  ('Brasília', true),
  ('Salvador', true),
  ('Curitiba', true),
  ('Fortaleza', true),
  ('Recife', true),
  ('Porto Alegre', true),
  ('Manaus', true)
ON CONFLICT (nome) DO NOTHING;