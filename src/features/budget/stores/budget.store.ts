import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Decimal from "decimal.js";
import { CategoryBudgetProgress, BudgetSummary, BudgetStatus } from "../types/budget.types";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { Transaction } from "@/features/transactions/types/transaction.types";

export const DEFAULT_CATEGORY_LIMITS: Record<string, number> = {
  moradia: 2500,
  alimentacao: 1600,
  transporte: 700,
  saude: 700,
  lazer_outros: 600,
  educacao: 300,
};

interface BudgetState {
  categoryLimits: Record<string, number>;
  setCategoryLimit: (categoryId: string, limit: number) => void;
  setMultipleLimits: (limits: Record<string, number>) => void;
  resetToDefaults: () => void;
  getCategoryLimit: (categoryId: string) => number;
  calculateCategoryProgress: (monthExpenses: Transaction[]) => CategoryBudgetProgress[];
  calculateSummary: (monthExpenses: Transaction[]) => BudgetSummary;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      categoryLimits: { ...DEFAULT_CATEGORY_LIMITS },

      setCategoryLimit: (categoryId: string, limit: number) => {
        const safeLimit = Math.max(0, Math.round(limit * 100) / 100);
        set((state) => ({
          categoryLimits: {
            ...state.categoryLimits,
            [categoryId]: safeLimit,
          },
        }));
      },

      setMultipleLimits: (limits: Record<string, number>) => {
        set((state) => ({
          categoryLimits: {
            ...state.categoryLimits,
            ...limits,
          },
        }));
      },

      resetToDefaults: () => {
        set({ categoryLimits: { ...DEFAULT_CATEGORY_LIMITS } });
      },

      getCategoryLimit: (categoryId: string) => {
        const limits = get().categoryLimits;
        if (limits[categoryId] !== undefined) return limits[categoryId];
        const storeCat = useCategoryStore.getState().getCategoryById(categoryId);
        return storeCat.defaultLimit ?? DEFAULT_CATEGORY_LIMITS[categoryId] ?? 0;
      },

      calculateCategoryProgress: (monthExpenses: Transaction[]) => {
        const { categoryLimits } = get();
        const expenseCategories = useCategoryStore.getState().getExpenseCategories();

        // Agrupa despesas por categoria
        const spentMap = new Map<string, { total: Decimal; count: number }>();

        for (const tx of monthExpenses) {
          if (tx.type !== "expense") continue;
          const current = spentMap.get(tx.category) || {
            total: new Decimal(0),
            count: 0,
          };
          spentMap.set(tx.category, {
            total: current.total.plus(new Decimal(tx.amount)),
            count: current.count + 1,
          });
        }

        // Consolida lista de categorias ativas e eventuais transações históricas
        const allCategoryMap = new Map<string, { id: string; name: string; color: string; defaultLimit?: number }>();
        for (const cat of expenseCategories) {
          allCategoryMap.set(cat.id, cat);
        }
        for (const [catId] of spentMap) {
          if (!allCategoryMap.has(catId)) {
            const fallback = useCategoryStore.getState().getCategoryById(catId);
            allCategoryMap.set(catId, fallback);
          }
        }

        const categoriesList = Array.from(allCategoryMap.values());

        return categoriesList.map((cat) => {
          const limitNum =
            categoryLimits[cat.id] ?? cat.defaultLimit ?? DEFAULT_CATEGORY_LIMITS[cat.id] ?? 0;
          const limitDec = new Decimal(limitNum);
          const spentInfo = spentMap.get(cat.id) || {
            total: new Decimal(0),
            count: 0,
          };
          const spentDec = spentInfo.total;
          const remainingDec = limitDec.minus(spentDec);

          let percentage = 0;
          let status: BudgetStatus = "safe";

          if (limitDec.isZero()) {
            if (spentDec.greaterThan(0)) {
              percentage = 100;
              status = "exceeded";
            } else {
              percentage = 0;
              status = "safe";
            }
          } else {
            percentage = spentDec
              .dividedBy(limitDec)
              .times(100)
              .toDecimalPlaces(1)
              .toNumber();

            if (spentDec.greaterThanOrEqualTo(limitDec)) {
              status = "exceeded";
            } else if (percentage >= 80) {
              status = "warning";
            } else {
              status = "safe";
            }
          }

          return {
            categoryId: cat.id,
            categoryName: cat.name,
            categoryColor: cat.color,
            limit: limitDec.toNumber(),
            spent: spentDec.toNumber(),
            remaining: remainingDec.toNumber(),
            percentage,
            status,
            transactionCount: spentInfo.count,
          };
        });
      },

      calculateSummary: (monthExpenses: Transaction[]) => {
        const progressList = get().calculateCategoryProgress(monthExpenses);

        let totalBudgetDec = new Decimal(0);
        let totalSpentDec = new Decimal(0);
        let exceededCount = 0;
        let warningCount = 0;

        for (const item of progressList) {
          totalBudgetDec = totalBudgetDec.plus(new Decimal(item.limit));
          totalSpentDec = totalSpentDec.plus(new Decimal(item.spent));

          if (item.status === "exceeded") {
            exceededCount++;
          } else if (item.status === "warning") {
            warningCount++;
          }
        }

        const remainingBudgetDec = totalBudgetDec.minus(totalSpentDec);
        const percentage = totalBudgetDec.isZero()
          ? 0
          : totalSpentDec
              .dividedBy(totalBudgetDec)
              .times(100)
              .toDecimalPlaces(1)
              .toNumber();

        let status: BudgetStatus = "safe";
        if (totalSpentDec.greaterThanOrEqualTo(totalBudgetDec) && totalBudgetDec.greaterThan(0)) {
          status = "exceeded";
        } else if (percentage >= 80) {
          status = "warning";
        }

        return {
          totalBudget: totalBudgetDec.toNumber(),
          totalSpent: totalSpentDec.toNumber(),
          remainingBudget: remainingBudgetDec.toNumber(),
          percentage,
          status,
          exceededCategoriesCount: exceededCount,
          warningCategoriesCount: warningCount,
        };
      },
    }),
    {
      name: "financial_budget_store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
