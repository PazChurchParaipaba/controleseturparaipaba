-- Execute este script no SQL Editor do seu Supabase para corrigir a visibilidade

-- 1. Políticas da Agenda (Permitir que todos vejam os compromissos de todos)
DROP POLICY IF EXISTS "Agenda visível para todos os autenticados" ON agenda;
DROP POLICY IF EXISTS "Permitir leitura geral agenda" ON agenda;
CREATE POLICY "Permitir leitura geral agenda" ON agenda FOR SELECT TO public USING (true);

-- 2. Políticas de Arquivos (Permitir que todos vejam os arquivos e pastas de todos)
DROP POLICY IF EXISTS "Dispensas visíveis para todos os autenticados" ON arquivos;
DROP POLICY IF EXISTS "Permitir leitura geral dispensas" ON arquivos;
DROP POLICY IF EXISTS "Permitir leitura geral arquivos" ON arquivos;
CREATE POLICY "Permitir leitura geral arquivos" ON arquivos FOR SELECT TO public USING (true);

-- 3. Políticas de Perfis (Permitir que os nomes de quem criou apareçam para todos)
DROP POLICY IF EXISTS "Perfis são públicos para usuários logados" ON profiles;
DROP POLICY IF EXISTS "Permitir leitura geral profiles" ON profiles;
CREATE POLICY "Permitir leitura geral profiles" ON profiles FOR SELECT TO public USING (true);

-- 4. Políticas de Storage (Permitir que todos vejam/baixem os arquivos inseridos por outros)
DROP POLICY IF EXISTS "Permitir leitura pública/autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública para documentos_setur" ON storage.objects;
DROP POLICY IF EXISTS "Leitura irrestrita para documentos_setur" ON storage.objects;
CREATE POLICY "Leitura irrestrita para documentos_setur" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documentos_setur');

-- Permissão extra para upload, edição e delete para todos os autenticados ou públicos no storage, para garantir que as pastas e arquivos possam ser manipulados.
DROP POLICY IF EXISTS "Permitir upload para documentos_setur" ON storage.objects;
CREATE POLICY "Permitir upload para documentos_setur" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'documentos_setur');

DROP POLICY IF EXISTS "Permitir exclusão para documentos_setur" ON storage.objects;
CREATE POLICY "Permitir exclusão para documentos_setur" ON storage.objects FOR DELETE TO public USING (bucket_id = 'documentos_setur');
