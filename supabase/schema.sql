-- ==============================================================================
-- SCHEMA DO SUPABASE: CONTROLE FINANCEIRO & ORÇAMENTO PESSOAL
-- ==============================================================================
-- Instruções de Execução:
-- 1. Acesse o painel do seu projeto no Supabase: https://supabase.com/dashboard
-- 2. No menu lateral esquerdo, clique no ícone "SQL Editor" (ícone com símbolo de terminal/código).
-- 3. Clique em "+ New query" (Nova consulta).
-- 4. Cole TODO o conteúdo deste arquivo e clique no botão verde "Run" no canto inferior direito.
-- ==============================================================================

-- 1. Habilitar extensão pgcrypto para UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabela de Perfis de Usuário (vinculada à auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  default_limit NUMERIC(12,2) DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- 4. Tabela de Transações / Lançamentos (com suporte a parcelas)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
  installment_index INT,
  total_installments INT,
  installment_group_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabela de Limites de Orçamento Mensal
CREATE TABLE IF NOT EXISTS public.category_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  limit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id)
);

-- Índices para alta performance de consulta
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_group ON public.transactions(installment_group_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_limits_user ON public.category_limits(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA E ISOLAMENTO MULTI-TENANT
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_limits ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para Categorias
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Transações
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Limites de Orçamento
DROP POLICY IF EXISTS "Users can view own category limits" ON public.category_limits;
CREATE POLICY "Users can view own category limits" ON public.category_limits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own category limits" ON public.category_limits;
CREATE POLICY "Users can insert own category limits" ON public.category_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own category limits" ON public.category_limits;
CREATE POLICY "Users can update own category limits" ON public.category_limits
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own category limits" ON public.category_limits;
CREATE POLICY "Users can delete own category limits" ON public.category_limits
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- TRIGGER AUTOMÁTICO: NOVO USUÁRIO CADASTRA PERFIL E CATEGORIAS PADRÃO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Criar perfil
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Usuário'),
    NEW.email
  );

  -- 2. Inserir Categorias Padrão de Despesas
  INSERT INTO public.categories (id, user_id, name, color, type, default_limit, is_system) VALUES
    ('moradia', NEW.id, 'Moradia', '#3b82f6', 'expense', 2500, true),
    ('alimentacao', NEW.id, 'Alimentação', '#f97316', 'expense', 1600, true),
    ('transporte', NEW.id, 'Transporte', '#8b5cf6', 'expense', 700, true),
    ('saude', NEW.id, 'Saúde', '#10b981', 'expense', 700, true),
    ('lazer', NEW.id, 'Lazer & Cultura', '#ec4899', 'expense', 400, true),
    ('educacao', NEW.id, 'Educação', '#06b6d4', 'expense', 300, true),
    ('outros_gastos', NEW.id, 'Outros Gastos', '#64748b', 'expense', 200, true)
  ON CONFLICT (user_id, id) DO NOTHING;

  -- 3. Inserir Categorias Padrão de Receitas
  INSERT INTO public.categories (id, user_id, name, color, type, default_limit, is_system) VALUES
    ('salario', NEW.id, 'Salário / Pró-labore', '#10b981', 'income', 0, true),
    ('freelance', NEW.id, 'Freelance / Serviços', '#06b6d4', 'income', 0, true),
    ('investimentos', NEW.id, 'Rendimentos / Investimentos', '#8b5cf6', 'income', 0, true),
    ('outras_receitas', NEW.id, 'Outras Receitas', '#64748b', 'income', 0, true)
  ON CONFLICT (user_id, id) DO NOTHING;

  -- 4. Inserir Limites Iniciais de Orçamento
  INSERT INTO public.category_limits (user_id, category_id, limit_amount) VALUES
    (NEW.id, 'moradia', 2500),
    (NEW.id, 'alimentacao', 1600),
    (NEW.id, 'transporte', 700),
    (NEW.id, 'saude', 700),
    (NEW.id, 'lazer', 400),
    (NEW.id, 'educacao', 300),
    (NEW.id, 'outros_gastos', 200)
  ON CONFLICT (user_id, category_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Vincular o trigger ao evento de INSERT na tabela auth.users do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();