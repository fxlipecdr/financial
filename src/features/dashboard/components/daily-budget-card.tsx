"use client";

import * as React from "react";
import { formatCurrency, calculateDailySpending } from "../lib/financial-math";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Wallet,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";

interface DailyBudgetCardProps {
  currentBalance: number;
  income: number;
  expenses: number;
  selectedMonth: number;
  selectedYear: number;
  monthName: string;
  onOpenPayoffDialog?: () => void;
}

export function DailyBudgetCard({
  currentBalance,
  income,
  expenses,
  selectedMonth,
  selectedYear,
  monthName,
  onOpenPayoffDialog,
}: DailyBudgetCardProps) {
  // Conexão com os lançamentos para apurar contas futuras a pagar (status: pending)
  const getMonthlySummary = useTransactionStore((state) => state.getMonthlySummary);
  const txSummary = getMonthlySummary();

  const futureExpenses = txSummary.pendingExpenses;
  const pendingCount = txSummary.pendingCount;

  // Modo de cálculo selecionado: Saldo em Conta (padrão) ou Margem do Mês
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
    <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* LADO PRINCIPAL: RECOMENDAÇÃO DE GASTO DIÁRIO */}
          <div className="space-y-3.5 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" />
                </div>
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Quanto posso gastar?
                </h2>

                {isExceeded ? (
                  <Badge
                    variant="outline"
                    className="border-destructive/30 bg-destructive/10 text-destructive text-[11px] gap-1"
                  >
                    <AlertTriangle className="size-3" />
                    Orçamento Comprometido
                  </Badge>
                ) : isCurrentMonth ? (
                  <Badge
                    variant="outline"
                    className="border-border/60 bg-muted/40 text-muted-foreground text-[11px] gap-1 font-medium"
                  >
                    <Calendar className="size-3" />
                    {daysRemaining} {daysRemaining === 1 ? "dia restante" : "dias restantes"}
                  </Badge>
                ) : isPastMonth ? (
                  <Badge variant="outline" className="border-border/60 text-muted-foreground text-[11px] gap-1">
                    <CheckCircle className="size-3" />
                    Mês Concluído
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-border/60 bg-muted/40 text-muted-foreground text-[11px] gap-1"
                  >
                    <Calendar className="size-3" />
                    {monthName} ({totalDaysInMonth} dias)
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* ATALHO PARA O SIMULADOR DE QUITAÇÃO BOLA DE NEVE */}
                {onOpenPayoffDialog && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenPayoffDialog}
                    className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 shadow-2xs"
                    title="Simular quitação antecipada e quanto vai liberar mês a mês"
                  >
                    <Zap className="size-3 text-amber-500" />
                    <span className="hidden sm:inline">Simular Quitação</span>
                  </Button>
                )}

                {/* SELETOR DE MODO COMPACTO */}
                <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs">
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
          </div>

            {/* DESTAQUE HERO DO VALOR POR DIA */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-primary">
                  {formatCurrency(activeDaily)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">/ dia</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isExceeded ? (
                  <span className="text-destructive font-medium">
                    As contas futuras pendentes ultrapassam o saldo livre neste momento. Reduza saídas não essenciais.
                  </span>
                ) : (
                  <>
                    Você dispõe de <strong className="font-semibold text-foreground font-mono">{formatCurrency(activeTotalFree)}</strong> livres para os próximos <strong className="font-semibold text-foreground">{daysRemaining} dias</strong> sem comprometer sua reserva.
                  </>
                )}
              </p>
            </div>

            {/* BARRA DE PROGRESSO ELEGANTE */}
            <div className="space-y-1 pt-0.5 max-w-md">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>Comprometido: {formatCurrency(futureExpenses)}</span>
                <span>Livre: {formatCurrency(activeTotalFree)}</span>
              </div>
              <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.max(5, 100 - committedPercentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* LADO DIREITO: DEMONSTRATIVO DE CÁLCULO CONDENSADO */}
          <div className="border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-6 shrink-0 lg:w-72">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Composição do Cálculo
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="size-3" />
                  {mode === "account_balance" ? "Saldo Base" : "Receita Base"}
                </span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(mode === "account_balance" ? currentBalance : income)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3 text-amber-500" />
                  Contas Futuras ({pendingCount})
                </span>
                <span className="font-mono font-medium text-amber-500">
                  - {formatCurrency(futureExpenses)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Saldo Livre</span>
                <span className="font-mono font-semibold text-foreground">
                  = {formatCurrency(activeTotalFree)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 text-primary">
                <span className="font-medium flex items-center gap-1">
                  Disponível por dia
                  <ArrowRight className="size-3" />
                </span>
                <span className="font-mono font-bold">
                  {formatCurrency(activeDaily)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
