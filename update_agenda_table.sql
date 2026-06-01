-- Adiciona a coluna categoria na tabela agenda se ela não existir
ALTER TABLE agenda ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Turismo';
