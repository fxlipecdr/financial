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

  // Indicadores analíticos do mês selecionado
  const savingsRate = comp.savingsRate;
  const incomeChange = comp.incomeChangePercent;
  const expensesChange = comp.expensesChangePercent;
  const balanceChange = comp.balanceChangePercent;

  const isCurrentPositive = currentBalance >= 0;
  const isProjectedPositive = projectedEndBalance >= 0;

  return (
    <div className="space-y-4">
      {/* 4 CARDS PRINCIPAIS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. SALDO ATUAL */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Saldo Atual
            </CardTitle>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isCurrentPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tracking-tight font-mono ${
                isCurrentPositive ? "text-foreground" : "text-destructive"
              }`}
            >
              {formatCurrency(currentBalance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3 text-primary shrink-0" />
              Acumulado até {monthName || "o mês"}
            </p>
          </CardContent>
        </Card>

        {/* 2. RECEITAS */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Receitas
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowDownLeft className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-primary font-mono">
              {formatCurrency(income)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <Badge
                variant="outline"
                className={`text-[11px] px-1.5 py-0 gap-1 font-normal ${
                  incomeChange >= 0
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-muted text-muted-foreground"
                }`}
              >
                {incomeChange >= 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {formatPercentage(incomeChange)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                vs {comp.prevMonthName}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. DESPESAS */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Despesas
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <ArrowUpRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-destructive font-mono">
              {formatCurrency(expenses)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              {/* Para despesa, redução (negativo) é positivo para o usuário */}
              <Badge
                variant="outline"
                className={`text-[11px] px-1.5 py-0 gap-1 font-normal ${
                  expensesChange <= 0
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {expensesChange <= 0 ? (
                  <TrendingDown className="size-3" />
                ) : (
                  <TrendingUp className="size-3" />
                )}
                {formatPercentage(expensesChange)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                vs {comp.prevMonthName}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 4. SALDO PROJETADO FIM DE MÊS (RECEITA - DESPESA) */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Saldo Projetado Fim de Mês
            </CardTitle>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isProjectedPositive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              <Target className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tracking-tight font-mono ${
                isProjectedPositive ? "text-primary" : "text-destructive"
              }`}
            >
              {formatCurrency(projectedEndBalance)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <Badge
                variant="outline"
                className={`text-[11px] px-1.5 py-0 gap-1 font-normal ${
                  balanceChange >= 0
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {balanceChange >= 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {formatPercentage(balanceChange)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                vs {comp.prevMonthName}
              </span>
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
