import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Category, CategoryInput } from "../types/category.types";

export const DEFAULT_CATEGORIES: Category[] = [
  // Despesas
  {
    id: "moradia",
    name: "Moradia",
    color: "#6366f1",
    type: "expense",
    defaultLimit: 2500,
    isSystem: true,
  },
  {
    id: "alimentacao",
    name: "Alimentação",
    color: "#f59e0b",
    type: "expense",
    defaultLimit: 1600,
    isSystem: true,
  },
  {
    id: "transporte",
    name: "Transporte",
    color: "#3b82f6",
    type: "expense",
    defaultLimit: 700,
    isSystem: true,
  },
  {
    id: "saude",
    name: "Saúde",
    color: "#ec4899",
    type: "expense",
    defaultLimit: 700,
    isSystem: true,
  },
  {
    id: "lazer_outros",
    name: "Lazer/Outros",
    color: "#8b5cf6",
    type: "expense",
    defaultLimit: 600,
    isSystem: true,
  },
  {
    id: "educacao",
    name: "Educação",
    color: "#14b8a6",
    type: "expense",
    defaultLimit: 300,
    isSystem: true,
  },
  // Receitas
  {
    id: "salario",
    name: "Salário Principal",
    color: "#10b981",
    type: "income",
    isSystem: true,
  },
  {
    id: "freelance",
    name: "Freelance / Serviços",
    color: "#06b6d4",
    type: "income",
    isSystem: true,
  },
  {
    id: "investimentos",
    name: "Rendimentos & Investimentos",
    color: "#8b5cf6",
    type: "income",
    isSystem: true,
  },
  {
    id: "outras_receitas",
    name: "Outras Entradas",
    color: "#64748b",
    type: "income",
    isSystem: true,
  },
];

interface CategoryState {
  categories: Category[];
  addCategory: (input: CategoryInput) => Category;
  updateCategory: (id: string, updates: Partial<CategoryInput>) => void;
  deleteCategory: (id: string) => boolean;
  resetToDefaults: () => void;
  getCategoryById: (id: string) => Category;
  getExpenseCategories: () => Category[];
  getIncomeCategories: () => Category[];
}

function generateSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || "cat";
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: [...DEFAULT_CATEGORIES],

      addCategory: (input) => {
        const slugBase = generateSlug(input.name);
        const existing = get().categories.find((c) => c.id === slugBase);
        const id = existing ? `${slugBase}_${Date.now()}` : slugBase;

        const newCategory: Category = {
          id,
          name: input.name.trim(),
          color: input.color || "#6366f1",
          type: input.type,
          defaultLimit: input.type === "expense" ? (input.defaultLimit ?? 0) : undefined,
          isSystem: false,
        };

        set((state) => ({
          categories: [...state.categories, newCategory],
        }));

        return newCategory;
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) => {
            if (cat.id !== id) return cat;
            return {
              ...cat,
              name: updates.name !== undefined ? updates.name.trim() : cat.name,
              color: updates.color !== undefined ? updates.color : cat.color,
              type: updates.type !== undefined ? updates.type : cat.type,
              defaultLimit:
                updates.type === "expense" || (updates.type === undefined && cat.type === "expense")
                  ? updates.defaultLimit !== undefined
                    ? updates.defaultLimit
                    : cat.defaultLimit
                  : undefined,
            };
          }),
        }));
      },

      deleteCategory: (id) => {
        const current = get().categories;
        const exists = current.some((c) => c.id === id);
        if (!exists) return false;

        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
        return true;
      },

      resetToDefaults: () => {
        set({ categories: [...DEFAULT_CATEGORIES] });
      },

      getCategoryById: (id) => {
        const cat = get().categories.find((c) => c.id === id);
        if (cat) return cat;

        // Fallback defensivo
        return {
          id,
          name: id,
          color: "#64748b",
          type: "expense",
          defaultLimit: 0,
        };
      },

      getExpenseCategories: () => {
        return get().categories.filter((c) => c.type === "expense");
      },

      getIncomeCategories: () => {
        return get().categories.filter((c) => c.type === "income");
      },
    }),
    {
      name: "financial_categories_store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
