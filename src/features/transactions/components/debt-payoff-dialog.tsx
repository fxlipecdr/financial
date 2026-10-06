"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Wallet,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Info,
} from "lucide-react";
import { useTransactionStore } from "../stores/transaction.store";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { calculateDebtPayoff, MONTH_NAMES } from "../lib/debt-payoff";
import { formatCurrency } from "@/features/dashboard/lib/financial-math";

interface DebtPayoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
}

export function DebtPayoffDialog({
  open,
  onOpenChange,
  defaultAmount = 2500,
}: DebtPayoffDialogProps) {
  const transactions = useTransactionStore((state) => state.transactions);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const selectedMonth = useTransactionStore((state) => state.selectedMonth);
  const selectedYear = useTransactionStore((state) => state.selectedYear);
  const getCategory = useCategoryStore((state) => state.getCategoryById);

  // Mês e ano atual do calendário (ex: Outubro de 2026)
  const currentCalendarMonth = React.useMemo(() => new Date().getMonth(), []);
  const currentCalendarYear = React.useMemo(() => new Date().getFullYear(), []);

  // Valor digitado pelo usuário (padrão 2500 conforme pedido)
  const [amountStr, setAmountStr] = React.useState<string>(String(defaultAmount));
  const [mode, setMode] = React.useState<"by_debt" | "by_transaction">("by_debt");

  // Ponto de partida temporal: a partir de qual mês liberar daqui para frente
  const [startMonth, setStartMonth] = React.useState<number>(currentCalendarMonth);
  const [startYear, setStartYear] = React.useState<number>(currentCalendarYear);
  const [scope, setScope] = React.useState<"from_start_month" | "selected_month">("from_start_month");

  const [activeTab, setActiveTab] = React.useState<"timeline" | "list">("timeline");
  const [confirmingApply, setConfirmingApply] = React.useState(false);

  // Anos disponíveis calculados a partir das transações cadastradas
  const availableYears = React.useMemo(() => {
    const currentY = new Date().getFullYear();
    const yearSet = new Set<number>([currentY, currentY + 1, currentY + 2, currentY + 3]);
    transactions.forEach((tx) => {
      if (tx?.date) {
        const y = parseInt(tx.date.substring(0, 4), 10);
        if (!isNaN(y) && y >= 2024 && y <= 2035) {
          yearSet.add(y);
        }
      }
    });
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [transactions]);

  // Parse do valor numérico
  const numericAmount = React.useMemo(() => {
    const cleaned = amountStr.replace(/[^\d.,]/g, "").replace(",", ".");
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }, [amountStr]);

  // Executa o cálculo da simulação com precisão decimal
  const result = React.useMemo(() => {
    return calculateDebtPayoff({
      availableAmount: numericAmount,
      transactions,
      mode,
      scope,
      startMonth,
      startYear,
    });
  }, [numericAmount, transactions, mode, scope, startMonth, startYear]);

  // Atalhos de valores
  const handleSetAmount = (val: number) => {
    setAmountStr(String(val));
  };

  // Efetivar a quitação na prática no sistema
  const handleApplyPayoff = () => {
    if (result.paidTransactionIds.length === 0) {
      toast.error("Nenhum lançamento selecionado para quitação.");
      return;
    }

    try {
      result.paidTransactionIds.forEach((id) => {
        updateTransaction(id, { status: "paid" });
      });

      toast.success("🎉 Quitação efetuada com sucesso!", {
        description: `${result.transactionsPaidCount} lançamentos a partir de ${result.startMonthLabel} marcados como pagos. Alívio de ${formatCurrency(result.immediateMonthlyRelief)} no orçamento!`,
      });

      setConfirmingApply(false);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aplicar quitação.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
              <Zap className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Simulador de Quitação Estratégica
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-normal">
                  Método Bola de Neve
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Simule quanto você libera mês a mês daqui para frente ao aportar um valor a partir de um mês de referência.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* SEÇÃO 1: CONFIGURAÇÃO DE PARÂMETROS */}
          <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-3.5 shadow-2xs">
            {/* LINHA A: VALOR DISPONÍVEL E ATALHOS */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Wallet className="size-3.5 text-primary" />
                  Valor Disponível para Quitação (R$)
                </label>

                {/* ATALHOS DE VALORES */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground mr-1">Atalhos:</span>
                  {[500, 1000, 2500, 5000].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={numericAmount === preset ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2.5 text-xs font-mono font-medium"
                      onClick={() => handleSetAmount(preset)}
                    >
                      R$ {preset.toLocaleString("pt-BR")}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground font-mono">
                  R$
                </span>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="Ex: 2500"
                  className="pl-10 text-base font-bold font-mono tracking-tight h-10 border-border/80 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* LINHA B: ESCOLHA DO MÊS DE PARTIDA E ESTRATÉGIA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-border/60">
              {/* BLOCO 1: A PARTIR DE QUAL MÊS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" />
                    A partir de qual mês?
                  </label>

                  {/* Atalho para voltar ao mês atual */}
                  {(startMonth !== currentCalendarMonth || startYear !== currentCalendarYear) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartMonth(currentCalendarMonth);
                        setStartYear(currentCalendarYear);
                      }}
                      className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="size-3" />
                      Mês Atual ({MONTH_NAMES[currentCalendarMonth].slice(0, 3)}/{currentCalendarYear})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={String(startMonth)}
                    onValueChange={(val) => setStartMonth(parseInt(val, 10))}
                  >
                    <SelectTrigger className="flex-1 h-9 text-xs font-medium">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, idx) => (
                        <SelectItem key={idx} value={String(idx)} className="text-xs">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(startYear)}
                    onValueChange={(val) => setStartYear(parseInt(val, 10))}
                  >
                    <SelectTrigger className="w-28 h-9 text-xs font-medium font-mono">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((yr) => (
                        <SelectItem key={yr} value={String(yr)} className="text-xs font-mono">
                          {yr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seletor de Horizonte Temporal */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setScope("from_start_month")}
                    className={`text-[11px] px-2 py-0.5 rounded transition-all font-medium flex items-center gap-1 ${
                      scope === "from_start_month"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ArrowRight className="size-3" />
                    Daqui para frente (Recomendado)
                  </button>
                  <span className="text-muted-foreground text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() => setScope("selected_month")}
                    className={`text-[11px] px-2 py-0.5 rounded transition-all font-medium ${
                      scope === "selected_month"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Apenas em {MONTH_NAMES[startMonth].slice(0, 3)}
                  </button>
                </div>
              </div>

              {/* BLOCO 2: ESTRATÉGIA DE PRIORIZAÇÃO */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  Estratégia de Priorização
                </label>

                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/80 bg-muted/30 p-1 text-xs h-9 items-center">
                  <button
                    type="button"
                    onClick={() => setMode("by_debt")}
                    className={`h-7 px-2 rounded-md transition-all font-medium flex items-center justify-center gap-1.5 truncate ${
                      mode === "by_debt"
                        ? "bg-card text-foreground shadow-2xs font-semibold border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Agrupa parcelas restantes da mesma compra e quita por completo (elimina o valor mensal para sempre)"
                  >
                    <Layers className="size-3 shrink-0" />
                    <span className="truncate">Por Compra Total</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("by_transaction")}
                    className={`h-7 px-2 rounded-md transition-all font-medium flex items-center justify-center gap-1.5 truncate ${
                      mode === "by_transaction"
                        ? "bg-card text-foreground shadow-2xs font-semibold border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Quita parcelas avulsas menores primeiro para liquidar a maior quantidade de boletos"
                  >
                    <CheckCircle2 className="size-3 shrink-0" />
                    <span className="truncate">Por Parcela Avulsa</span>
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground pt-1">
                  {mode === "by_debt"
                    ? "Elimina a dívida completa, liberando o valor mensal nos meses seguintes."
                    : "Liquida o maior número de contas pontuais a vencer."}
                </p>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: OS 4 CARDS DE MÉTRICAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* CARD 1: DÍVIDAS / LANÇAMENTOS QUITADOS */}
            <Card className="border-border/80 bg-card shadow-2xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  {mode === "by_debt" ? "Dívidas Quitadas" : "Lançamentos"}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-foreground font-mono">
                    {mode === "by_debt" ? result.debtsPaidCount : result.transactionsPaidCount}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    de {mode === "by_debt" ? result.totalDebtsCount : result.totalTransactionsCount}
                  </span>
                </div>
                <div className="pt-1 border-t border-border/50 text-[10px] text-muted-foreground truncate">
                  {mode === "by_debt" ? (
                    <span>{result.transactionsPaidCount} parcelas eliminadas</span>
                  ) : (
                    <span>Contas pagas integralmente</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: ALÍVIO MENSAL IMEDIATO */}
            <Card className="border-border/80 bg-card shadow-2xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                  Libera em {MONTH_NAMES[startMonth].slice(0, 3)}/{startYear}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-emerald-500 dark:text-emerald-400 font-mono">
                    +{formatCurrency(result.immediateMonthlyRelief)}
                  </span>
                </div>
                <div className="pt-1 border-t border-border/50 text-[10px] text-muted-foreground truncate">
                  <span>Alívio no 1º mês</span>
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: ECONOMIA TOTAL FUTURA */}
            <Card className="border-border/80 bg-card shadow-2xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                  Total Poupado Futuro
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(result.totalFreedAcrossAllMonths)}
                </div>
                <div className="pt-1 border-t border-border/50 text-[10px] text-muted-foreground truncate">
                  <span>Alívio acumulado futuro</span>
                </div>
              </CardContent>
            </Card>

            {/* CARD 4: TOTAL UTILIZADO / TROCO */}
            <Card className="border-border/80 bg-card shadow-2xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Utilizado / Troco
                </span>
                <div className="text-2xl font-extrabold text-foreground font-mono">
                  {formatCurrency(result.totalUsed)}
                </div>
                <div className="pt-1 border-t border-border/50 text-[10px] text-muted-foreground truncate">
                  <span>Troco: {formatCurrency(result.remainingChange)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BANNER DE PRÓXIMA META (SE HOUVER DÍVIDA QUASE ALCANÇADA) */}
          {result.nextDebtToPay && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary shrink-0" />
                <p className="text-muted-foreground">
                  Com mais <strong className="text-foreground font-mono font-semibold">{formatCurrency(result.nextDebtToPay.amountNeeded)}</strong>, você também quitaria{" "}
                  <strong className="text-foreground font-semibold">"{result.nextDebtToPay.description}"</strong> (total de {formatCurrency(result.nextDebtToPay.totalRemaining)}).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] shrink-0 border-primary/30 text-primary hover:bg-primary/10 self-end sm:self-center"
                onClick={() => handleSetAmount(result.totalUsed + (result.nextDebtToPay?.totalRemaining || 0))}
              >
                Simular com +{formatCurrency(result.nextDebtToPay.amountNeeded)}
              </Button>
            </div>
          )}

          {/* SEÇÃO 3: ABAS DETALHADAS (LINHA DO TEMPO MÊS A MÊS vs LISTA DE ITENS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("timeline")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeTab === "timeline"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cronograma Mês a Mês ({result.monthlyReliefTimeline.length} meses)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeTab === "list"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Lançamentos Quitados ({result.paidDebts.length})
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                A partir de {result.startMonthLabel} ({scope === "from_start_month" ? "daqui para frente" : "apenas no mês"})
              </span>
            </div>

            {activeTab === "timeline" ? (
              <div className="space-y-2">
                {result.monthlyReliefTimeline.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Nenhum gasto futuro pendente localizado a partir de {result.startMonthLabel}.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 overflow-hidden bg-card/60 max-h-72 sm:max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                        <tr className="border-b border-border/60 text-muted-foreground font-medium">
                          <th className="py-2.5 px-3">Mês / Ano</th>
                          <th className="py-2.5 px-3">Gasto Previsto Antes</th>
                          <th className="py-2.5 px-3">Novo Gasto Após Quitar</th>
                          <th className="py-2.5 px-3 text-right">Economia Liberada no Mês</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono">
                        {result.monthlyReliefTimeline.map((m) => {
                          const hasRelief = m.amountFreed > 0;
                          const isStartMonth = m.monthKey === result.startMonthKey;
                          return (
                            <tr
                              key={m.monthKey}
                              className={`hover:bg-muted/30 transition-colors ${
                                isStartMonth ? "bg-primary/5 font-semibold" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3 font-sans font-medium text-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="size-3.5 text-muted-foreground" />
                                  <span>{m.monthLabel}</span>
                                  {isStartMonth && (
                                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 bg-primary/10 text-primary">
                                      Início
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground">
                                {formatCurrency(m.originalExpenses)}
                              </td>
                              <td className="py-2.5 px-3 text-foreground font-semibold">
                                {formatCurrency(m.newExpenses)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {hasRelief ? (
                                  <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    +{formatCurrency(m.amountFreed)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-72 sm:max-h-80 overflow-y-auto pr-1">
                {result.paidDebts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Com o valor informado não foi possível quitar nenhuma pendência integral a partir de {result.startMonthLabel}. Aumente o valor para simular.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {result.paidDebts.map((debt, idx) => (
                      <div
                        key={debt.id}
                        className="rounded-lg border border-border/80 bg-card/60 p-2.5 flex items-center justify-between text-xs gap-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] font-mono shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground truncate block">
                                {debt.description}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-muted text-muted-foreground">
                                {getCategory(debt.category).name}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground block">
                              {debt.installmentsCount > 1
                                ? `${debt.installmentsCount} parcelas de ${formatCurrency(debt.monthlyCost)}`
                                : "Lançamento avulso"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                            {formatCurrency(debt.totalRemaining)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Quitado integralmente
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* NÃO QUITADOS */}
                {result.unpaidDebts.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Pendências Restantes ({result.unpaidDebts.length})
                    </span>
                    <div className="space-y-1.5 opacity-70">
                      {result.unpaidDebts.slice(0, 6).map((debt) => (
                        <div
                          key={debt.id}
                          className="rounded-lg border border-border/50 bg-muted/20 p-2 flex items-center justify-between text-xs gap-3"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-muted-foreground truncate block">
                              {debt.description}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {debt.installmentsCount > 1 ? `${debt.installmentsCount} parcelas restantes` : "Avulso"}
                            </span>
                          </div>
                          <span className="font-mono text-muted-foreground font-semibold">
                            {formatCurrency(debt.totalRemaining)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-start sm:self-center">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Simulação a partir de {result.startMonthLabel} com precisão decimal.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Fechar
            </Button>

            {/* BOTÃO PARA EFETIVAR QUITAÇÃO DE FATO */}
            {confirmingApply ? (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleApplyPayoff}
                  className="text-xs gap-1 font-semibold"
                >
                  Confirmar Baixa ({result.transactionsPaidCount})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingApply(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setConfirmingApply(true)}
                disabled={result.transactionsPaidCount === 0}
                className="text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Deseja marcar os lançamentos quitados como pagos no sistema?"
              >
                <CheckCircle2 className="size-3.5" />
                Efetivar Quitação
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
