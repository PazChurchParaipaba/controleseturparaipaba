-- 1. Renomear tabela de dispensas para arquivos e adicionar novas colunas
ALTER TABLE IF EXISTS dispensas RENAME TO arquivos;
ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Dispensa';

-- Atualizar o nome da política se existir (opcional, mas recomendado)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'arquivos' AND policyname = 'Permitir leitura geral dispensas'
  ) THEN
    ALTER POLICY "Permitir leitura geral dispensas" ON arquivos RENAME TO "Permitir leitura geral arquivos";
  END IF;
END $$;

-- 2. Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente', -- Pendente, Em Andamento, Concluída
  assignee_id UUID REFERENCES profiles(id), -- Quem está responsável (pode ser nulo)
  user_id UUID REFERENCES profiles(id) NOT NULL, -- Quem criou a tarefa
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para tarefas
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Políticas para tarefas: visível e editável por todos os autenticados
DROP POLICY IF EXISTS "Permitir leitura geral tarefas" ON tarefas;
CREATE POLICY "Permitir leitura geral tarefas" ON tarefas FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Qualquer autenticado pode inserir tarefas" ON tarefas;
CREATE POLICY "Qualquer autenticado pode inserir tarefas" ON tarefas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados podem atualizar tarefas" ON tarefas;
CREATE POLICY "Autenticados podem atualizar tarefas" ON tarefas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Autenticados podem deletar tarefas" ON tarefas;
CREATE POLICY "Autenticados podem deletar tarefas" ON tarefas FOR DELETE USING (true);
