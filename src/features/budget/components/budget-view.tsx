"use client";

import * as React from "react";
import { useBudgetStore } from "../stores/budget.store";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { useDashboardStore, getAvailableYears } from "@/features/dashboard/stores/dashboard.store";
import { BudgetSummaryHeader } from "./budget-summary-header";
import { BudgetCategoryCard } from "./budget-category-card";
import { EditBudgetDialog } from "./edit-budget-dialog";
import { CategoryManagerDialog } from "@/features/categories/components/category-manager-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Sparkles, SlidersHorizontal, Tags } from "lucide-react";

export function BudgetView() {
  const selectedMonth = useTransactionStore((state) => state.selectedMonth);
  const selectedYear = useTransactionStore((state) => state.selectedYear);
  const setSelectedMonth = useTransactionStore((state) => state.setSelectedMonth);
  const setSelectedYear = useTransactionStore((state) => state.setSelectedYear);
  const getTransactionsForSelectedMonth = useTransactionStore(
    (state) => state.getTransactionsForSelectedMonth
  );

  // Subscrições para re-renderizar caso transações ou categorias mudem
  const allTransactions = useTransactionStore((state) => state.transactions);
  useCategoryStore((state) => state.categories);

  const availableYears = React.useMemo(() => {
    return getAvailableYears(allTransactions, selectedYear);
  }, [allTransactions, selectedYear]);

  const calculateCategoryProgress = useBudgetStore(
    (state) => state.calculateCategoryProgress
  );
  const calculateSummary = useBudgetStore((state) => state.calculateSummary);

  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);
  const [targetCategory, setTargetCategory] = React.useState<string | null>(null);

  // Mantém sincronizado com o dashboard store se necessário
  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    useDashboardStore.getState().setSelectedMonth(month);
  };

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    useDashboardStore.getState().setYear(year);
  };

  // Re-calcula dinamicamente a cada mudança de transações ou limites
  const monthTransactions = getTransactionsForSelectedMonth();
  const categoryProgressList = calculateCategoryProgress(monthTransactions);
  const summary = calculateSummary(monthTransactions);

  const handleEditCategory = (catId: string) => {
    setTargetCategory(catId);
    setEditDialogOpen(true);
  };

  const handleOpenAllEdit = () => {
    setTargetCategory(null);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO COM KPIS E SELETOR */}
      <BudgetSummaryHeader
        summary={summary}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        availableYears={availableYears}
        onSelectMonth={handleSelectMonth}
        onSelectYear={handleSelectYear}
        onOpenEditDialog={handleOpenAllEdit}
      />

      {/* GRID DE CATEGORIAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Tetos de Gastos por Categoria
            </h2>
            <p className="text-xs text-muted-foreground">
              Acompanhamento detalhado do consumo por centro de custo no mês.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCategoryManagerOpen(true)}
              className="text-xs gap-1.5"
            >
              <Tags className="size-3.5" />
              Configurar Categorias Globais
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAllEdit}
              className="text-xs gap-1.5 hidden sm:flex"
            >
              <SlidersHorizontal className="size-3.5" />
              Ajustar Tetos
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoryProgressList.map((item) => (
            <BudgetCategoryCard
              key={item.categoryId}
              item={item}
              onEdit={handleEditCategory}
            />
          ))}
        </div>
      </div>

      {/* CARD DE INSTRUÇÕES / DICA FINANCEIRA */}
      <Card className="border-border bg-card/40 backdrop-blur-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="size-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground block">
                Como funciona o teto por categoria?
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
                Os tetos estipulados servem como balizadores para o seu estilo de vida. Quando os gastos
                atingem <strong>80%</strong> do teto, a categoria entra em estado de <strong>Alerta</strong>. Ao
                atingir <strong>100%</strong>, é sinalizada como <strong>Estourada</strong>. Você pode alterar
                qualquer teto a qualquer instante clicando no ícone de lápis ou no botão &quot;Estipular Tetos&quot;.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleOpenAllEdit}
            className="text-xs gap-1.5 shrink-0 self-end sm:self-auto"
          >
            <SlidersHorizontal className="size-3.5" />
            Ajustar Tetos
          </Button>
        </CardContent>
      </Card>

      {/* MODAL DE EDIÇÃO DE TETOS */}
      <EditBudgetDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        targetCategoryId={targetCategory}
      />

      {/* MODAL DE CONFIGURAÇÃO DE CATEGORIAS GLOBAIS */}
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />
    </div>
  );
}
