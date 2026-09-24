"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  DownloadCloud,
  Database,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { SupabaseSyncService, DEFAULT_USER_ID } from "../services/supabase-sync.service";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { useBudgetStore } from "@/features/budget/stores/budget.store";

interface CloudSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloudSyncDialog({ open, onOpenChange }: CloudSyncDialogProps) {
  const configured = isSupabaseConfigured();
  const [copied, setCopied] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);

  const transactions = useTransactionStore((state) => state.transactions);
  const clearAllTransactions = useTransactionStore((state) => state.clearAllTransactions);
  const categories = useCategoryStore((state) => state.categories);
  const resetCategories = useCategoryStore((state) => state.resetToDefaults);
  const categoryLimits = useBudgetStore((state) => state.categoryLimits);
  const resetBudget = useBudgetStore((state) => state.resetToDefaults);

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  // Limpar dados locais (zerar base incorreta)
  const handleClearLocalData = () => {
    clearAllTransactions();
    resetCategories();
    resetBudget();
    toast.success("Base de dados local limpa com sucesso!", {
      description: "Lançamentos zerados. Categorias e limites restaurados para os padrões.",
    });
  };

  const handleCopySqlFix = () => {
    const sql = `-- 1. Remover TODAS as políticas antigas primeiro
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

-- 2. Remover chaves estrangeiras
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE public.category_limits DROP CONSTRAINT IF EXISTS category_limits_user_id_fkey;

-- 3. Alterar user_id para texto livre com valor padrão
ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.transactions ALTER COLUMN user_id SET DEFAULT 'default_user';

ALTER TABLE public.categories ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.categories ALTER COLUMN user_id SET DEFAULT 'default_user';

ALTER TABLE public.category_limits ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.category_limits ALTER COLUMN user_id SET DEFAULT 'default_user';

-- 4. Criar políticas de acesso direto automático
CREATE POLICY "Anon transactions access" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon categories access" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon category_limits access" ON public.category_limits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    toast.success("Script SQL de acesso direto copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMigrateToCloud = async () => {
    if (!configured) {
      toast.error("Supabase ainda não configurado", {
        description: "Adicione as credenciais no arquivo .env.local para habilitar a nuvem.",
      });
      return;
    }

    setIsSyncing(true);

    try {
      const result = await SupabaseSyncService.migrateLocalData(DEFAULT_USER_ID, {
        categories,
        transactions,
        categoryLimits,
      });

      if (result.success) {
        toast.success("Dados sincronizados com sucesso no Supabase!", {
          description: `${result.categoriesCount} categorias, ${result.txCount} lançamentos e ${result.limitsCount} limites gravados no PostgreSQL.`,
        });
      } else {
        toast.error("Erro na gravação do Supabase", {
          description: result.error || "Execute o script de liberação de acesso no SQL Editor.",
        });
      }
    } catch (err: any) {
      toast.error("Erro inesperado na sincronização", {
        description: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!configured) return;
    setIsPulling(true);

    try {
      const cloudData = await SupabaseSyncService.fetchUserData(DEFAULT_USER_ID);
      if (!cloudData) {
        toast.error("Não foi possível carregar os dados da nuvem.");
        return;
      }

      useTransactionStore.setState({ transactions: cloudData.transactions });
      if (cloudData.categories.length > 0) {
        useCategoryStore.setState({ categories: cloudData.categories });
      }
      if (Object.keys(cloudData.categoryLimits).length > 0) {
        useBudgetStore.setState({ categoryLimits: cloudData.categoryLimits });
      }

      toast.success("Dados atualizados a partir do PostgreSQL!", {
        description: `${cloudData.transactions.length} lançamentos e ${cloudData.categories.length} categorias carregadas.`,
      });
    } catch (err: any) {
      toast.error("Erro ao puxar dados da nuvem", {
        description: err.message,
      });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Integração Supabase & Banco de Dados
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Sincronização direta e automática com seu banco PostgreSQL, sem necessidade de telas de login ou senhas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* STATUS DO BANCO */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Status da Conexão</span>
              {configured ? (
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 gap-1 text-[11px]">
                  <CheckCircle2 className="size-3" />
                  Conectado ao Supabase
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 gap-1 text-[11px]">
                  <AlertTriangle className="size-3" />
                  Aguardando Credenciais
                </Badge>
              )}
            </div>

            {configured && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">URL do Projeto:</p>
                <code className="text-[11px] font-mono block bg-card px-2 py-1 rounded border border-border truncate text-foreground">
                  {envUrl}
                </code>
              </div>
            )}
          </div>

          {/* DADOS LOCAIS & GERENCIAMENTO DA BASE */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground">
                Base Local do Navegador
              </h4>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleClearLocalData}
                className="text-[11px] h-7 gap-1"
                title="Limpar todos os lançamentos e resetar a base para enviar limpo ao banco"
              >
                <Trash2 className="size-3" />
                Limpar Lançamentos
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/50 p-2 border border-border/50">
                <span className="block font-bold text-foreground">{transactions.length}</span>
                <span className="text-[10px] text-muted-foreground">Lançamentos</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 border border-border/50">
                <span className="block font-bold text-foreground">{categories.length}</span>
                <span className="text-[10px] text-muted-foreground">Categorias</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 border border-border/50">
                <span className="block font-bold text-foreground">{Object.keys(categoryLimits).length}</span>
                <span className="text-[10px] text-muted-foreground">Tetos de Gastos</span>
              </div>
            </div>

            {transactions.length === 0 ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-medium bg-emerald-500/10 py-1.5 px-2 rounded border border-emerald-500/20">
                ✓ Base limpa! Pronta para ser gravada no Supabase.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center">
                Você tem {transactions.length} lançamentos prontos para sincronizar.
              </p>
            )}
          </div>

          {/* INSTRUÇÃO RÁPIDA DE ACESSO DIRETO SEM LOGIN */}
          <div className="rounded-xl border border-dashed border-border p-3.5 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                Acesso Direto Sem Login
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopySqlFix}
                className="text-[11px] h-6 px-2 gap-1 border-border"
              >
                {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                {copied ? "Copiado!" : "Copiar SQL de Acesso"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Para o Supabase gravar automaticamente sem exigir login de e-mail e senha, execute o script <code className="text-foreground font-mono">supabase/enable_auto_sync.sql</code> no seu <strong>SQL Editor</strong> do Supabase.
            </p>
          </div>

          {/* AÇÕES DE SINCRONIZAÇÃO */}
          {configured && (
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                className="w-full justify-center text-xs h-9 gap-2 shadow-xs"
                onClick={handleMigrateToCloud}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Enviando dados para o Supabase...
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-3.5" />
                    Enviar Base Limpa para a Nuvem
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center text-xs h-9 gap-2 border-border"
                onClick={handlePullFromCloud}
                disabled={isPulling}
              >
                {isPulling ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Puxando dados da nuvem...
                  </>
                ) : (
                  <>
                    <DownloadCloud className="size-3.5" />
                    Carregar Dados da Nuvem para o Navegador
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}