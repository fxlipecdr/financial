"use client";

import * as React from "react";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useDashboardStore, MONTH_NAMES, computeYearDataFromTransactions, getAvailableYears } from "../stores/dashboard.store";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { KpiCards } from "./kpi-cards";
import { DailyBudgetCard } from "./daily-budget-card";
import { MonthlyChart } from "./monthly-chart";
import { MonthlyTable } from "./monthly-table";
import { TransactionsView } from "@/features/transactions/components/transactions-view";
import { BudgetView } from "@/features/budget/components/budget-view";
import { AssistantView } from "@/features/assistant/components/assistant-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  Moon,
  Sun,
  Sparkles,
  Calendar,
  User as UserIcon,
  LayoutDashboard,
  Receipt,
  Target,
  Tags,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Bot,
} from "lucide-react";
import { useTheme } from "next-themes";
import { CategoryManagerDialog } from "@/features/categories/components/category-manager-dialog";
import { CloudSyncDialog } from "@/features/sync/components/cloud-sync-dialog";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function DashboardView() {
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "transactions" | "budget" | "assistant">("dashboard");
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);
  const [cloudSyncOpen, setCloudSyncOpen] = React.useState(false);
  const isCloudConfigured = isSupabaseConfigured();

  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const currentYear = useDashboardStore((state) => state.currentYear);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const setSelectedMonth = useDashboardStore((state) => state.setSelectedMonth);
  const setYear = useDashboardStore((state) => state.setYear);

  const transactions = useTransactionStore((state) => state.transactions);

  const dynamicYears = React.useMemo(() => {
    return getAvailableYears(transactions, currentYear);
  }, [transactions, currentYear]);

  const yearData = React.useMemo(() => {
    return computeYearDataFromTransactions(currentYear, transactions, selectedMonth);
  }, [currentYear, transactions, selectedMonth]);

  const { theme, setTheme } = useTheme();

  const handleSelectYear = (year: number) => {
    setYear(year);
    useTransactionStore.getState().setSelectedYear(year);
  };

  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    useTransactionStore.getState().setSelectedMonth(month);
  };

  const handlePrevMonth = () => {
    if (selectedMonth > 0) {
      handleSelectMonth(selectedMonth - 1);
    } else {
      handleSelectMonth(11);
      handleSelectYear(currentYear - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth < 11) {
      handleSelectMonth(selectedMonth + 1);
    } else {
      handleSelectMonth(0);
      handleSelectYear(currentYear + 1);
    }
  };

  const currentMonthData = yearData.months[selectedMonth] || yearData.months[0];

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col">
      {/* HEADER DE NAVEGAÇÃO SUPERIOR */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-foreground block">
                Controle Financeiro
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:block">
                Gestão Pessoal & Orçamento
              </span>
            </div>
          </div>

          {/* ABAS DE NAVEGAÇÃO CENTRALIZADAS (DESKTOP) */}
          <div className="hidden md:flex items-center rounded-lg border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="size-3.5" />
              Dashboard Anual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "transactions"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="size-3.5" />
              Lançamentos do Mês
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("budget")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "budget"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="size-3.5" />
              Orçamento Mensal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assistant")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "assistant"
                  ? "bg-card text-foreground shadow-xs font-semibold text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5 text-primary" />
              Assistente IA
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* SELETOR DE PERÍODO (MÊS E ANO NO HEADER) */}
            {activeTab === "dashboard" && (
              <div className="flex items-center gap-1.5">
                <div className="hidden sm:flex items-center rounded-lg border border-border bg-card p-0.5 shadow-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handlePrevMonth}
                    title="Mês anterior"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>

                  <Select
                    value={String(selectedMonth)}
                    onValueChange={(val) => handleSelectMonth(Number(val))}
                  >
                    <SelectTrigger className="h-7 min-w-[96px] border-0 bg-transparent px-2 text-xs font-semibold focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, idx) => (
                        <SelectItem key={idx} value={String(idx)} className="text-xs">
                          {m.full}
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
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>

                <Select
                  value={String(currentYear)}
                  onValueChange={(val) => handleSelectYear(Number(val))}
                >
                  <SelectTrigger className="h-8 w-22 text-xs font-medium">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicYears.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* USUÁRIO ATIVO */}
            {currentUser && (
              <div className="hidden lg:flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                <UserIcon className="size-3.5 text-foreground" />
                <span className="font-medium text-foreground">{currentUser.name}</span>
              </div>
            )}

            {/* BOTÃO CONFIGURAR CATEGORIAS GLOBAIS */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCategoryManagerOpen(true)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
              title="Configurar Categorias Globais"
            >
              <Tags className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Categorias</span>
            </Button>

            {/* BOTÃO INTEGRAÇÃO SUPABASE / NUVEM */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCloudSyncOpen(true)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 relative"
              title="Integração Supabase & Banco de Dados"
            >
              <Cloud className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Nuvem</span>
              <span
                className={`size-1.5 rounded-full ${
                  isCloudConfigured ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
            </Button>

            {/* BOTÃO DE TEMA */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Alternar tema"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* BOTÃO DE LOGOUT */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {/* ABAS DE NAVEGAÇÃO PARA TELAS MENORES (MOBILE/TABLET) */}
        <div className="flex md:hidden border-t border-border px-4 py-2 justify-center bg-card">
          <div className="grid grid-cols-4 w-full max-w-md rounded-lg border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="size-3" />
              Dash
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                activeTab === "transactions"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="size-3" />
              Lançar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("budget")}
              className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                activeTab === "budget"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="size-3" />
              Metas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assistant")}
              className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                activeTab === "assistant"
                  ? "bg-card text-foreground shadow-xs font-semibold text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3 text-primary" />
              IA
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO DA ABA ATIVA */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-4 py-6 sm:px-6">
        {activeTab === "dashboard" ? (
          <div className="space-y-6">
            {/* CABEÇALHO DO DASHBOARD COM CONTROLES DE MÊS */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      Dashboard Anual
                    </h1>
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary font-medium text-xs px-2.5 py-0.5"
                    >
                      {currentMonthData.monthFullName} / {currentYear}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acompanhamento de receitas, gastos e saldo mês a mês para o ano de {currentYear}.
                  </p>
                </div>

                {/* CONTROLES DE MÊS E ANO */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={handlePrevMonth}
                      title="Mês anterior"
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>

                    <Select
                      value={String(selectedMonth)}
                      onValueChange={(val) => handleSelectMonth(Number(val))}
                    >
                      <SelectTrigger className="h-7 min-w-[110px] border-0 bg-transparent px-2.5 text-xs font-semibold focus:ring-0">
                        <Calendar className="size-3.5 mr-1.5 text-primary shrink-0" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((m, idx) => (
                          <SelectItem key={idx} value={String(idx)} className="text-xs">
                            {m.full}
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
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>

                  <Select
                    value={String(currentYear)}
                    onValueChange={(val) => handleSelectYear(Number(val))}
                  >
                    <SelectTrigger className="h-8 w-22 text-xs font-medium">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicYears.map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SELETOR DE MÊS EM ABAS / PILLS (12 MESES) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {MONTH_NAMES.map((m, idx) => {
                  const isSelected = selectedMonth === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARDS DE KPIS CONSOLIDADOS */}
            <KpiCards
              kpis={yearData.kpis}
              year={currentYear}
              monthName={currentMonthData.monthFullName}
            />

            {/* CARD DESTACADO: QUANTO POSSO GASTAR? */}
            <DailyBudgetCard
              currentBalance={yearData.kpis.currentBalance}
              income={currentMonthData.income}
              expenses={currentMonthData.expenses}
              selectedMonth={selectedMonth}
              selectedYear={currentYear}
              monthName={currentMonthData.monthFullName}
            />

            {/* GRÁFICO COMPARATIVO MÊS A MÊS */}
            <MonthlyChart
              months={yearData.months}
              year={currentYear}
              selectedMonth={selectedMonth}
              onSelectMonth={handleSelectMonth}
            />

            {/* TABELA DE DETALHAMENTO MENSAL */}
            <MonthlyTable
              months={yearData.months}
              year={currentYear}
              selectedMonth={selectedMonth}
              onSelectMonth={handleSelectMonth}
            />
          </div>
        ) : activeTab === "transactions" ? (
          <TransactionsView />
        ) : activeTab === "budget" ? (
          <BudgetView />
        ) : (
          <AssistantView />
        )}
      </main>

      {/* MODAL GLOBAL DE CONFIGURAÇÃO DE CATEGORIAS */}
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />

      {/* MODAL DE INTEGRAÇÃO COM SUPABASE */}
      <CloudSyncDialog
        open={cloudSyncOpen}
        onOpenChange={setCloudSyncOpen}
      />
    </div>
  );
}
