"use client";

import * as React from "react";
import { formatCurrency, calculateDailySpending } from "../lib/financial-math";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Coins,
  TrendingUp,
  Receipt,
  Wallet,
  Clock,
  ArrowRight,
} from "lucide-react";

interface DailyBudgetCardProps {
  currentBalance: number;
  income: number;
  expenses: number;
  selectedMonth: number;
  selectedYear: number;
  monthName: string;
}

export function DailyBudgetCard({
  currentBalance,
  income,
  expenses,
  selectedMonth,
  selectedYear,
  monthName,
}: DailyBudgetCardProps) {
  // Conexão com os lançamentos para apurar contas futuras a pagar (status: pending)
  const getMonthlySummary = useTransactionStore((state) => state.getMonthlySummary);
  const txSummary = getMonthlySummary();

  const futureExpenses = txSummary.pendingExpenses;
  const pendingCount = txSummary.pendingCount;

  // Modo de cálculo selecionado: Saldo em Conta (Opção 2 - padrão) ou Margem do Mês
  const [mode, setMode] = React.useState<"account_balance" | "monthly_margin">("account_balance");

  // Cálculo com precisão decimal.js
  const budget = calculateDailySpending(
    currentBalance,
    futureExpenses,
    selectedMonth,
    selectedYear,
    income,
    expenses
  );

  const {
    dailyAmount,
    netFreeToSpend,
    daysRemaining,
    totalDaysInMonth,
    isCurrentMonth,
    isPastMonth,
    isExceeded,
    committedPercentage,
    monthlySurplusDaily,
    monthlyRemaining,
  } = budget;

  // Valores a exibir conforme o modo ativo
  const activeDaily = mode === "account_balance" ? dailyAmount : monthlySurplusDaily;
  const activeTotalFree = mode === "account_balance" ? netFreeToSpend : monthlyRemaining;

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
      {/* GLOW DECORATIVO DE FUNDO */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-primary/5 blur-3xl" />

      <CardContent className="p-5 sm:p-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* LADO ESQUERDO: TÍTULO, SELETOR DE MODO, FRASE E PIPELINE */}
          <div className="space-y-3.5 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-xs">
                  <Sparkles className="size-4.5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Quanto posso gastar?
                </h2>

                {isExceeded ? (
                  <Badge
                    variant="outline"
                    className="border-destructive/40 bg-destructive/10 text-destructive text-xs gap-1"
                  >
                    <AlertTriangle className="size-3" />
                    Orçamento Comprometido
                  </Badge>
                ) : isCurrentMonth ? (
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-xs gap-1 font-medium"
                  >
                    <Calendar className="size-3" />
                    {daysRemaining} {daysRemaining === 1 ? "dia restante" : "dias restantes"} até o fim do mês
                  </Badge>
                ) : isPastMonth ? (
                  <Badge variant="outline" className="border-muted text-muted-foreground text-xs gap-1">
                    <CheckCircle className="size-3" />
                    Mês Concluído
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-xs gap-1"
                  >
                    <Calendar className="size-3" />
                    Planejamento para {monthName} ({totalDaysInMonth} dias)
                  </Badge>
                )}
              </div>

              {/* SELETOR DE MODO DE CÁLCULO */}
              <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode("account_balance")}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    mode === "account_balance"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Calcula com base no Saldo Total em Conta menos Contas Futuras"
                >
                  <Wallet className="size-3" />
                  Saldo em Conta
                </button>
                <button
                  type="button"
                  onClick={() => setMode("monthly_margin")}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    mode === "monthly_margin"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Calcula apenas com a margem do mês (Receitas - Despesas)"
                >
                  <Receipt className="size-3" />
                  Margem do Mês
                </button>
              </div>
            </div>

            {/* FRASE DE DESTAQUE COM VALOR AJUSTADO */}
            {isExceeded ? (
              <p className="text-sm text-destructive font-medium leading-relaxed">
                Atenção: As contas futuras excedem o saldo disponível neste momento. Reduza gastos para restabelecer a segurança financeira.
              </p>
            ) : (
              <p className="text-sm sm:text-base text-foreground font-normal leading-relaxed">
                Você pode gastar{" "}
                <strong className="font-semibold text-primary font-mono text-base sm:text-lg inline-block px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                  {formatCurrency(activeDaily)}/dia
                </strong>{" "}
                até o fim do mês sem ultrapassar seu orçamento.
              </p>
            )}

            {/* PIPELINE DE CÁLCULO VISUAL (DETALHAMENTO TRANSPARENTE DOS 4 FATORES) */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    {mode === "account_balance" ? "1. Saldo em Conta" : "1. Receita do Mês"}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(mode === "account_balance" ? currentBalance : income)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                    2. Contas Futuras
                    <Clock className="size-2.5 text-amber-500" />
                  </span>
                  <span className="font-mono font-semibold text-amber-500">
                    - {formatCurrency(futureExpenses)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    ({pendingCount} a vencer)
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    3. Saldo Livre Total
                  </span>
                  <span className="font-mono font-semibold text-primary">
                    = {formatCurrency(activeTotalFree)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    4. Dias Restantes
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    ÷ {daysRemaining} dias
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    até {totalDaysInMonth}/{String(selectedMonth + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            {/* BARRA DE PROGRESSO DE COMPROMETIMENTO */}
            <div className="space-y-1.5 pt-0.5 max-w-xl">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Contas a vencer:{" "}
                  <strong className="text-foreground font-mono">
                    {formatCurrency(futureExpenses)}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-primary" />
                  Disponível seguro:{" "}
                  <strong className="text-foreground font-mono">
                    {formatCurrency(activeTotalFree)}
                  </strong>
                </span>
              </div>
              <div className="w-full bg-muted/80 rounded-full h-2 overflow-hidden p-0.5 border border-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.max(5, 100 - committedPercentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* LADO DIREITO: RESUMO EM CARDS CONDENSADOS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 shrink-0 lg:w-72">
            <div className="rounded-xl border border-border bg-card/60 p-3 shadow-2xs">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Wallet className="size-3 text-primary" />
                {mode === "account_balance" ? "Saldo em Conta" : "Receita Mensal"}
              </span>
              <p className="mt-1 text-base font-bold text-foreground font-mono">
                {formatCurrency(mode === "account_balance" ? currentBalance : income)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-3 shadow-2xs">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Clock className="size-3 text-amber-500" />
                Contas a Vencer
              </span>
              <p className="mt-1 text-base font-bold text-amber-500 font-mono">
                {formatCurrency(futureExpenses)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-3 shadow-2xs">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Coins className="size-3 text-primary" />
                Livre para Gastar
              </span>
              <p className="mt-1 text-base font-bold text-foreground font-mono">
                {formatCurrency(activeTotalFree)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-3 shadow-2xs">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Calendar className="size-3 text-primary" />
                Dias Restantes
              </span>
              <p className="mt-1 text-base font-bold text-foreground font-mono">
                {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3 shadow-2xs">
              <span className="text-[11px] text-primary flex items-center gap-1 font-semibold">
                <TrendingUp className="size-3" />
                Disponível por Dia
              </span>
              <p className="mt-1 text-base font-bold text-primary font-mono">
                {formatCurrency(activeDaily)} / dia
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
