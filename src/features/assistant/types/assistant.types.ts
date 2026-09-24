export type HealthRating = "Excelente" | "Boa" | "Atenção" | "Crítica";

export interface HealthFactor {
  id: string;
  name: string;
  score: number; // 0 - 100
  status: "good" | "warning" | "bad";
  description: string;
}

export interface FinancialHealthScore {
  score: number; // 0 a 100
  rating: HealthRating;
  color: string;
  summary: string;
  factors: HealthFactor[];
}

export interface Rule503020Breakdown {
  totalIncome: number;
  totalExpenses: number;
  needsAmount: number;
  needsPercent: number; // Ideal: até 50%
  wantsAmount: number;
  wantsPercent: number; // Ideal: até 30%
  savingsAmount: number;
  savingsPercent: number; // Ideal: pelo menos 20%
  status: "balanced" | "wants_heavy" | "needs_heavy" | "deficit";
  recommendation: string;
}

export interface CostCuttingAdvice {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  type: "over_budget" | "high_proportion" | "discretionary_leak";
  currentSpent: number;
  budgetLimit: number;
  overspentAmount: number;
  suggestedCutAmount: number;
  dailyImpactRecovery: number; // Quanto devolve ao "Quanto posso gastar por dia"
  title: string;
  actionTip: string;
  priority: "high" | "medium" | "low";
}

export interface EmergencyFundStatus {
  monthlyBurnRate: number; // Média de despesas essenciais mensais
  target3Months: number;
  target6Months: number;
  currentFreeCash: number;
  currentFundingPercent: number;
  surplusAllocationTips: {
    title: string;
    description: string;
    percentage: number;
    amount: number;
  }[];
}

export interface PurchaseSimulationInput {
  itemDescription: string;
  amount: number;
  isInstallment: boolean;
  installmentsCount: number;
}

export interface PurchaseSimulationResult {
  verdict: "safe" | "caution" | "risky";
  verdictLabel: string;
  badgeVariant: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" | "border-amber-500/30 bg-amber-500/10 text-amber-600" | "border-rose-500/30 bg-rose-500/10 text-rose-600";
  headline: string;
  monthlyImpact: number;
  dailyImpact: number;
  freeBalanceAfterPurchase: number;
  explanation: string;
  recommendation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  suggestions?: string[];
}

export interface AssistantDiagnosticReport {
  healthScore: FinancialHealthScore;
  rule503020: Rule503020Breakdown;
  costCuttingOpportunities: CostCuttingAdvice[];
  emergencyFund: EmergencyFundStatus;
  quickInsights: string[];
}
