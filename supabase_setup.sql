-- Execute este SQL no Supabase > SQL Editor

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  nome TEXT,
  buyer_name TEXT,
  telefone TEXT,
  email TEXT,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  participant_count INTEGER NOT NULL DEFAULT 0,
  adult_count INTEGER NOT NULL DEFAULT 0,
  child_count INTEGER NOT NULL DEFAULT 0,
  lot_name TEXT,
  lot_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_people_count INTEGER NOT NULL DEFAULT 0,
  extra_people_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'aguardando_pagamento',
  pagamento_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
  payment_confirmed_at TIMESTAMPTZ,
  followup_count INTEGER NOT NULL DEFAULT 0,
  last_followup_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS participant_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS adult_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS child_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS lot_name TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS lot_price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS extra_people_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS extra_people_fee NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS amount_due NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'pix';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS followup_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS last_followup_sent_at TIMESTAMPTZ;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE pedidos
SET
  buyer_name = COALESCE(buyer_name, nome),
  participants = CASE
    WHEN jsonb_typeof(participants) IS NULL THEN COALESCE(itens, '[]'::jsonb)
    ELSE participants
  END,
  amount_due = CASE WHEN amount_due = 0 THEN COALESCE(lot_price, 0) + COALESCE(extra_people_fee, 0) ELSE amount_due END,
  updated_at = COALESCE(updated_at, created_at, NOW());

CREATE INDEX IF NOT EXISTS pedidos_created_at_idx ON pedidos (created_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_pagamento_idx ON pedidos (pagamento_confirmado, created_at DESC);

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserção pública" ON pedidos;
DROP POLICY IF EXISTS "Permitir leitura pública" ON pedidos;
DROP POLICY IF EXISTS "Permitir atualização pública" ON pedidos;
DROP POLICY IF EXISTS "Permitir exclusão pública" ON pedidos;
DROP POLICY IF EXISTS "Permitir insercao publica" ON pedidos;
DROP POLICY IF EXISTS "Permitir leitura publica" ON pedidos;
DROP POLICY IF EXISTS "Permitir atualizacao publica" ON pedidos;
DROP POLICY IF EXISTS "Permitir exclusao publica" ON pedidos;

CREATE POLICY "Permitir insercao publica"
  ON pedidos FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Permitir leitura publica"
  ON pedidos FOR SELECT TO anon
  USING (true);

CREATE POLICY "Permitir atualizacao publica"
  ON pedidos FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Permitir exclusao publica"
  ON pedidos FOR DELETE TO anon
  USING (true);
