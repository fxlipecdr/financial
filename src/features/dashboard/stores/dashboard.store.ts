import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MonthData, DashboardState, YearFinancialData } from "../types/dashboard.types";
import { calculateBalance, calculateSavingsRate, computeKPIs } from "../lib/financial-math";

import { Transaction } from "@/features/transactions/types/transaction.types";

export const MONTH_NAMES = [
  { short: "Jan", full: "Janeiro" },
  { short: "Fev", full: "Fevereiro" },
  { short: "Mar", full: "Março" },
  { short: "Abr", full: "Abril" },
  { short: "Mai", full: "Maio" },
  { short: "Jun", full: "Junho" },
  { short: "Jul", full: "Julho" },
  { short: "Ago", full: "Agosto" },
  { short: "Set", full: "Setembro" },
  { short: "Out", full: "Outubro" },
  { short: "Nov", full: "Novembro" },
  { short: "Dez", full: "Dezembro" },
];

export const EMPTY_YEAR_VALUES: [number, number][] = [
  [0, 0], [0, 0], [0, 0], [0, 0],
  [0, 0], [0, 0], [0, 0], [0, 0],
  [0, 0], [0, 0], [0, 0], [0, 0],
];

/**
 * Retorna uma lista ordenada de anos disponíveis para seleção, incluindo um range
 * amplo (2024 até 2035+) mais qualquer ano presente em transações já cadastradas.
 */
export function getAvailableYears(transactions: Transaction[] = [], baseYear = 2026): number[] {
  const currentCalYear = new Date().getFullYear();
  const yearSet = new Set<number>();

  const minYear = Math.min(2024, currentCalYear - 2);
  const maxYear = Math.max(2035, currentCalYear + 9);
  for (let y = minYear; y <= maxYear; y++) {
    yearSet.add(y);
  }
  yearSet.add(baseYear);

  if (Array.isArray(transactions)) {
    transactions.forEach((tx) => {
      if (tx?.date) {
        const txYear = parseInt(tx.date.substring(0, 4), 10);
        if (!isNaN(txYear) && txYear >= 2000 && txYear <= 2100) {
          yearSet.add(txYear);
        }
      }
    });
  }

  return Array.from(yearSet).sort((a, b) => a - b);
}

export function computeYearDataFromTransactions(
  year: number,
  transactions: Transaction[],
  targetMonth: number
): YearFinancialData {
  const yearPrefix = `${year}-`;

  // Mapeia todas as transações por YYYY-MM cronológico
  const monthSums = new Map<string, { income: number; expenses: number; balance: number }>();
  if (Array.isArray(transactions)) {
    for (const tx of transactions) {
      if (!tx?.date || tx.date.length < 7) continue;
      const ym = tx.date.substring(0, 7);
      const curr = monthSums.get(ym) || { income: 0, expenses: 0, balance: 0 };
      if (tx.type === "income") {
        curr.income += Number(tx.amount) || 0;
      } else {
        curr.expenses += Number(tx.amount) || 0;
      }
      curr.balance = curr.income - curr.expenses;
      monthSums.set(ym, curr);
    }
  }

  const sortedYms = Array.from(monthSums.keys()).sort();

  function getCarryoverForMonth(targetYm: string): {
    previousBalance: number;
    immediatePrevSurplus: number;
    prevMonthName: string;
  } {
    const [y, m] = targetYm.split("-").map(Number);
    let prevYear = y;
    let prevMonth = m - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear--;
    }
    const prevYm = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
    const prevMonthName = MONTH_NAMES[prevMonth - 1]?.full || "Mês Anterior";

    const prevData = monthSums.get(prevYm);
    const immediatePrevSurplus =
      prevData && prevData.income > 0 ? Math.max(0, prevData.balance) : 0;

    let cumulative = 0;
    let started = false;
    for (const ym of sortedYms) {
      if (ym >= targetYm) break;
      const d = monthSums.get(ym)!;
      if (d.income > 0) started = true;
      if (started) cumulative += d.balance;
    }
    const previousBalance = started ? cumulative : 0;
    return { previousBalance, immediatePrevSurplus, prevMonthName };
  }

  const months: MonthData[] = MONTH_NAMES.map((m, index) => {
    const monthNum = index + 1;
    const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const ymPrefix = `${yearPrefix}${monthStr}`;

    const monthTxs = Array.isArray(transactions)
      ? transactions.filter((tx) => tx.date.startsWith(ymPrefix))
      : [];

    const income = monthTxs
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expenses = monthTxs
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const balance = calculateBalance(income, expenses);
    const savingsRate = calculateSavingsRate(income, expenses);

    const { previousBalance } = getCarryoverForMonth(ymPrefix);
    const accumulatedBalance = previousBalance + balance;

    return {
      monthIndex: index,
      monthName: m.short,
      monthFullName: m.full,
      income,
      expenses,
      balance,
      savingsRate,
      previousBalance,
      accumulatedBalance,
    };
  });

  const targetMonthStr = targetMonth + 1 < 10 ? `0${targetMonth + 1}` : `${targetMonth + 1}`;
  const targetCarryover = getCarryoverForMonth(`${yearPrefix}${targetMonthStr}`);
  const kpis = computeKPIs(months, targetMonth, targetCarryover);

  return {
    year,
    months,
    kpis,
  };
}

function buildYearData(year: number, rawValues: [number, number][], targetMonth = 8): YearFinancialData {
  let running = 0;
  const months: MonthData[] = MONTH_NAMES.map((m, index) => {
    const [income, expenses] = rawValues[index] || [0, 0];
    const balance = calculateBalance(income, expenses);
    const savingsRate = calculateSavingsRate(income, expenses);
    const previousBalance = running;
    running += balance;
    const accumulatedBalance = running;

    return {
      monthIndex: index,
      monthName: m.short,
      monthFullName: m.full,
      income,
      expenses,
      balance,
      savingsRate,
      previousBalance,
      accumulatedBalance,
    };
  });

  const kpis = computeKPIs(months, targetMonth);

  return {
    year,
    months,
    kpis,
  };
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      currentYear: 2026,
      selectedMonth: 8, // Setembro por padrão
      availableYears: getAvailableYears([], 2026),
      yearData: buildYearData(2026, EMPTY_YEAR_VALUES, 8),

      setYear: (year: number) => {
        const currentMonth = get().selectedMonth;
        const years = getAvailableYears([], year);
        set({
          currentYear: year,
          availableYears: years,
          yearData: buildYearData(year, EMPTY_YEAR_VALUES, currentMonth),
        });
      },

      setSelectedMonth: (month: number) => {
        const state = get();
        const safeMonth = Math.max(0, Math.min(11, month));
        const kpis = computeKPIs(state.yearData.months, safeMonth);
        set({
          selectedMonth: safeMonth,
          yearData: {
            ...state.yearData,
            kpis,
          },
        });
      },

      updateMonthData: (monthIndex: number, income: number, expenses: number) => {
        const state = get();
        const updatedMonths = state.yearData.months.map((m) => {
          if (m.monthIndex !== monthIndex) return m;

          return {
            ...m,
            income,
            expenses,
            balance: calculateBalance(income, expenses),
            savingsRate: calculateSavingsRate(income, expenses),
          };
        });

        const kpis = computeKPIs(updatedMonths, state.selectedMonth);

        set({
          yearData: {
            ...state.yearData,
            months: updatedMonths,
            kpis,
          },
        });
      },
    }),
    {
      name: "financial_dashboard_store",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const month = typeof state.selectedMonth === "number" ? state.selectedMonth : 8;
          state.selectedMonth = month;
          const year = typeof state.currentYear === "number" ? state.currentYear : 2026;
          state.currentYear = year;
          // Garante que mesmo com versões antigas no cache do navegador, a lista completa de anos fique ativa
          state.availableYears = getAvailableYears([], year);
          if (state.yearData && state.yearData.months) {
            state.yearData.kpis = computeKPIs(state.yearData.months, month);
          }
        }
      },
    }
  )
);
