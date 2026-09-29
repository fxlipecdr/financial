import Decimal from "decimal.js";
import { MonthData, FinancialKPIs, MonthComparison } from "../types/dashboard.types";

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value || 0);
}

export function calculateBalance(income: number, expenses: number): number {
  const inc = toDecimal(income);
  const exp = toDecimal(expenses);
  return inc.minus(exp).toNumber();
}

export function calculateSavingsRate(income: number, expenses: number): number {
  const inc = toDecimal(income);
  const exp = toDecimal(expenses);

  if (inc.isZero() || inc.isNegative()) {
    return 0;
  }

  const balance = inc.minus(exp);
  const rate = balance.dividedBy(inc).times(100);
  return rate.toDecimalPlaces(1).toNumber();
}

export function calculatePercentageChange(current: number, previous: number): number {
  const curr = toDecimal(current);
  const prev = toDecimal(previous);

  if (prev.isZero()) {
    return 0;
  }

  return curr.minus(prev).dividedBy(prev.abs()).times(100).toDecimalPlaces(1).toNumber();
}

export function formatCurrency(value: number | string | Decimal): string {
  const num = typeof value === "number" ? value : toDecimal(value).toNumber();
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function computeKPIs(
  months: MonthData[],
  targetMonthIdx = 8,
  carryoverInfo?: { previousBalance: number; immediatePrevSurplus: number; prevMonthName: string }
): FinancialKPIs {
  let totalIncomeDec = new Decimal(0);
  let totalExpensesDec = new Decimal(0);

  let highestIncome = new Decimal(-1);
  let highestExpense = new Decimal(-1);
  let highestIncomeMonth = "-";
  let highestExpenseMonth = "-";

  const currentMonthIdx = Math.max(0, Math.min(targetMonthIdx, months.length - 1));

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const inc = toDecimal(m.income);
    const exp = toDecimal(m.expenses);

    totalIncomeDec = totalIncomeDec.plus(inc);
    totalExpensesDec = totalExpensesDec.plus(exp);

    if (inc.greaterThan(highestIncome)) {
      highestIncome = inc;
      highestIncomeMonth = m.monthFullName;
    }

    if (exp.greaterThan(highestExpense)) {
      highestExpense = exp;
      highestExpenseMonth = m.monthFullName;
    }
  }

  const currentMonth = months[currentMonthIdx] || months[0];
  const prevMonth = currentMonthIdx > 0 ? months[currentMonthIdx - 1] : null;

  const currentMonthIncome = toDecimal(currentMonth.income);
  const currentMonthExpenses = toDecimal(currentMonth.expenses);
  const currentMonthBalance = currentMonthIncome.minus(currentMonthExpenses);

  const prevMonthIncome = prevMonth ? toDecimal(prevMonth.income) : currentMonthIncome;
  const prevMonthExpenses = prevMonth ? toDecimal(prevMonth.expenses) : currentMonthExpenses;
  const prevMonthBalance = prevMonth ? prevMonthIncome.minus(prevMonthExpenses) : currentMonthBalance;

  // Economia do mês em %: ((Receita - Despesa) / Receita) * 100
  const savingsRate = currentMonthIncome.greaterThan(0)
    ? currentMonthBalance.dividedBy(currentMonthIncome).times(100).toDecimalPlaces(1).toNumber()
    : 0;

  const savingsRatePrevMonth = prevMonth && prevMonthIncome.greaterThan(0)
    ? prevMonthBalance.dividedBy(prevMonthIncome).times(100).toDecimalPlaces(1).toNumber()
    : savingsRate;

  const incomeChangePercent = prevMonth
    ? calculatePercentageChange(currentMonthIncome.toNumber(), prevMonthIncome.toNumber())
    : 0;
  const expensesChangePercent = prevMonth
    ? calculatePercentageChange(currentMonthExpenses.toNumber(), prevMonthExpenses.toNumber())
    : 0;
  const balanceChangePercent = prevMonth
    ? calculatePercentageChange(currentMonthBalance.toNumber(), prevMonthBalance.toNumber())
    : 0;

  // Sobra e acumulação de meses anteriores
  const previousMonthSurplus = carryoverInfo
    ? carryoverInfo.immediatePrevSurplus
    : prevMonth
      ? Math.max(0, prevMonthBalance.toNumber())
      : 0;

  const accumulatedPreviousSurplus = carryoverInfo
    ? carryoverInfo.previousBalance
    : prevMonth
      ? Math.max(0, prevMonthBalance.toNumber())
      : 0;

  const prevMonthName = carryoverInfo
    ? carryoverInfo.prevMonthName
    : prevMonth
      ? prevMonth.monthFullName
      : "Início do Ano";

  const monthComparison: MonthComparison = {
    savingsRate,
    savingsRatePrevMonth,
    incomeChangePercent,
    expensesChangePercent,
    balanceChangePercent,
    prevMonthName,
  };

  // Saldo Total: Sobra acumulada vinda do mês anterior + Saldo gerado no mês atual
  const totalBalanceWithPrevious = toDecimal(accumulatedPreviousSurplus)
    .plus(currentMonthBalance)
    .toNumber();

  const currentBalance = totalBalanceWithPrevious;
  const projectedEndBalance = currentMonthBalance.toNumber();

  const totalIncome = currentMonthIncome.toNumber();
  const totalExpenses = currentMonthExpenses.toNumber();
  const netBalance = currentMonthBalance.toNumber();

  return {
    currentBalance,
    totalIncome,
    totalExpenses,
    projectedEndBalance,
    previousMonthSurplus,
    accumulatedPreviousSurplus,
    totalBalanceWithPrevious,
    prevMonthName,
    monthComparison,
    netBalance,
    savingsRate,
    highestExpenseMonth,
    highestIncomeMonth,
  };
}

export interface DailySpendingBudget {
  dailyAmount: number;
  currentBalance: number;
  futureExpenses: number;
  netFreeToSpend: number;
  daysRemaining: number;
  totalDaysInMonth: number;
  currentDay: number;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
  isExceeded: boolean;
  committedPercentage: number;
  monthlySurplusDaily: number;
  monthlyRemaining: number;
}

export function calculateDailySpending(
  currentBalance: number,
  futureExpenses: number,
  selectedMonth: number,
  selectedYear: number,
  monthlyIncome = 0,
  monthlyExpenses = 0,
  referenceDate: Date = new Date()
): DailySpendingBudget {
  const balanceDec = toDecimal(currentBalance);
  const futureExpDec = toDecimal(futureExpenses);
  const netFreeDec = balanceDec.minus(futureExpDec);

  const inc = toDecimal(monthlyIncome);
  const exp = toDecimal(monthlyExpenses);
  const monthlyRemainingDec = inc.minus(exp);

  const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const currentRealYear = referenceDate.getFullYear();
  const currentRealMonth = referenceDate.getMonth();
  const currentRealDay = referenceDate.getDate();

  const isCurrentMonth = selectedYear === currentRealYear && selectedMonth === currentRealMonth;
  const isPastMonth =
    selectedYear < currentRealYear ||
    (selectedYear === currentRealYear && selectedMonth < currentRealMonth);
  const isFutureMonth =
    selectedYear > currentRealYear ||
    (selectedYear === currentRealYear && selectedMonth > currentRealMonth);

  let daysRemaining = totalDaysInMonth;
  if (isCurrentMonth) {
    daysRemaining = Math.max(1, totalDaysInMonth - currentRealDay + 1);
  } else if (isPastMonth) {
    daysRemaining = totalDaysInMonth;
  }

  const isExceeded = futureExpDec.greaterThan(balanceDec) || netFreeDec.isNegative();

  const dailyAmountDec =
    !isExceeded && daysRemaining > 0
      ? netFreeDec.dividedBy(daysRemaining).toDecimalPlaces(2)
      : new Decimal(0);

  const monthlySurplusDailyDec =
    monthlyRemainingDec.greaterThan(0) && daysRemaining > 0
      ? monthlyRemainingDec.dividedBy(daysRemaining).toDecimalPlaces(2)
      : new Decimal(0);

  const committedPercentage = balanceDec.greaterThan(0)
    ? futureExpDec.dividedBy(balanceDec).times(100).toDecimalPlaces(1).toNumber()
    : 0;

  return {
    dailyAmount: dailyAmountDec.toNumber(),
    currentBalance: balanceDec.toNumber(),
    futureExpenses: futureExpDec.toNumber(),
    netFreeToSpend: Math.max(0, netFreeDec.toNumber()),
    daysRemaining,
    totalDaysInMonth,
    currentDay: isCurrentMonth ? currentRealDay : isPastMonth ? totalDaysInMonth : 1,
    isCurrentMonth,
    isPastMonth,
    isFutureMonth,
    isExceeded,
    committedPercentage: Math.min(100, Math.max(0, committedPercentage)),
    monthlySurplusDaily: monthlySurplusDailyDec.toNumber(),
    monthlyRemaining: Math.max(0, monthlyRemainingDec.toNumber()),
  };
}
