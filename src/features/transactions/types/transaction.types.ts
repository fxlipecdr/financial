export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "pending";

export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // YYYY-MM-DD
  status?: TransactionStatus;
  installmentIndex?: number;
  totalInstallments?: number;
  installmentGroupId?: string;
  createdAt: string;
}

export interface CategoryExpenseSummary {
  category: string;
  name: string;
  total: number;
  percentage: number;
  color: string;
}

export interface MonthlyTransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  paidExpenses: number;
  pendingExpenses: number;
  pendingCount: number;
}
