-- ==============================================================================
-- ATIVAÇÃO DE ACESSO DIRETO E AUTOMÁTICO (CORREÇÃO DE POLÍTICAS)
-- ==============================================================================

-- 1. Remover TODAS as políticas antigas que dependem da coluna user_id
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anon transactions access" ON public.transactions;

DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
DROP POLICY IF EXISTS "Anon categories access" ON public.categories;

DROP POLICY IF EXISTS "Users can view own category limits" ON public.category_limits;
DROP POLICY IF EXISTS "Users can insert own category limits" ON public.category_limits;
DROP POLICY IF EXISTS "Users can update own category limits" ON public.category_limits;
DROP POLICY IF EXISTS "Users can delete own category limits" ON public.category_limits;
DROP POLICY IF EXISTS "Anon category_limits access" ON public.category_limits;

-- 2. Remover restrições de chave estrangeira com auth.users
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE public.category_limits DROP CONSTRAINT IF EXISTS category_limits_user_id_fkey;

-- 3. Alterar user_id para texto com valor padrão 'default_user'
ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN user_id SET DEFAULT 'default_user';

ALTER TABLE public.categories ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.categories ALTER COLUMN user_id SET DEFAULT 'default_user';

ALTER TABLE public.category_limits ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.category_limits ALTER COLUMN user_id SET DEFAULT 'default_user';

-- 4. Criar as novas políticas que liberam acesso automático direto
CREATE POLICY "Anon transactions access" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon categories access" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon category_limits access" ON public.category_limits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);