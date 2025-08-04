-- Criar bucket para imagens de imóveis
INSERT INTO storage.buckets (id, name, public)
VALUES ('imoveis-images', 'imoveis-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de imagens (desenvolvimento)
-- Em produção, isso deveria ser restrito a usuários autenticados
CREATE POLICY "Permitir upload de imagens para desenvolvimento" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'imoveis-images');

-- Política para permitir leitura pública das imagens
CREATE POLICY "Permitir leitura pública de imagens" ON storage.objects
  FOR SELECT USING (bucket_id = 'imoveis-images');

-- Política para permitir exclusão de imagens (desenvolvimento)
CREATE POLICY "Permitir exclusão de imagens para desenvolvimento" ON storage.objects
  FOR DELETE USING (bucket_id = 'imoveis-images');