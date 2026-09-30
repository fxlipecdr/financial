"use client";

import * as React from "react";
import { FinancialKPIs } from "../types/dashboard.types";
import { formatCurrency, formatPercentage } from "../lib/financial-math";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";

interface KpiCardsProps {
  kpis: FinancialKPIs;
  year: number;
  monthName?: string;
}

export function KpiCards({ kpis, year, monthName }: KpiCardsProps) {
  const comp = kpis.monthComparison;

  const currentBalance = kpis.currentBalance;
  const income = kpis.totalIncome;
  const expenses = kpis.totalExpenses;
  const projectedEndBalance = kpis.projectedEndBalance;
  const totalBalanceWithPrevious = kpis.totalBalanceWithPrevious ?? currentBalance;
  const previousMonthSurplus = kpis.previousMonthSurplus ?? 0;
  const accumulatedPreviousSurplus = kpis.accumulatedPreviousSurplus ?? previousMonthSurplus;
  const prevMonthName = kpis.prevMonthName || comp.prevMonthName || "Mês Anterior";

  // Indicadores analíticos do mês selecionado
  const savingsRate = comp.savingsRate;
  const incomeChange = comp.incomeChangePercent;
  const expensesChange = comp.expensesChangePercent;

  const isTotalPositive = totalBalanceWithPrevious >= 0;
  const isProjectedPositive = projectedEndBalance >= 0;

  return (
    <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. SALDO TOTAL EM CAIXA (HERO CARD COM SOMA DO MÊS ANTERIOR) */}
      <Card className="relative overflow-hidden border-border/80 bg-card shadow-xs hover:border-primary/40 transition-colors">
        <div className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Saldo Total em Caixa
            </span>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isTotalPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              }`}
            >
              <Wallet className="size-4" />
            </div>
          </div>

          <div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                isTotalPositive ? "text-emerald-500 dark:text-emerald-400" : "text-destructive"
              }`}
            >
              {formatCurrency(totalBalanceWithPrevious)}
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span title={`Sobra transferida de ${prevMonthName}`}>
              {prevMonthName}:{" "}
              <strong className="font-mono text-foreground">
                {accumulatedPreviousSurplus >= 0 ? "+" : ""}{formatCurrency(accumulatedPreviousSurplus)}
              </strong>
            </span>
            <span title={`Resultado gerado em ${monthName || "deste mês"}`}>
              {monthName || "Mês"}:{" "}
              <strong className={`font-mono ${isProjectedPositive ? "text-emerald-500 dark:text-emerald-400" : "text-destructive"}`}>
                {isProjectedPositive ? "+" : ""}{formatCurrency(projectedEndBalance)}
              </strong>
            </span>
          </div>
        </div>
      </Card>

      {/* 2. RECEITAS DO MÊS */}
      <Card className="border-border/80 bg-card shadow-xs hover:border-border transition-colors">
        <div className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Receitas ({monthName || "Mês"})
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <ArrowDownLeft className="size-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {formatCurrency(income)}
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>vs {prevMonthName}</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 gap-1 font-medium border-0 ${
                incomeChange >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {incomeChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {incomeChange >= 0 ? "+" : ""}{formatPercentage(incomeChange)}
            </Badge>
          </div>
        </div>
      </Card>

      {/* 3. DESPESAS DO MÊS */}
      <Card className="border-border/80 bg-card shadow-xs hover:border-border transition-colors">
        <div className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Despesas ({monthName || "Mês"})
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <ArrowUpRight className="size-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-destructive font-mono">
              {formatCurrency(expenses)}
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>vs {prevMonthName}</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 gap-1 font-medium border-0 ${
                expensesChange <= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {expensesChange <= 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
              {expensesChange <= 0 ? "" : "+"}{formatPercentage(expensesChange)}
            </Badge>
          </div>
        </div>
      </Card>

      {/* 4. RESULTADO LÍQUIDO DO MÊS */}
      <Card className="border-border/80 bg-card shadow-xs hover:border-border transition-colors">
        <div className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Resultado do Mês
            </span>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isProjectedPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              <Scale className="size-4" />
            </div>
          </div>

          <div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
                isProjectedPositive ? "text-foreground" : "text-destructive"
              }`}
            >
              {formatCurrency(projectedEndBalance)}
            </div>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {isProjectedPositive ? "Superávit mensal" : "Déficit mensal"}
            </span>
            <span
              className={`font-semibold font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${
                savingsRate >= 15
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : savingsRate > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {savingsRate >= 0 ? `${savingsRate.toFixed(1)}% poupado` : "0% poupado"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
