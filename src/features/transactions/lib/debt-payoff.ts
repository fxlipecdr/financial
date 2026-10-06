import Decimal from "decimal.js";
import { Transaction } from "../types/transaction.types";
import { formatCurrency } from "@/features/dashboard/lib/financial-math";

export interface DebtItem {
  id: string; // installmentGroupId ou tx.id
  description: string;
  category: string;
  totalRemaining: number;
  monthlyCost: number;
  installmentsCount: number;
  transactions: Transaction[];
  status: "fully_paid" | "partially_paid" | "unpaid";
}

export interface MonthlyRelief {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Outubro / 2026"
  originalExpenses: number;
  paidExpenses: number;
  newExpenses: number;
  amountFreed: number;
}

export interface DebtPayoffOptions {
  availableAmount: number;
  transactions: Transaction[];
  mode?: "by_debt" | "by_transaction";
  scope?: "from_start_month" | "selected_month" | "all_pending";
  startMonth?: number; // 0-11 (ex: 9 = Outubro)
  startYear?: number;
  selectedMonth?: number; // mantido para compatibilidade
  selectedYear?: number;
}

export interface DebtPayoffResult {
  availableAmount: number;
  totalUsed: number;
  remainingChange: number;
  totalDebtsCount: number;
  debtsPaidCount: number;
  totalTransactionsCount: number;
  transactionsPaidCount: number;
  startMonthKey: string;
  startMonthLabel: string;
  immediateMonthlyRelief: number;
  startMonthRelief: number;
  averageMonthlyRelief: number;
  totalFreedAcrossAllMonths: number;
  paidDebts: DebtItem[];
  unpaidDebts: DebtItem[];
  nextDebtToPay?: {
    description: string;
    totalRemaining: number;
    amountNeeded: number;
  };
  monthlyReliefTimeline: MonthlyRelief[];
  paidTransactionIds: string[];
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function getMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  const name = MONTH_NAMES[monthIdx] || monthStr;
  return `${name} / ${yearStr}`;
}

/**
 * Simula a quitação de dívidas/lançamentos priorizando os menores valores até os maiores (Método Bola de Neve),
 * calculando exatamente quantos lançamentos são quitados e quanto dinheiro é liberado mês a mês no orçamento
 * a partir de um mês de referência especificado ("daqui para frente").
 */
export function calculateDebtPayoff({
  availableAmount,
  transactions,
  mode = "by_debt",
  scope = "from_start_month",
  startMonth,
  startYear,
  selectedMonth,
  selectedYear,
}: DebtPayoffOptions): DebtPayoffResult {
  const availableDec = new Decimal(Math.max(0, availableAmount || 0));

  const now = new Date();
  const effectiveMonth =
    startMonth !== undefined
      ? startMonth
      : selectedMonth !== undefined
      ? selectedMonth
      : now.getMonth();
  const effectiveYear =
    startYear !== undefined
      ? startYear
      : selectedYear !== undefined
      ? selectedYear
      : now.getFullYear();

  const startMonthKey = `${effectiveYear}-${String(effectiveMonth + 1).padStart(2, "0")}`;
  const startMonthLabel = getMonthLabel(startMonthKey);

  // 1. Filtra despesas pendentes
  let pendingTxs = transactions.filter(
    (tx) => tx.type === "expense" && tx.status === "pending"
  );

  // Filtro temporal
  if (scope === "selected_month") {
    // Apenas o mês especificado
    pendingTxs = pendingTxs.filter((tx) => tx.date.startsWith(startMonthKey));
  } else if (scope === "from_start_month" || scope === undefined) {
    // A partir do mês especificado em diante ("daqui para frente")
    pendingTxs = pendingTxs.filter((tx) => tx.date.slice(0, 7) >= startMonthKey);
  }
  // Se scope === "all_pending", não filtra por data

  // 2. Agrupamento ou lista individual
  let debtItems: DebtItem[] = [];

  if (mode === "by_debt") {
    // Agrupa compras parceladas pelo installmentGroupId
    const groupMap = new Map<string, Transaction[]>();
    const standaloneTxs: Transaction[] = [];

    for (const tx of pendingTxs) {
      if (tx.installmentGroupId) {
        const list = groupMap.get(tx.installmentGroupId) || [];
        list.push(tx);
        groupMap.set(tx.installmentGroupId, list);
      } else {
        standaloneTxs.push(tx);
      }
    }

    // Cria DebtItem para compras parceladas
    groupMap.forEach((txList, groupId) => {
      // Ordena por data
      txList.sort((a, b) => a.date.localeCompare(b.date));
      let totalRemainingDec = new Decimal(0);
      for (const t of txList) {
        totalRemainingDec = totalRemainingDec.plus(new Decimal(t.amount));
      }

      // Descrição limpa (remove o sufixo (X/Y))
      const cleanDesc = txList[0].description.replace(/\s*\(\d+\/\d+\)$/, "");

      debtItems.push({
        id: groupId,
        description: cleanDesc,
        category: txList[0].category,
        totalRemaining: totalRemainingDec.toNumber(),
        monthlyCost: txList[0].amount,
        installmentsCount: txList.length,
        transactions: txList,
        status: "unpaid",
      });
    });

    // Cria DebtItem para lançamentos avulsos
    for (const tx of standaloneTxs) {
      debtItems.push({
        id: tx.id,
        description: tx.description,
        category: tx.category,
        totalRemaining: tx.amount,
        monthlyCost: tx.amount,
        installmentsCount: 1,
        transactions: [tx],
        status: "unpaid",
      });
    }
  } else {
    // Modo "by_transaction": cada lançamento individual é uma dívida
    for (const tx of pendingTxs) {
      debtItems.push({
        id: tx.id,
        description: tx.description,
        category: tx.category,
        totalRemaining: tx.amount,
        monthlyCost: tx.amount,
        installmentsCount: 1,
        transactions: [tx],
        status: "unpaid",
      });
    }
  }

  // 3. Ordenação Bola de Neve: Menores valores até os maiores
  debtItems.sort((a, b) => {
    // Menor totalRemaining primeiro
    if (a.totalRemaining !== b.totalRemaining) {
      return a.totalRemaining - b.totalRemaining;
    }
    // Desempate: quem libera mais por mês primeiro
    return b.monthlyCost - a.monthlyCost;
  });

  // 4. Execução da simulação
  let currentBalanceDec = new Decimal(availableDec);
  let totalUsedDec = new Decimal(0);
  const paidDebts: DebtItem[] = [];
  const unpaidDebts: DebtItem[] = [];
  const paidTxIdSet = new Set<string>();

  let nextDebtToPay: DebtPayoffResult["nextDebtToPay"] | undefined;

  for (const item of debtItems) {
    const costDec = new Decimal(item.totalRemaining);

    if (currentBalanceDec.greaterThanOrEqualTo(costDec)) {
      // Quitado integralmente
      currentBalanceDec = currentBalanceDec.minus(costDec);
      totalUsedDec = totalUsedDec.plus(costDec);
      item.status = "fully_paid";
      paidDebts.push(item);
      item.transactions.forEach((tx) => paidTxIdSet.add(tx.id));
    } else {
      // Não foi possível quitar integralmente
      item.status = "unpaid";
      unpaidDebts.push(item);

      if (!nextDebtToPay && currentBalanceDec.greaterThan(0)) {
        nextDebtToPay = {
          description: item.description,
          totalRemaining: item.totalRemaining,
          amountNeeded: costDec.minus(currentBalanceDec).toNumber(),
        };
      }
    }
  }

  // 5. Cálculo do Alívio Mês a Mês
  // Coleta todos os meses presentes nas transações pendentes
  const monthKeySet = new Set<string>();
  // Inclui sempre o mês de início selecionado para garantir referência visual clara
  monthKeySet.add(startMonthKey);
  for (const tx of pendingTxs) {
    monthKeySet.add(tx.date.slice(0, 7));
  }

  const sortedMonths = Array.from(monthKeySet).sort();

  const monthlyReliefTimeline: MonthlyRelief[] = [];
  let totalFreedAcrossAllMonthsDec = new Decimal(0);

  for (const monthKey of sortedMonths) {
    const txsInMonth = pendingTxs.filter((t) => t.date.startsWith(monthKey));

    let originalMonthExpDec = new Decimal(0);
    let paidMonthExpDec = new Decimal(0);

    for (const tx of txsInMonth) {
      const amtDec = new Decimal(tx.amount);
      originalMonthExpDec = originalMonthExpDec.plus(amtDec);
      if (paidTxIdSet.has(tx.id)) {
        paidMonthExpDec = paidMonthExpDec.plus(amtDec);
      }
    }

    const freedDec = paidMonthExpDec;
    const newExpDec = originalMonthExpDec.minus(freedDec);
    totalFreedAcrossAllMonthsDec = totalFreedAcrossAllMonthsDec.plus(freedDec);

    monthlyReliefTimeline.push({
      monthKey,
      monthLabel: getMonthLabel(monthKey),
      originalExpenses: originalMonthExpDec.toNumber(),
      paidExpenses: paidMonthExpDec.toNumber(),
      newExpenses: newExpDec.toNumber(),
      amountFreed: freedDec.toNumber(),
    });
  }

  // Alívio especificamente no mês inicial selecionado
  const startMonthObj = monthlyReliefTimeline.find((m) => m.monthKey === startMonthKey);
  const startMonthRelief = startMonthObj ? startMonthObj.amountFreed : 0;

  // Alívio mensal imediato (no mês inicial ou no primeiro mês ativo com economia)
  const firstMonthWithFreed = monthlyReliefTimeline.find((m) => m.amountFreed > 0);
  const immediateMonthlyRelief =
    startMonthRelief > 0 ? startMonthRelief : (firstMonthWithFreed ? firstMonthWithFreed.amountFreed : 0);

  // Média mensal liberada
  const monthsWithRelief = monthlyReliefTimeline.filter((m) => m.amountFreed > 0);
  const averageMonthlyRelief =
    monthsWithRelief.length > 0
      ? totalFreedAcrossAllMonthsDec.dividedBy(monthsWithRelief.length).toDecimalPlaces(2).toNumber()
      : 0;

  // Total de transações individuais quitadas
  let transactionsPaidCount = 0;
  for (const debt of paidDebts) {
    transactionsPaidCount += debt.transactions.length;
  }

  return {
    availableAmount: availableDec.toNumber(),
    totalUsed: totalUsedDec.toNumber(),
    remainingChange: currentBalanceDec.toNumber(),
    totalDebtsCount: debtItems.length,
    debtsPaidCount: paidDebts.length,
    totalTransactionsCount: pendingTxs.length,
    transactionsPaidCount,
    startMonthKey,
    startMonthLabel,
    immediateMonthlyRelief,
    startMonthRelief,
    averageMonthlyRelief,
    totalFreedAcrossAllMonths: totalFreedAcrossAllMonthsDec.toNumber(),
    paidDebts,
    unpaidDebts,
    nextDebtToPay,
    monthlyReliefTimeline,
    paidTransactionIds: Array.from(paidTxIdSet),
  };
}
