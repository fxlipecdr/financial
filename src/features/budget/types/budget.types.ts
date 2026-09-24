export type BudgetStatus = "safe" | "warning" | "exceeded";

export interface CategoryBudgetProgress {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
  transactionCount: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentage: number;
  status: BudgetStatus;
  exceededCategoriesCount: number;
  warningCategoriesCount: number;
}
