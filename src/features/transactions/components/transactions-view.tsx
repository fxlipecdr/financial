"use client";

import * as React from "react";
import { useTransactionStore } from "../stores/transaction.store";
import { TransactionForm } from "./transaction-form";
import { TransactionList } from "./transaction-list";
import { ExpensesPieChart } from "./expenses-pie-chart";
import { formatCurrency } from "@/features/dashboard/lib/financial-math";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Tags,
  Zap,
} from "lucide-react";

import { useDashboardStore, getAvailableYears } from "@/features/dashboard/stores/dashboard.store";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { CategoryManagerDialog } from "@/features/categories/components/category-manager-dialog";
import { DebtPayoffDialog } from "./debt-payoff-dialog";

const MONTHS_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function TransactionsView() {
  const selectedMonth = useTransactionStore((state) => state.selectedMonth);
  const selectedYear = useTransactionStore((state) => state.selectedYear);
  const setSelectedMonth = useTransactionStore((state) => state.setSelectedMonth);
  const setSelectedYear = useTransactionStore((state) => state.setSelectedYear);

  const getTransactions = useTransactionStore((state) => state.getTransactionsForSelectedMonth);
  const getCategoryExpenses = useTransactionStore((state) => state.getCategoryExpensesForSelectedMonth);
  const getMonthlySummary = useTransactionStore((state) => state.getMonthlySummary);

  // Subscrições para re-renderizar quando transações ou categorias mudarem
  const allTransactions = useTransactionStore((state) => state.transactions);
  useCategoryStore((state) => state.categories);
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);
  const [payoffDialogOpen, setPayoffDialogOpen] = React.useState(false);

  const availableYears = React.useMemo(() => {
    return getAvailableYears(allTransactions, selectedYear);
  }, [allTransactions, selectedYear]);

  const transactions = getTransactions();
  const categoryExpenses = getCategoryExpenses();
  const summary = getMonthlySummary();

  const monthName = MONTHS_LABELS[selectedMonth];

  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    useDashboardStore.getState().setSelectedMonth(month);
  };

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    useDashboardStore.getState().setYear(year);
  };

  const handlePrevMonth = () => {
    if (selectedMonth > 0) {
      handleSelectMonth(selectedMonth - 1);
    } else {
      handleSelectMonth(11);
      handleSelectYear(selectedYear - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth < 11) {
      handleSelectMonth(selectedMonth + 1);
    } else {
      handleSelectMonth(0);
      handleSelectYear(selectedYear + 1);
    }
  };

  const isPositiveBalance = summary.balance >= 0;

  return (
    <div className="space-y-6">
      {/* HEADER DA ABA: NAVEGAÇÃO ENTRE MESES E NOVO LANÇAMENTO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Lançamentos do Mês
          </h1>
          <p className="text-xs text-muted-foreground">
            Gestão de despesas e receitas categorizadas com distribuição gráfica de gastos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* NAVEGAÇÃO DE MÊS E ANO */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handlePrevMonth}
              title="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>

            {/* SELETOR DE MÊS */}
            <Select
              value={String(selectedMonth)}
              onValueChange={(val) => handleSelectMonth(Number(val))}
            >
              <SelectTrigger className="h-7 min-w-[95px] border-0 bg-transparent text-xs font-semibold focus:ring-0">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_LABELS.map((m, idx) => (
                  <SelectItem key={m} value={String(idx)} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-3.5 w-px bg-border my-auto mx-0.5" />

            {/* SELETOR DE ANO */}
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => handleSelectYear(Number(val))}
            >
              <SelectTrigger className="h-7 w-[76px] border-0 bg-transparent text-xs font-semibold focus:ring-0">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleNextMonth}
              title="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* BOTÃO GERENCIAR CATEGORIAS */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCategoryManagerOpen(true)}
            className="text-xs gap-1.5"
          >
            <Tags className="size-3.5" />
            <span className="hidden sm:inline">Categorias</span>
          </Button>

          {/* BOTÃO SIMULADOR DE QUITAÇÃO (BOLA DE NEVE) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPayoffDialogOpen(true)}
            className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            title="Simular quitação antecipada e liberação de gastos mês a mês (Método Bola de Neve)"
          >
            <Zap className="size-3.5 text-amber-500" />
            <span className="hidden sm:inline">Simular Quitação</span>
          </Button>

          {/* BOTÃO MODAL DE NOVO LANÇAMENTO */}
          <TransactionForm
            defaultDate={`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-15`}
          />
        </div>
      </div>

      {/* 3 CARDS DE RESUMO DO MÊS */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* RECEITAS DO MÊS */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Receitas ({monthName})
              </p>
              <p className="text-xl font-bold text-foreground font-mono mt-0.5">
                {formatCurrency(summary.totalIncome)}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </div>
          </CardContent>
        </Card>

        {/* GASTOS DO MÊS */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Gastos ({monthName})
              </p>
              <p className="text-xl font-bold text-foreground font-mono mt-0.5">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <TrendingDown className="size-4" />
            </div>
          </CardContent>
        </Card>

        {/* SALDO LÍQUIDO */}
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Saldo do Mês
              </p>
              <p
                className={`text-xl font-bold font-mono mt-0.5 ${
                  isPositiveBalance ? "text-primary" : "text-destructive"
                }`}
              >
                {formatCurrency(summary.balance)}
              </p>
            </div>
            <div
              className={`flex size-9 items-center justify-center rounded-lg ${
                isPositiveBalance
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <Wallet className="size-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRID DE DUAS COLUNAS: LISTAGEM E GRÁFICO PIZZA */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* COLUNA ESQUERDA: LISTAGEM DE LANÇAMENTOS */}
        <div className="lg:col-span-7">
          <TransactionList
            transactions={transactions}
            monthName={monthName}
            year={selectedYear}
          />
        </div>

        {/* COLUNA DIREITA: GRÁFICO PIZZA DE GASTOS */}
        <div className="lg:col-span-5">
          <ExpensesPieChart
            categoryExpenses={categoryExpenses}
            monthName={monthName}
            year={selectedYear}
          />
        </div>
      </div>

      {/* MODAL DE GERENCIAMENTO DE CATEGORIAS GLOBAIS */}
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />

      {/* MODAL SIMULADOR DE QUITAÇÃO (BOLA DE NEVE) */}
      <DebtPayoffDialog
        open={payoffDialogOpen}
        onOpenChange={setPayoffDialogOpen}
        defaultAmount={2500}
      />
    </div>
  );
}
