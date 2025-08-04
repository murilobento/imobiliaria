-- Complete setup for clientes table
-- Run this SQL in your Supabase SQL Editor

-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  cpf_cnpj VARCHAR(20),
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);

-- Criar constraint para email único (quando não for nulo)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_email_when_not_null'
    ) THEN
        ALTER TABLE clientes ADD CONSTRAINT unique_email_when_not_null 
          EXCLUDE (email WITH =) WHERE (email IS NOT NULL);
    END IF;
END $$;

-- Habilitar Row Level Security
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Permitir todas operações para admins" ON clientes;

-- Política para permitir todas as operações para usuários autenticados (admin)
CREATE POLICY "Permitir todas operações para admins" ON clientes
  FOR ALL USING (true); -- Temporariamente permitir tudo para testes

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_clientes_updated_at 
  BEFORE UPDATE ON clientes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns dados de teste
INSERT INTO clientes (nome, email, telefone, cpf_cnpj, endereco, observacoes) VALUES 
  ('João Silva', 'joao@email.com', '(11) 99999-9999', '123.456.789-00', 'Rua das Flores, 123', 'Cliente preferencial'),
  ('Maria Santos', 'maria@email.com', '(11) 88888-8888', '987.654.321-00', 'Av. Principal, 456', 'Interessada em apartamentos'),
  ('Pedro Oliveira', 'pedro@email.com', '(11) 77777-7777', '456.789.123-00', 'Rua do Comércio, 789', NULL)
ON CONFLICT DO NOTHING;