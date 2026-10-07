"use client";

import * as React from "react";
import Decimal from "decimal.js";
import { cn } from "cn";
import {
  formatCurrency,
  calculateDailySpending,
  calculateCategoryDailySpending,
} from "../lib/financial-math";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { useBudgetStore } from "@/features/budget/stores/budget.store";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
  ShieldCheck,
  Pencil,
  Gamepad2,
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
  // Modo de cálculo: Teto de Lazer (Padrão recomendado que protege a reserva), Margem do Mês ou Saldo Geral
  const [mode, setMode] = React.useState<"lazer" | "monthly_margin" | "account_balance">("lazer");

  // Estado para o modal de ajuste rápido do teto de Lazer
  const [editLimitOpen, setEditLimitOpen] = React.useState(false);
  const [tempLimit, setTempLimit] = React.useState("");

  // Acessos aos stores de categorias e orçamento
  const categories = useCategoryStore((state) => state.categories);
  const categoryLimits = useBudgetStore((state) => state.categoryLimits);
  const setCategoryLimit = useBudgetStore((state) => state.setCategoryLimit);

  // Localiza a categoria de lazer (ou lazer_outros)
  const lazerCat = React.useMemo(() => {
    return (
      categories.find(
        (c) =>
          c.type === "expense" &&
          (c.id === "lazer_outros" || c.id === "lazer" || c.name.toLowerCase().includes("lazer"))
      ) || {
        id: "lazer_outros",
        name: "Lazer/Outros",
        color: "#8b5cf6",
        type: "expense" as const,
        defaultLimit: 600,
      }
    );
  }, [categories]);

  // Teto estipulado para lazer
  const lazerLimit = React.useMemo(() => {
    return (
      categoryLimits[lazerCat.id] ??
      categoryLimits["lazer_outros"] ??
      categoryLimits["lazer"] ??
      lazerCat.defaultLimit ??
      600
    );
  }, [categoryLimits, lazerCat]);

  // Transações do mês selecionado para apurar gastos em lazer
  const transactions = useTransactionStore((state) => state.transactions);

  const { lazerSpent, lazerPending, lazerPaid, lazerTxCount } = React.useMemo(() => {
    let spent = new Decimal(0);
    let pending = new Decimal(0);
    let paid = new Decimal(0);
    let count = 0;

    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      const [yStr, mStr] = tx.date.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      if (y !== selectedYear || m !== selectedMonth) continue;

      const catLower = tx.category.toLowerCase();
      const isMatch =
        catLower === lazerCat.id.toLowerCase() ||
        catLower === "lazer_outros" ||
        catLower === "lazer" ||
        catLower.includes("lazer");

      if (isMatch) {
        const amt = new Decimal(tx.amount);
        spent = spent.plus(amt);
        count++;
        if (tx.status === "pending") {
          pending = pending.plus(amt);
        } else {
          paid = paid.plus(amt);
        }
      }
    }

    return {
      lazerSpent: spent.toNumber(),
      lazerPending: pending.toNumber(),
      lazerPaid: paid.toNumber(),
      lazerTxCount: count,
    };
  }, [transactions, selectedYear, selectedMonth, lazerCat]);

  // Cálculo com Decimal.js para o orçamento de Lazer
  const lazerBudget = React.useMemo(() => {
    return calculateCategoryDailySpending(
      lazerLimit,
      lazerSpent,
      selectedMonth,
      selectedYear,
      lazerCat.id,
      lazerCat.name,
      lazerPending
    );
  }, [lazerLimit, lazerSpent, selectedMonth, selectedYear, lazerCat, lazerPending]);

  // Conexão com os lançamentos para apurar contas futuras gerais (status: pending)
  const getMonthlySummary = useTransactionStore((state) => state.getMonthlySummary);
  const txSummary = getMonthlySummary();
  const futureExpenses = txSummary.pendingExpenses;
  const pendingCount = txSummary.pendingCount;

  // Cálculo alternativo geral
  const generalBudget = React.useMemo(() => {
    return calculateDailySpending(
      currentBalance,
      futureExpenses,
      selectedMonth,
      selectedYear,
      income,
      expenses
    );
  }, [currentBalance, futureExpenses, selectedMonth, selectedYear, income, expenses]);

  // Parâmetros a exibir baseados no modo ativo
  const activeDaily =
    mode === "lazer"
      ? lazerBudget.dailyAmount
      : mode === "monthly_margin"
      ? generalBudget.monthlySurplusDaily
      : generalBudget.dailyAmount;

  const activeTotalFree =
    mode === "lazer"
      ? lazerBudget.remainingBudget
      : mode === "monthly_margin"
      ? generalBudget.monthlyRemaining
      : generalBudget.netFreeToSpend;

  const isExceeded =
    mode === "lazer"
      ? lazerBudget.isExceeded
      : mode === "monthly_margin"
      ? expenses > income
      : generalBudget.isExceeded;

  const daysRemaining = lazerBudget.daysRemaining;
  const totalDaysInMonth = lazerBudget.totalDaysInMonth;
  const isCurrentMonth = lazerBudget.isCurrentMonth;
  const isPastMonth = lazerBudget.isPastMonth;

  const progressPercentage =
    mode === "lazer"
      ? lazerBudget.percentageUsed
      : mode === "monthly_margin"
      ? income > 0
        ? Math.min(100, (expenses / income) * 100)
        : 100
      : generalBudget.committedPercentage;

  // Handler para salvar novo teto de lazer
  const handleOpenEdit = () => {
    setTempLimit(String(lazerLimit));
    setEditLimitOpen(true);
  };

  const handleSaveLimit = (customVal?: number) => {
    const raw = customVal !== undefined ? String(customVal) : tempLimit;
    const val = parseFloat(raw.replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      setCategoryLimit(lazerCat.id, val);
      if (lazerCat.id !== "lazer_outros") {
        setCategoryLimit("lazer_outros", val);
      }
    }
    setEditLimitOpen(false);
  };

  return (
    <>
      <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* LADO PRINCIPAL: RECOMENDAÇÃO DE GASTO DIÁRIO */}
            <div className="space-y-3.5 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                    <Sparkles className="size-4" />
                  </div>
                  <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Quanto posso gastar?
                  </h2>

                  {/* Badge de contexto da categoria / modo */}
                  {mode === "lazer" ? (
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary text-[11px] gap-1 font-medium rounded-full px-2 py-0.5"
                    >
                      <ShieldCheck className="size-3 text-emerald-500 dark:text-emerald-400" />
                      Teto de Lazer • Protege a Reserva
                    </Badge>
                  ) : mode === "monthly_margin" ? (
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-muted/40 text-muted-foreground text-[11px] gap-1 font-medium rounded-full px-2 py-0.5"
                    >
                      <Receipt className="size-3" />
                      Margem Líquida Mensal
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] gap-1 font-medium rounded-full px-2 py-0.5"
                    >
                      <AlertTriangle className="size-3" />
                      Saldo Total (Inclui Reserva)
                    </Badge>
                  )}

                  {/* Status de dias / mês */}
                  {isExceeded ? (
                    <Badge
                      variant="outline"
                      className="border-destructive/30 bg-destructive/10 text-destructive text-[11px] gap-1 rounded-full px-2 py-0.5"
                    >
                      <AlertTriangle className="size-3" />
                      {mode === "lazer" ? "Teto Esgotado" : "Orçamento Comprometido"}
                    </Badge>
                  ) : isCurrentMonth ? (
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-muted/40 text-muted-foreground text-[11px] gap-1 font-medium rounded-full px-2 py-0.5"
                    >
                      <Calendar className="size-3" />
                      {daysRemaining} {daysRemaining === 1 ? "dia restante" : "dias restantes"}
                    </Badge>
                  ) : isPastMonth ? (
                    <Badge variant="outline" className="border-border/60 text-muted-foreground text-[11px] gap-1 rounded-full px-2 py-0.5">
                      <CheckCircle className="size-3" />
                      Mês Concluído
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-muted/40 text-muted-foreground text-[11px] gap-1 rounded-full px-2 py-0.5"
                    >
                      <Calendar className="size-3" />
                      {monthName} ({totalDaysInMonth} dias)
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* BOTÃO PARA AJUSTAR O TETO DE LAZER */}
                  {mode === "lazer" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenEdit}
                      className="h-7 text-xs gap-1.5 rounded-lg border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 shadow-2xs transition-colors"
                      title="Alterar valor estipulado para a categoria Lazer"
                    >
                      <Pencil className="size-3 text-primary" />
                      <span>Ajustar Teto ({formatCurrency(lazerLimit)})</span>
                    </Button>
                  )}

                  {/* ATALHO PARA O SIMULADOR DE QUITAÇÃO BOLA DE NEVE */}
                  {onOpenPayoffDialog && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenPayoffDialog}
                      className="h-7 text-xs gap-1.5 rounded-lg border-primary/30 text-primary hover:bg-primary/10 shadow-2xs transition-colors"
                      title="Simular quitação antecipada e quanto vai liberar mês a mês"
                    >
                      <Zap className="size-3 text-amber-500" />
                      <span className="hidden sm:inline">Simular Quitação</span>
                    </Button>
                  )}

                  {/* SELETOR DE MODO COMPACTO COM SEGMENTED CONTROL */}
                  <SegmentedControl
                    value={mode}
                    onChange={setMode}
                    size="sm"
                    options={[
                      {
                        value: "lazer",
                        label: "Teto Lazer",
                        icon: <Gamepad2 className="size-3 text-primary" />,
                        title: "Recomendado: limite baseado no orçamento de Lazer para não consumir sua reserva",
                      },
                      {
                        value: "monthly_margin",
                        label: "Margem Mês",
                        icon: <Receipt className="size-3" />,
                        title: "Calcula pela sobra líquida de todas as receitas menos despesas do mês",
                      },
                      {
                        value: "account_balance",
                        label: "Saldo Geral",
                        icon: <Wallet className="size-3" />,
                        title: "Calcula pelo saldo acumulado total em conta (inclui patrimônio)",
                      },
                    ]}
                  />
                </div>
              </div>

              {/* DESTAQUE HERO DO VALOR POR DIA */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-3xl sm:text-4xl font-extrabold tracking-tight font-mono",
                      isExceeded ? "text-destructive" : "text-primary"
                    )}
                  >
                    {formatCurrency(activeDaily)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">/ dia</span>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {mode === "lazer" ? (
                    isExceeded ? (
                      <span className="text-destructive font-medium">
                        O teto estipulado de <strong>{formatCurrency(lazerLimit)}</strong> em Lazer foi atingido este mês (foram consumidos <strong>{formatCurrency(lazerSpent)}</strong>). Evite novos gastos supérfluos para preservar sua reserva.
                      </span>
                    ) : isPastMonth ? (
                      <span>
                        Mês concluído. Foram consumidos <strong>{formatCurrency(lazerSpent)}</strong> de <strong>{formatCurrency(lazerLimit)}</strong> previstos no teto de Lazer.
                      </span>
                    ) : (
                      <>
                        Você tem <strong className="font-semibold text-foreground font-mono">{formatCurrency(activeTotalFree)}</strong> livres no teto de Lazer para os próximos <strong className="font-semibold text-foreground">{daysRemaining} dias</strong>. Gastando até esse valor, suas contas essenciais e sua <strong className="text-foreground">reserva de emergência</strong> ficam 100% protegidas.
                      </>
                    )
                  ) : mode === "monthly_margin" ? (
                    isExceeded ? (
                      <span className="text-destructive font-medium">
                        As despesas deste mês superaram as receitas. Não há margem líquida para gastos discricionários.
                      </span>
                    ) : isPastMonth ? (
                      <span>
                        Mês encerrado com margem líquida final de <strong>{formatCurrency(activeTotalFree)}</strong>.
                      </span>
                    ) : (
                      <>
                        Margem líquida de <strong className="font-semibold text-foreground font-mono">{formatCurrency(activeTotalFree)}</strong> livres para os próximos <strong className="font-semibold text-foreground">{daysRemaining} dias</strong> considerando receitas menos todas as saídas.
                      </>
                    )
                  ) : (
                    isExceeded ? (
                      <span className="text-destructive font-medium">
                        As contas futuras pendentes ultrapassam o saldo em conta neste momento.
                      </span>
                    ) : (
                      <>
                        Saldo em conta de <strong className="font-semibold text-foreground font-mono">{formatCurrency(activeTotalFree)}</strong> livre de contas pendentes. <em>Atenção: inclui reserva de emergência.</em>
                      </>
                    )
                  )}
                </p>
              </div>

              {/* BARRA DE PROGRESSO ELEGANTE */}
              <div className="space-y-1.5 pt-0.5 max-w-md">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>
                    {mode === "lazer"
                      ? `Consumido: ${formatCurrency(lazerSpent)} (${lazerBudget.percentageUsed.toFixed(0)}%)`
                      : mode === "monthly_margin"
                      ? `Despesas: ${formatCurrency(expenses)}`
                      : `Comprometido: ${formatCurrency(futureExpenses)}`}
                  </span>
                  <span>
                    {mode === "lazer"
                      ? `Restante: ${formatCurrency(activeTotalFree)}`
                      : mode === "monthly_margin"
                      ? `Margem: ${formatCurrency(activeTotalFree)}`
                      : `Livre: ${formatCurrency(activeTotalFree)}`}
                  </span>
                </div>
                <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isExceeded
                        ? "bg-destructive"
                        : progressPercentage >= 80
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(4, mode === "lazer" ? progressPercentage : 100 - progressPercentage)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* LADO DIREITO: DEMONSTRATIVO DE CÁLCULO CONDENSADO */}
            <div className="border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-6 shrink-0 lg:w-72">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {mode === "lazer"
                      ? "Composição (Lazer)"
                      : mode === "monthly_margin"
                      ? "Composição (Mês)"
                      : "Composição (Conta)"}
                  </span>
                  {mode === "lazer" && (
                    <button
                      type="button"
                      onClick={handleOpenEdit}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                      title="Ajustar teto da categoria Lazer"
                    >
                      <Pencil className="size-3" />
                      Ajustar
                    </button>
                  )}
                </div>

                {mode === "lazer" ? (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Gamepad2 className="size-3 text-purple-500" />
                        Teto Estipulado
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(lazerLimit)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3 text-amber-500" />
                        Já Gasto ({lazerTxCount})
                      </span>
                      <span className="font-mono font-medium text-amber-500">
                        - {formatCurrency(lazerSpent)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="size-3 text-emerald-500" />
                        Saldo Livre
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        = {formatCurrency(activeTotalFree)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-primary">
                      <span className="font-medium flex items-center gap-1">
                        Disponível por dia
                        <ArrowRight className="size-3" />
                      </span>
                      <span className="font-mono font-bold">
                        {formatCurrency(activeDaily)}
                      </span>
                    </div>
                  </>
                ) : mode === "monthly_margin" ? (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="size-3" />
                        Receita Base
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(income)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3 text-amber-500" />
                        Despesas do Mês
                      </span>
                      <span className="font-mono font-medium text-amber-500">
                        - {formatCurrency(expenses)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Margem Livre</span>
                      <span className="font-mono font-semibold text-foreground">
                        = {formatCurrency(activeTotalFree)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-primary">
                      <span className="font-medium flex items-center gap-1">
                        Disponível por dia
                        <ArrowRight className="size-3" />
                      </span>
                      <span className="font-mono font-bold">
                        {formatCurrency(activeDaily)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="size-3" />
                        Saldo Base
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(currentBalance)}
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

                    <div className="flex items-center justify-between pt-1 text-primary">
                      <span className="font-medium flex items-center gap-1">
                        Disponível por dia
                        <ArrowRight className="size-3" />
                      </span>
                      <span className="font-mono font-bold">
                        {formatCurrency(activeDaily)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIÁLOGO MODAL: AJUSTE RÁPIDO DO TETO DE LAZER */}
      <Dialog open={editLimitOpen} onOpenChange={setEditLimitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Ajustar Teto de Lazer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina quanto você deseja liberar mensalmente para lazer e gastos supérfluos. O valor diário será recalculado para não comprometer sua reserva de emergência.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="lazer-limit-input" className="text-xs font-medium">
                Teto Mensal para Lazer (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  id="lazer-limit-input"
                  type="number"
                  min="0"
                  step="50"
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  className="pl-9 font-mono font-semibold text-sm"
                  placeholder="600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Valores comuns:</span>
              <div className="flex flex-wrap gap-1.5">
                {[300, 400, 500, 600, 800, 1000, 1200].map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setTempLimit(String(val))}
                    className={cn(
                      "h-7 text-xs font-mono",
                      Number(tempLimit) === val && "border-primary bg-primary/10 text-primary font-bold"
                    )}
                  >
                    R$ {val}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Preservação da Reserva e Contas Fixas
              </p>
              <p className="text-[11px] leading-relaxed">
                Ao respeitar este teto, qualquer dinheiro restante em conta continuará intacto no seu patrimônio e reserva para imprevistos.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setEditLimitOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => handleSaveLimit()}>
              Salvar Teto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
