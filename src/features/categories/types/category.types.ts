export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  color: string;
  type: CategoryType;
  defaultLimit?: number; // Teto mensal padrão / sugerido (aplicável a despesas)
  isSystem?: boolean;
}

export interface CategoryInput {
  name: string;
  color: string;
  type: CategoryType;
  defaultLimit?: number;
}
