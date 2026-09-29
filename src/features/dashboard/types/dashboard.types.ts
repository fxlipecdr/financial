export interface MonthData {
  monthIndex: number; // 0 a 11
  monthName: string;  // Jan, Fev, etc.
  monthFullName: string; // Janeiro, Fevereiro, etc.
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  previousBalance?: number;     // Saldo vindo do mês anterior
  accumulatedBalance?: number;  // Saldo acumulado somando o mês anterior
}

export interface MonthComparison {
  savingsRate: number;           // Economia do mês em %
  savingsRatePrevMonth: number;  // Economia do mês anterior em %
  incomeChangePercent: number;   // Variação de receitas vs mês anterior
  expensesChangePercent: number; // Variação de despesas vs mês anterior
  balanceChangePercent: number;  // Variação de saldo vs mês anterior
  prevMonthName: string;         // Nome do mês anterior (ex: "Agosto")
}

export interface FinancialKPIs {
  currentBalance: number;          // Saldo Total Acumulado (com Mês Anterior)
  totalIncome: number;             // Receitas
  totalExpenses: number;           // Despesas
  projectedEndBalance: number;     // Saldo do Mês Atual (Receita - Despesa)
  previousMonthSurplus: number;    // O que sobrou do mês anterior imediato
  accumulatedPreviousSurplus: number; // Saldo acumulado vindo de todos os meses anteriores
  totalBalanceWithPrevious: number;// Saldo que tenho contando o que sobrou do mês anterior na soma
  prevMonthName: string;           // Nome do mês anterior (ex: "Outubro")
  monthComparison: MonthComparison;// Economia do mês e comparação
  netBalance: number;
  savingsRate: number;
  highestExpenseMonth: string;
  highestIncomeMonth: string;
}

export interface YearFinancialData {
  year: number;
  months: MonthData[];
  kpis: FinancialKPIs;
}

export interface DashboardState {
  currentYear: number;
  selectedMonth: number; // 0 a 11
  availableYears: number[];
  yearData: YearFinancialData;
  setYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  updateMonthData: (monthIndex: number, income: number, expenses: number) => void;
}
