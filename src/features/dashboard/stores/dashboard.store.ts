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

  const months: MonthData[] = MONTH_NAMES.map((m, index) => {
    const monthNum = index + 1;
    const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const ymPrefix = `${yearPrefix}${monthStr}`;

    const monthTxs = transactions.filter((tx) => tx.date.startsWith(ymPrefix));

    const income = monthTxs
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expenses = monthTxs
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const balance = calculateBalance(income, expenses);
    const savingsRate = calculateSavingsRate(income, expenses);

    return {
      monthIndex: index,
      monthName: m.short,
      monthFullName: m.full,
      income,
      expenses,
      balance,
      savingsRate,
    };
  });

  const kpis = computeKPIs(months, targetMonth);

  return {
    year,
    months,
    kpis,
  };
}

function buildYearData(year: number, rawValues: [number, number][], targetMonth = 8): YearFinancialData {
  const months: MonthData[] = MONTH_NAMES.map((m, index) => {
    const [income, expenses] = rawValues[index] || [0, 0];
    const balance = calculateBalance(income, expenses);
    const savingsRate = calculateSavingsRate(income, expenses);

    return {
      monthIndex: index,
      monthName: m.short,
      monthFullName: m.full,
      income,
      expenses,
      balance,
      savingsRate,
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
