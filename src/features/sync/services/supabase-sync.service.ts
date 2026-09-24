import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Transaction } from "@/features/transactions/types/transaction.types";
import { Category } from "@/features/categories/types/category.types";

export interface CloudData {
  categories: Category[];
  transactions: Transaction[];
  categoryLimits: Record<string, number>;
}

export const DEFAULT_USER_ID = "default_user";

export const SupabaseSyncService = {
  /**
   * Carrega todos os dados do usuário a partir do Supabase.
   */
  async fetchUserData(userId: string = DEFAULT_USER_ID): Promise<CloudData | null> {
    if (!isSupabaseConfigured()) return null;
    const supabase = createClient();

    try {
      // 1. Carregar Categorias
      const { data: categoriesData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId);

      if (catError) {
        console.error("Erro ao buscar categorias no Supabase:", catError);
      }

      // 2. Carregar Limites de Orçamento
      const { data: limitsData, error: limError } = await supabase
        .from("category_limits")
        .select("*")
        .eq("user_id", userId);

      if (limError) {
        console.error("Erro ao buscar limites no Supabase:", limError);
      }

      // 3. Carregar Transações
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (txError) {
        console.error("Erro ao buscar transações no Supabase:", txError);
      }

      const categories: Category[] = (categoriesData || []).map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        type: c.type,
        defaultLimit: Number(c.default_limit) || 0,
        isSystem: c.is_system,
      }));

      const categoryLimits: Record<string, number> = {};
      (limitsData || []).forEach((l) => {
        categoryLimits[l.category_id] = Number(l.limit_amount) || 0;
      });

      const transactions: Transaction[] = (txData || []).map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount) || 0,
        type: t.type,
        category: t.category_id,
        date: t.date,
        status: t.status,
        installmentIndex: t.installment_index ?? undefined,
        totalInstallments: t.total_installments ?? undefined,
        installmentGroupId: t.installment_group_id ?? undefined,
        createdAt: t.created_at,
      }));

      return { categories, categoryLimits, transactions };
    } catch (err) {
      console.error("Falha ao comunicar com Supabase:", err);
      return null;
    }
  },

  /**
   * Migra e sobe os dados locais (localStorage) para o Supabase sem necessidade de login.
   */
  async migrateLocalData(
    userId: string = DEFAULT_USER_ID,
    data: {
      categories: Category[];
      transactions: Transaction[];
      categoryLimits: Record<string, number>;
    }
  ): Promise<{ success: boolean; categoriesCount: number; txCount: number; limitsCount: number; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, categoriesCount: 0, txCount: 0, limitsCount: 0, error: "Supabase não configurado no .env.local" };
    }

    const supabase = createClient();

    try {
      // 1. Migrar Categorias
      const categoriesPayload = data.categories.map((c) => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        color: c.color,
        type: c.type,
        default_limit: c.defaultLimit ?? 0,
        is_system: c.isSystem ?? false,
      }));

      if (categoriesPayload.length > 0) {
        const { error: catError } = await supabase
          .from("categories")
          .upsert(categoriesPayload, { onConflict: "user_id,id" });
        if (catError) throw catError;
      }

      // 2. Migrar Limites de Orçamento
      const limitsPayload = Object.entries(data.categoryLimits).map(([catId, limit]) => ({
        user_id: userId,
        category_id: catId,
        limit_amount: limit,
      }));

      if (limitsPayload.length > 0) {
        const { error: limError } = await supabase
          .from("category_limits")
          .upsert(limitsPayload, { onConflict: "user_id,category_id" });
        if (limError) throw limError;
      }

      // 3. Migrar Transações
      const transactionsPayload = data.transactions.map((t) => ({
        id: t.id,
        user_id: userId,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category_id: t.category,
        date: t.date,
        status: t.status ?? "paid",
        installment_index: t.installmentIndex ?? null,
        total_installments: t.totalInstallments ?? null,
        installment_group_id: t.installmentGroupId ?? null,
        created_at: t.createdAt,
      }));

      if (transactionsPayload.length > 0) {
        const { error: txError } = await supabase
          .from("transactions")
          .upsert(transactionsPayload, { onConflict: "id" });
        if (txError) throw txError;
      }

      return {
        success: true,
        categoriesCount: categoriesPayload.length,
        txCount: transactionsPayload.length,
        limitsCount: limitsPayload.length,
      };
    } catch (err: any) {
      console.error("Erro na sincronização de dados com o Supabase:", err);
      return {
        success: false,
        categoriesCount: 0,
        txCount: 0,
        limitsCount: 0,
        error: err.message || "Erro desconhecido ao comunicar com o Supabase.",
      };
    }
  },

  /**
   * Salva ou atualiza uma transação no Supabase.
   */
  async upsertTransaction(tx: Transaction, userId: string = DEFAULT_USER_ID): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = createClient();

    const { error } = await supabase.from("transactions").upsert({
      id: tx.id,
      user_id: userId,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category_id: tx.category,
      date: tx.date,
      status: tx.status ?? "paid",
      installment_index: tx.installmentIndex ?? null,
      total_installments: tx.totalInstallments ?? null,
      installment_group_id: tx.installmentGroupId ?? null,
      created_at: tx.createdAt,
    });

    if (error) {
      console.error("Erro ao salvar transação no Supabase:", error);
      return false;
    }
    return true;
  },

  /**
   * Salva múltiplas transações (ex: parcelas geradas) no Supabase.
   */
  async upsertTransactions(txs: Transaction[], userId: string = DEFAULT_USER_ID): Promise<boolean> {
    if (!isSupabaseConfigured() || txs.length === 0) return false;
    const supabase = createClient();

    const payload = txs.map((tx) => ({
      id: tx.id,
      user_id: userId,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category_id: tx.category,
      date: tx.date,
      status: tx.status ?? "paid",
      installment_index: tx.installmentIndex ?? null,
      total_installments: tx.totalInstallments ?? null,
      installment_group_id: tx.installmentGroupId ?? null,
      created_at: tx.createdAt,
    }));

    const { error } = await supabase.from("transactions").upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("Erro ao salvar lote de transações no Supabase:", error);
      return false;
    }
    return true;
  },

  /**
   * Deleta uma transação no Supabase.
   */
  async deleteTransaction(txId: string, userId: string = DEFAULT_USER_ID): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = createClient();

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", txId)
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao deletar transação no Supabase:", error);
      return false;
    }
    return true;
  },

  /**
   * Deleta parcelas em lote (série de parcelamento) no Supabase.
   */
  async deleteInstallmentGroup(
    groupId: string,
    fromIndex?: number,
    userId: string = DEFAULT_USER_ID
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = createClient();

    let query = supabase
      .from("transactions")
      .delete()
      .eq("installment_group_id", groupId)
      .eq("user_id", userId);

    if (fromIndex !== undefined) {
      query = query.gte("installment_index", fromIndex);
    }

    const { error } = await query;
    if (error) {
      console.error("Erro ao deletar grupo de parcelas no Supabase:", error);
      return false;
    }
    return true;
  },

  /**
   * Salva ou atualiza uma categoria no Supabase.
   */
  async upsertCategory(category: Category, userId: string = DEFAULT_USER_ID): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = createClient();

    const { error } = await supabase.from("categories").upsert({
      id: category.id,
      user_id: userId,
      name: category.name,
      color: category.color,
      type: category.type,
      default_limit: category.defaultLimit ?? 0,
      is_system: category.isSystem ?? false,
    });

    if (error) {
      console.error("Erro ao salvar categoria no Supabase:", error);
      return false;
    }
    return true;
  },

  /**
   * Deleta uma categoria no Supabase.
   */
  async deleteCategory(categoryId: string, userId: string = DEFAULT_USER_ID): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = createClient();

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao deletar categoria no Supabase:", error);
      return false;
    }
    return true;
  },

  /**
   * Salva limite de orçamento no Supabase.
   */
  async upsertCategoryLimit(
    categoryId: string,
    limitAmount: number,
    userId: string = DEFAULT_USER_ID
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = createClient();

    const { error } = await supabase.from("category_limits").upsert({
      user_id: userId,
      category_id: categoryId,
      limit_amount: limitAmount,
    }, { onConflict: "user_id,category_id" });

    if (error) {
      console.error("Erro ao salvar limite de orçamento no Supabase:", error);
      return false;
    }
    return true;
  },
};