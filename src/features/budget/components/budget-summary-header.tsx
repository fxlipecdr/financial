"use client";

import * as React from "react";
import { BudgetSummary } from "../types/budget.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  ArrowDownRight,
  Wallet,
  PieChart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { MONTH_NAMES } from "@/features/dashboard/stores/dashboard.store";

interface BudgetSummaryHeaderProps {
  summary: BudgetSummary;
  selectedMonth: number;
  selectedYear: number;
  availableYears?: number[];
  onSelectMonth: (month: number) => void;
  onSelectYear?: (year: number) => void;
  onOpenEditDialog: () => void;
}

export function BudgetSummaryHeader({
  summary,
  selectedMonth,
  selectedYear,
  availableYears,
  onSelectMonth,
  onSelectYear,
  onOpenEditDialog,
}: BudgetSummaryHeaderProps) {
  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handlePrevMonth = () => {
    if (selectedMonth > 0) {
      onSelectMonth(selectedMonth - 1);
    } else {
      onSelectMonth(11);
      if (onSelectYear) onSelectYear(selectedYear - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth < 11) {
      onSelectMonth(selectedMonth + 1);
    } else {
      onSelectMonth(0);
      if (onSelectYear) onSelectYear(selectedYear + 1);
    }
  };

  const currentMonthName = MONTH_NAMES[selectedMonth]?.full || "";
  const progressWidth = Math.min(Math.max(summary.percentage, 0), 100);

  // Status visual
  let statusBadge = {
    label: "Orçamento Sob Controle",
    variant: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
    barColor: "bg-emerald-500",
  };

  if (summary.status === "exceeded") {
    statusBadge = {
      label: "Teto Geral Ultrapassado",
      variant: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      icon: AlertOctagon,
      barColor: "bg-rose-500",
    };
  } else if (summary.status === "warning") {
    statusBadge = {
      label: "Atenção ao Teto Geral",
      variant: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: AlertTriangle,
      barColor: "bg-amber-500",
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-4">
      {/* TÍTULO E CONTROLES DE MÊS */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Orçamento Mensal
              </h1>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {currentMonthName} de {selectedYear}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Planejamento de tetos de gastos por categoria e acompanhamento em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* CONTROLE DE ANO ELEGANTE */}
            {onSelectYear && availableYears && (
              <div className="flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onSelectYear(selectedYear - 1)}
                  title="Ano anterior"
                  className="size-7 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                <Select
                  value={String(selectedYear)}
                  onValueChange={(val) => onSelectYear(Number(val))}
                >
                  <SelectTrigger className="h-7 w-20 border-0 bg-transparent px-2 text-xs font-bold focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs font-medium">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onSelectYear(selectedYear + 1)}
                  title="Próximo ano"
                  className="size-7 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}

            {/* BOTÃO PARA EDITAR TODOS OS TETOS */}
            <Button
              type="button"
              size="sm"
              onClick={onOpenEditDialog}
              className="text-xs gap-1.5 shadow-xs h-8"
            >
              <SlidersHorizontal className="size-3.5" />
              Estipular Tetos
            </Button>
          </div>
        </div>

        {/* SELETOR DE MÊS SEGMENTADO (12 MESES MODERNOS) */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-1 shadow-2xs">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {MONTH_NAMES.map((m, idx) => {
              const isSelected = selectedMonth === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectMonth(idx)}
                  className={`relative flex items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <span>{m.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CARDS DE KPIS CONSOLIDADOS DO ORÇAMENTO */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* TETO TOTAL ORÇADO */}
        <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs group hover:border-border transition-all duration-200">
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Teto Total Orçado</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 group-hover:scale-105 transition-transform duration-200">
                <Target className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(summary.totalBudget)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Soma dos tetos de todas as categorias
              </span>
            </div>
          </CardContent>
        </Card>

        {/* TOTAL GASTO NO MÊS */}
        <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs group hover:border-border transition-all duration-200">
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Gasto no Mês</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20 group-hover:scale-105 transition-transform duration-200">
                <ArrowDownRight className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(summary.totalSpent)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Despesas efetuadas em {currentMonthName}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SALDO RESTANTE DO ORÇAMENTO */}
        <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs group hover:border-border transition-all duration-200">
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {summary.remainingBudget >= 0 ? "Saldo Restante" : "Orçamento Excedido"}
              </span>
              <div
                className={`flex size-9 items-center justify-center rounded-xl ring-1 ring-inset group-hover:scale-105 transition-transform duration-200 ${
                  summary.remainingBudget >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20"
                }`}
              >
                <Wallet className="size-4" />
              </div>
            </div>
            <div>
              <div
                className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
                  summary.remainingBudget >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.remainingBudget >= 0
                  ? formatCurrency(summary.remainingBudget)
                  : `- ${formatCurrency(Math.abs(summary.remainingBudget))}`}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {summary.remainingBudget >= 0
                  ? "Ainda disponível dentro dos tetos"
                  : "Gastos acima da soma dos limites"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* % COMPROMETIMENTO GERAL */}
        <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs group hover:border-border transition-all duration-200">
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">% Comprometido</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <PieChart className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                  {summary.percentage.toFixed(1)}%
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border-0 ${statusBadge.variant}`}
                >
                  <StatusIcon className="size-2.5 mr-1" />
                  {statusBadge.label}
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {summary.exceededCategoriesCount > 0
                  ? `${summary.exceededCategoriesCount} categoria(s) estourada(s)`
                  : summary.warningCategoriesCount > 0
                  ? `${summary.warningCategoriesCount} categoria(s) em alerta`
                  : "Todas as categorias sob controle"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BARRA GLOBAL DE CONSUMO DO ORÇAMENTO */}
      <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs shadow-xs">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <span>Consumo Global do Orçamento</span>
              <Badge variant="secondary" className="text-[10px] font-normal py-0">
                {formatCurrency(summary.totalSpent)} de {formatCurrency(summary.totalBudget)}
              </Badge>
            </span>
            <span className="font-bold text-foreground">{summary.percentage.toFixed(1)}%</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${statusBadge.barColor}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
