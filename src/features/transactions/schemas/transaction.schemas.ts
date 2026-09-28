import { z } from "zod";
import { CategoryInfo } from "../types/transaction.types";

export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  { id: "moradia", name: "Moradia", color: "#6366f1", type: "expense" },
  { id: "alimentacao", name: "Alimentação", color: "#f59e0b", type: "expense" },
  { id: "transporte", name: "Transporte", color: "#3b82f6", type: "expense" },
  { id: "saude", name: "Saúde", color: "#ec4899", type: "expense" },
  { id: "lazer_outros", name: "Lazer/Outros", color: "#8b5cf6", type: "expense" },
  { id: "educacao", name: "Educação", color: "#14b8a6", type: "expense" },
];

export const INCOME_CATEGORIES: CategoryInfo[] = [
  { id: "salario", name: "Salário Principal", color: "#10b981", type: "income" },
  { id: "freelance", name: "Freelance / Serviços", color: "#06b6d4", type: "income" },
  { id: "investimentos", name: "Rendimentos & Investimentos", color: "#8b5cf6", type: "income" },
  { id: "outras_receitas", name: "Outras Entradas", color: "#64748b", type: "income" },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

import { useCategoryStore } from "@/features/categories/stores/category.store";

export function getCategoryById(id: string): CategoryInfo {
  const targetId = id === "lazer" || id === "outros_gastos" ? "lazer_outros" : id;
  try {
    const storeCategory = useCategoryStore.getState().getCategoryById(targetId);
    if (storeCategory && storeCategory.name) {
      return {
        id: storeCategory.id,
        name: storeCategory.name,
        color: storeCategory.color,
        type: storeCategory.type,
      };
    }
  } catch {
    // fallback se chamado fora de contexto do browser
  }

  return (
    ALL_CATEGORIES.find((c) => c.id === targetId) || {
      id: targetId,
      name: targetId,
      color: "#64748b",
      type: "expense",
    }
  );
}

export const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z
    .string()
    .min(2, "A descrição deve ter pelo menos 2 caracteres")
    .max(100, "A descrição deve ter no máximo 100 caracteres"),
  amount: z
    .number()
    .positive("O valor deve ser maior que zero")
    .max(10000000, "Valor excessivo"),
  category: z.string().min(1, "Selecione uma categoria"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)"),
  status: z.enum(["paid", "pending"]),
  isInstallment: z.boolean(),
  installmentsCount: z
    .number()
    .int()
    .min(2, "Mínimo de 2 parcelas")
    .max(72, "Máximo de 72 parcelas"),
  amountMode: z.enum(["per_installment", "total"]),
});

export type TransactionFormData = z.infer<typeof transactionFormSchema>;

export const editTransactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z
    .string()
    .min(2, "A descrição deve ter pelo menos 2 caracteres")
    .max(100, "A descrição deve ter no máximo 100 caracteres"),
  amount: z
    .number()
    .positive("O valor deve ser maior que zero")
    .max(10000000, "Valor excessivo"),
  category: z.string().min(1, "Selecione uma categoria"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)"),
  status: z.enum(["paid", "pending"]),
  updateGroupMeta: z.boolean().optional(),
});

export type EditTransactionFormData = z.infer<typeof editTransactionFormSchema>;

