-- Habilita o acesso público de leitura para o bucket documentos_setur
CREATE POLICY "Permitir leitura pública para documentos_setur"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documentos_setur');

-- Habilita a inserção (upload) se não existir
CREATE POLICY "Permitir upload para documentos_setur"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'documentos_setur');

-- Habilita exclusão (delete) para que o botão apagar funcione
CREATE POLICY "Permitir exclusão para documentos_setur"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'documentos_setur');
