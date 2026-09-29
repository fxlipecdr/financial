"use client";

import * as React from "react";
import { FinancialKPIs } from "../types/dashboard.types";
import { formatCurrency, formatPercentage } from "../lib/financial-math";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  PiggyBank,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
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
  const balanceChange = comp.balanceChangePercent;

  const isTotalPositive = totalBalanceWithPrevious >= 0;
  const isProjectedPositive = projectedEndBalance >= 0;
  const isPrevPositive = previousMonthSurplus >= 0;

  return (
    <div className="space-y-4">
      {/* 5 CARDS PRINCIPAIS INCLUINDO SALDO COM MÊS ANTERIOR */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 1. SALDO TOTAL (COM MÊS ANTERIOR) */}
        <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>Saldo com Mês Anterior</span>
              </CardTitle>
              <span className="text-[10px] text-muted-foreground block">
                Soma total em caixa
              </span>
            </div>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isTotalPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              }`}
            >
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div
              className={`text-2xl font-bold tracking-tight font-mono ${
                isTotalPositive ? "text-emerald-500" : "text-destructive"
              }`}
            >
              {formatCurrency(totalBalanceWithPrevious)}
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground space-y-0.5">
              <div className="flex items-center justify-between">
                <span>Sobra de {prevMonthName}:</span>
                <span className="font-mono font-medium text-foreground">
                  {accumulatedPreviousSurplus >= 0 ? "+" : ""}{formatCurrency(accumulatedPreviousSurplus)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Saldo de {monthName || "deste mês"}:</span>
                <span className={`font-mono font-medium ${isProjectedPositive ? "text-primary" : "text-destructive"}`}>
                  {isProjectedPositive ? "+" : ""}{formatCurrency(projectedEndBalance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. SALDO DO MÊS (RESULTADO LÍQUIDO DESTE MÊS) */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Saldo do Mês
              </CardTitle>
              <span className="text-[10px] text-muted-foreground block">
                Receita - Despesa
              </span>
            </div>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isProjectedPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              <Target className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div
              className={`text-2xl font-bold tracking-tight font-mono ${
                isProjectedPositive ? "text-foreground" : "text-destructive"
              }`}
            >
              {formatCurrency(projectedEndBalance)}
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{isProjectedPositive ? "Superávit do mês" : "Déficit do mês"}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1 py-0 gap-0.5 font-normal ${
                  balanceChange >= 0
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {balanceChange >= 0 ? "+" : ""}{balanceChange.toFixed(1)}% vs {prevMonthName}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 3. SOBRA DO MÊS ANTERIOR */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Sobra Mês Anterior
              </CardTitle>
              <span className="text-[10px] text-muted-foreground block">
                {prevMonthName}
              </span>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PiggyBank className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div
              className={`text-2xl font-bold tracking-tight font-mono ${
                isPrevPositive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {formatCurrency(previousMonthSurplus)}
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              <span>Transferido de {prevMonthName}</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. RECEITAS DO MÊS */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Receitas
              </CardTitle>
              <span className="text-[10px] text-muted-foreground block">
                Entradas em {monthName || "o mês"}
              </span>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowDownLeft className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight text-primary font-mono">
              {formatCurrency(income)}
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>vs {prevMonthName}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1 py-0 gap-0.5 font-normal ${
                  incomeChange >= 0
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-muted text-muted-foreground"
                }`}
              >
                {incomeChange >= 0 ? (
                  <TrendingUp className="size-2.5" />
                ) : (
                  <TrendingDown className="size-2.5" />
                )}
                {formatPercentage(incomeChange)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 5. DESPESAS DO MÊS */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Despesas
              </CardTitle>
              <span className="text-[10px] text-muted-foreground block">
                Saídas em {monthName || "o mês"}
              </span>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <ArrowUpRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-bold tracking-tight text-destructive font-mono">
              {formatCurrency(expenses)}
            </div>
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>vs {prevMonthName}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1 py-0 gap-0.5 font-normal ${
                  expensesChange <= 0
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {expensesChange <= 0 ? (
                  <TrendingDown className="size-2.5" />
                ) : (
                  <TrendingUp className="size-2.5" />
                )}
                {formatPercentage(expensesChange)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAIXA ANALÍTICA: ECONOMIA DO MÊS EM % E COMPARAÇÃO COM O MÊS ANTERIOR */}
      <Card className="border-border bg-card/90 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* ECONOMIA DO MÊS EM % */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <PiggyBank className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Economia do Mês:
                  </span>
                  <span className="text-lg font-bold text-foreground font-mono">
                    {savingsRate.toFixed(1)}%
                  </span>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-[11px]"
                  >
                    {savingsRate >= 20 ? "Excelente" : "Moderada"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Percentual da receita líquida retida após as despesas em {monthName || "mês corrente"}.
                </p>
              </div>
            </div>

            {/* COMPARAÇÃO COM O MÊS ANTERIOR */}
            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-6 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Variação de Saldo
                </span>
                <span
                  className={`font-mono font-semibold ${
                    balanceChange >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {balanceChange >= 0 ? "+" : ""}{balanceChange.toFixed(1)}%
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Gastos vs {comp.prevMonthName}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    expensesChange <= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {expensesChange <= 0 ? "" : "+"}{expensesChange.toFixed(1)}%
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Economia Anterior
                </span>
                <span className="font-mono font-medium text-foreground">
                  {comp.savingsRatePrevMonth.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
