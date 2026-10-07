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
  LayoutDashboard,
  Receipt,
  Target,
  Tags,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Zap,
  FileText,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { CategoryManagerDialog } from "@/features/categories/components/category-manager-dialog";
import { CloudSyncDialog } from "@/features/sync/components/cloud-sync-dialog";
import { DebtPayoffDialog } from "@/features/transactions/components/debt-payoff-dialog";
import { FinancialReportDialog } from "@/features/reports/components/financial-report-dialog";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type TabId = "dashboard" | "transactions" | "budget" | "assistant";

const NAV_ITEMS: { id: TabId; label: string; short: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Visão Geral", short: "Início", icon: LayoutDashboard },
  { id: "transactions", label: "Lançamentos", short: "Lançar", icon: Receipt },
  { id: "budget", label: "Orçamento", short: "Metas", icon: Target },
  { id: "assistant", label: "Assistente IA", short: "IA", icon: Sparkles },
];

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

export function DashboardView() {
  const [activeTab, setActiveTab] = React.useState<TabId>("dashboard");
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);
  const [cloudSyncOpen, setCloudSyncOpen] = React.useState(false);
  const [payoffDialogOpen, setPayoffDialogOpen] = React.useState(false);
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);
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

  const currentMonthData = yearData.months[selectedMonth] || yearData.months[0];

  const now = new Date();
  const isCalendarYear = currentYear === now.getFullYear();
  const firstName = (currentUser?.name || "").split(" ")[0] || "você";

  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const tools = [
    { label: "Relatório PDF", icon: FileText, onClick: () => setReportDialogOpen(true), tint: "text-sky-500" },
    { label: "Simular Quitação", icon: Zap, onClick: () => setPayoffDialogOpen(true), tint: "text-amber-500" },
    { label: "Categorias", icon: Tags, onClick: () => setCategoryManagerOpen(true), tint: "text-violet-500" },
  ];

  return (
    <div className="min-h-screen text-foreground">
      {/* ================= SIDEBAR (DESKTOP) ================= */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl">
        {/* Marca */}
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/30">
            <Wallet className="size-[18px]" />
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">Controle Financeiro</span>
            <span className="block text-[11px] text-muted-foreground">Gestão pessoal</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
          {/* Navegação principal */}
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground/80">Menu</p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}
                  <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                  {item.id === "assistant" && (
                    <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      Novo
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ferramentas */}
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground/80">Ferramentas</p>
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.label}
                  type="button"
                  onClick={tool.onClick}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  <Icon className={cn("size-4 shrink-0", tool.tint)} />
                  {tool.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCloudSyncOpen(true)}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <Cloud className="size-4 shrink-0 text-emerald-500" />
              Sincronização
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium">
                <span className={cn("size-1.5 rounded-full", isCloudConfigured ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                {isCloudConfigured ? "On" : "Off"}
              </span>
            </button>
          </div>
        </nav>

        {/* Rodapé: usuário + tema + sair */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl p-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold text-primary ring-1 ring-primary/20">
              {getInitials(currentUser?.name)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium">{currentUser?.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">@{currentUser?.username}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative text-muted-foreground hover:text-foreground"
              aria-label="Alternar tema"
              title="Alternar tema"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ================= TOPBAR (MOBILE/TABLET) ================= */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <Wallet className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Controle Financeiro</span>
          </div>
          <div className="flex items-center gap-0.5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button key={tool.label} type="button" variant="ghost" size="icon-sm" onClick={tool.onClick} aria-label={tool.label} title={tool.label}>
                  <Icon className={cn("size-4", tool.tint)} />
                </Button>
              );
            })}
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setCloudSyncOpen(true)} aria-label="Sincronização" className="relative">
              <Cloud className="size-4 text-emerald-500" />
              <span className={cn("absolute right-1 top-1 size-1.5 rounded-full", isCloudConfigured ? "bg-emerald-500" : "bg-amber-500")} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative text-muted-foreground"
              aria-label="Alternar tema"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={logout} aria-label="Sair" className="text-muted-foreground">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ================= CONTEÚDO ================= */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          {activeTab === "dashboard" ? (
            <div className="space-y-6">
              {/* Cabeçalho da página */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {greeting}, <span className="font-medium text-foreground">{firstName}</span>
                  </p>
                  <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-[28px]">
                    Visão geral de {currentMonthData.monthFullName.toLowerCase()}
                  </h1>
                </div>

                {/* Seletor de ano */}
                <div className="flex items-center self-start rounded-xl border border-border/70 bg-card p-1 shadow-xs sm:self-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleSelectYear(currentYear - 1)}
                    title="Ano anterior"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Select value={String(currentYear)} onValueChange={(val) => handleSelectYear(Number(val))}>
                    <SelectTrigger className="h-7 w-[84px] justify-center border-0 bg-transparent px-2 text-[13px] font-semibold shadow-none focus:ring-0 dark:bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicYears.map((y) => (
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
                    onClick={() => handleSelectYear(currentYear + 1)}
                    title="Próximo ano"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Seletor de mês: rolagem horizontal no mobile */}
              <div className="-mx-4 overflow-x-auto scrollbar-none px-4 sm:mx-0 sm:px-0">
                <div className="inline-flex min-w-full gap-1 rounded-2xl border border-border/70 bg-card/70 p-1 shadow-xs backdrop-blur sm:grid sm:grid-cols-12">
                  {MONTH_NAMES.map((m, idx) => {
                    const isSelected = selectedMonth === idx;
                    const isToday = isCalendarYear && idx === now.getMonth();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={cn(
                          "relative flex min-w-[52px] items-center justify-center rounded-xl px-2 py-2 text-[13px] font-medium transition-all duration-200",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {m.short}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <KpiCards kpis={yearData.kpis} year={currentYear} monthName={currentMonthData.monthFullName} />

              <DailyBudgetCard
                currentBalance={yearData.kpis.currentBalance}
                income={currentMonthData.income}
                expenses={currentMonthData.expenses}
                selectedMonth={selectedMonth}
                selectedYear={currentYear}
                monthName={currentMonthData.monthFullName}
                onOpenPayoffDialog={() => setPayoffDialogOpen(true)}
              />

              <MonthlyChart
                months={yearData.months}
                year={currentYear}
                selectedMonth={selectedMonth}
                onSelectMonth={handleSelectMonth}
              />

              <MonthlyTable
                months={yearData.months}
                year={currentYear}
                selectedMonth={selectedMonth}
                onSelectMonth={handleSelectMonth}
                onOpenReportDialog={() => setReportDialogOpen(true)}
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
      </div>

      {/* ================= TAB BAR INFERIOR (MOBILE) ================= */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/12 bg-accent")}>
                  <Icon className="size-[18px]" />
                </span>
                {item.short}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODAL GLOBAL DE CONFIGURAÇÃO DE CATEGORIAS */}
      <CategoryManagerDialog open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />

      {/* MODAL DE INTEGRAÇÃO COM SUPABASE */}
      <CloudSyncDialog open={cloudSyncOpen} onOpenChange={setCloudSyncOpen} />

      {/* MODAL SIMULADOR DE QUITAÇÃO (BOLA DE NEVE) */}
      <DebtPayoffDialog open={payoffDialogOpen} onOpenChange={setPayoffDialogOpen} defaultAmount={2500} />

      {/* MODAL EMISSÃO DE RELATÓRIO PDF */}
      <FinancialReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        defaultYear={currentYear}
        defaultMonth={selectedMonth}
      />
    </div>
  );
}
