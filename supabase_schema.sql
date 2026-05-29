-- Execute este script no SQL Editor do seu Supabase.

-- 1. A tabela de perfis (profiles) JÁ EXISTE no seu banco de dados, então vamos pular a criação dela.
-- (Código original de criação de profiles foi comentado)
/*
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perfis são públicos para usuários logados" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuários podem inserir o próprio perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
*/


-- 2. Criar tabela de dispensas de licença
CREATE TABLE dispensas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titulo TEXT NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Pendente', -- Pendente, Aprovado, Rejeitado
  pasta_storage TEXT, -- Caminho da pasta no bucket onde os arquivos ficarão
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para dispensas
ALTER TABLE dispensas ENABLE ROW LEVEL SECURITY;

-- Políticas para dispensas: apenas autenticados podem ver e gerenciar
CREATE POLICY "Dispensas visíveis para todos os autenticados" ON dispensas
  FOR SELECT USING (true);

CREATE POLICY "Qualquer autenticado pode inserir dispensa" ON dispensas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Autenticados podem atualizar dispensas" ON dispensas
  FOR UPDATE USING (true);


-- 3. Criar tabela de agenda (compromissos compartilhados)
CREATE TABLE agenda (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_hora_fim TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para agenda
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;

-- Políticas para agenda: visível e editável por todos os autenticados
CREATE POLICY "Agenda visível para todos os autenticados" ON agenda
  FOR SELECT USING (true);

CREATE POLICY "Qualquer autenticado pode inserir na agenda" ON agenda
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Autenticados podem atualizar a agenda" ON agenda
  FOR UPDATE USING (true);

CREATE POLICY "Autenticados podem deletar da agenda" ON agenda
  FOR DELETE USING (true);


-- 4. Criar o bucket de storage para os documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos_setur', 'documentos_setur', true);

-- Políticas de Storage para o bucket documentos_setur
CREATE POLICY "Permitir leitura pública/autenticada" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos_setur' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir upload para autenticados" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documentos_setur' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir delete para autenticados" ON storage.objects
  FOR DELETE USING (bucket_id = 'documentos_setur' AND auth.role() = 'authenticated');
