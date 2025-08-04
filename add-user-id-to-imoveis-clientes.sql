-- Adicionar coluna user_id às tabelas de imóveis e clientes
-- Para rastrear qual usuário (admin/corretor) criou/é responsável pelo registro

-- Adicionar coluna user_id à tabela imoveis
ALTER TABLE imoveis 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Adicionar coluna user_id à tabela clientes
ALTER TABLE clientes 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Criar índices para melhor performance nas consultas
CREATE INDEX idx_imoveis_user_id ON imoveis(user_id);
CREATE INDEX idx_clientes_user_id ON clientes(user_id);

-- Comentários para documentação
COMMENT ON COLUMN imoveis.user_id IS 'UUID do usuário responsável pelo imóvel (admin ou corretor)';
COMMENT ON COLUMN clientes.user_id IS 'UUID do usuário responsável pelo cliente (admin ou corretor)';

-- Opcional: Atualizar registros existentes com um usuário padrão (admin)
-- Descomente as linhas abaixo se quiser atribuir registros existentes a um usuário específico
-- UPDATE imoveis SET user_id = 'UUID_DO_ADMIN' WHERE user_id IS NULL;
-- UPDATE clientes SET user_id = 'UUID_DO_ADMIN' WHERE user_id IS NULL;