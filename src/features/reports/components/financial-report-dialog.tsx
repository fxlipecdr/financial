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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Layers,
  CheckSquare,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Sparkles,
} from "lucide-react";
import { useDashboardStore, MONTH_NAMES, computeYearDataFromTransactions, getAvailableYears } from "@/features/dashboard/stores/dashboard.store";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { generateFinancialPdf } from "../lib/generate-financial-pdf";
import { formatCurrency } from "@/features/dashboard/lib/financial-math";

interface FinancialReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultYear?: number;
  defaultMonth?: number;
}

export function FinancialReportDialog({
  open,
  onOpenChange,
  defaultYear,
  defaultMonth,
}: FinancialReportDialogProps) {
  const currentYear = useDashboardStore((state) => state.currentYear);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useCategoryStore((state) => state.categories);

  const [year, setYear] = React.useState<number>(defaultYear || currentYear);
  const [scope, setScope] = React.useState<"all_months" | "single_month">("all_months");
  const [monthIndex, setMonthIndex] = React.useState<number>(defaultMonth !== undefined ? defaultMonth : selectedMonth);

  // Opções de seções
  const [includeMonthSummary, setIncludeMonthSummary] = React.useState(true);
  const [includeTransactionsList, setIncludeTransactionsList] = React.useState(true);
  const [includeCategoryBreakdown, setIncludeCategoryBreakdown] = React.useState(true);

  const [isGenerating, setIsGenerating] = React.useState(false);

  // Atualiza ano se mudar externamente
  React.useEffect(() => {
    if (defaultYear) setYear(defaultYear);
  }, [defaultYear]);

  // Lista de anos disponíveis
  const availableYears = React.useMemo(() => {
    return getAvailableYears(transactions, year);
  }, [transactions, year]);

  // Mapa de categorias ID -> Nome
  const categoriesMap = React.useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Dados financeiros calculados para o ano selecionado
  const yearData = React.useMemo(() => {
    return computeYearDataFromTransactions(year, transactions, monthIndex);
  }, [year, transactions, monthIndex]);

  // Métricas de pré-visualização
  const previewMetrics = React.useMemo(() => {
    const isSingle = scope === "single_month";
    const ymPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

    const txs = transactions.filter((t) => {
      if (!t?.date) return false;
      if (isSingle) return t.date.startsWith(ymPrefix);
      return t.date.startsWith(`${year}-`);
    });

    let inc = 0;
    let exp = 0;

    if (isSingle) {
      const m = yearData.months[monthIndex];
      inc = m?.income || 0;
      exp = m?.expenses || 0;
    } else {
      inc = yearData.months.reduce((acc, m) => acc + (m.income || 0), 0);
      exp = yearData.months.reduce((acc, m) => acc + (m.expenses || 0), 0);
    }

    const bal = inc - exp;
    const finalPatrimony = isSingle
      ? yearData.months[monthIndex]?.accumulatedBalance ?? bal
      : yearData.months[yearData.months.length - 1]?.accumulatedBalance ?? bal;

    return {
      txCount: txs.length,
      income: inc,
      expenses: exp,
      balance: bal,
      patrimony: finalPatrimony,
    };
  }, [scope, year, monthIndex, transactions, yearData]);

  // Função central para gerar o PDF
  const handleBuildPdf = () => {
    const pdfDoc = generateFinancialPdf({
      year,
      months: yearData.months,
      transactions,
      categoriesMap,
      kpis: yearData.kpis,
      selectedMonth: scope === "single_month" ? monthIndex : undefined,
      includeMonthSummary,
      includeTransactionsList,
      includeCategoryBreakdown,
    });
    return pdfDoc;
  };

  // Baixar arquivo .pdf
  const handleDownloadPdf = () => {
    try {
      setIsGenerating(true);
      const pdf = handleBuildPdf();

      const suffix = scope === "single_month"
        ? `${MONTH_NAMES[monthIndex]?.short || "Mes"}_${year}`
        : `${year}_Completo`;

      const fileName = `Relatorio_Financeiro_${suffix}.pdf`;
      pdf.save(fileName);

      toast.success("📄 Relatório emitido com sucesso!", {
        description: `O arquivo ${fileName} foi baixado no seu dispositivo.`,
      });

      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar o relatório em PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Visualizar em nova aba
  const handlePreviewPdf = () => {
    try {
      setIsGenerating(true);
      const pdf = handleBuildPdf();
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast.success("Relatório aberto em nova aba.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao visualizar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-2xs">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Emitir Relatório em PDF
                <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-normal">
                  Documento Executivo
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Gere um demonstrativo completo com receitas, despesas, saldo acumulado e todos os lançamentos mês a mês.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* SEÇÃO 1: ESCOPO E PERÍODO */}
          <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-blue-500" />
                Período do Relatório
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setScope("all_months")}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                    scope === "all_months"
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  Ano Completo (12 Meses)
                </button>
                <button
                  type="button"
                  onClick={() => setScope("single_month")}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                    scope === "single_month"
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground bg-muted/40"
                  }`}
                >
                  Mês Específico
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
              {/* Seleção de Ano */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Ano de Referência</label>
                <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
                  <SelectTrigger className="h-9 text-xs font-medium font-mono">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs font-mono">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção de Mês (se escopo for single_month) */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {scope === "single_month" ? "Mês Selecionado" : "Horizonte"}
                </label>
                {scope === "single_month" ? (
                  <Select value={String(monthIndex)} onValueChange={(val) => setMonthIndex(Number(val))}>
                    <SelectTrigger className="h-9 text-xs font-medium">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, idx) => (
                        <SelectItem key={idx} value={String(idx)} className="text-xs">
                          {m.full}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 rounded-md border border-border/60 bg-muted/20 px-3 flex items-center text-xs text-muted-foreground font-medium">
                    Janeiro a Dezembro de {year} (Todos os Meses)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: OPÇÕES DE CONTEÚDO A INCLUIR */}
          <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-2.5 shadow-2xs">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-blue-500" />
              Conteúdo a Incluir no Documento
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Toggle 1: Demonstrativo Mês a Mês */}
              <button
                type="button"
                onClick={() => setIncludeMonthSummary(!includeMonthSummary)}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 ${
                  includeMonthSummary
                    ? "border-blue-500/40 bg-blue-500/5 text-foreground"
                    : "border-border/60 bg-muted/20 text-muted-foreground opacity-60"
                }`}
              >
                <div className={`size-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                  includeMonthSummary ? "bg-blue-600 text-white" : "border border-muted-foreground"
                }`}>
                  {includeMonthSummary && <CheckSquare className="size-3" />}
                </div>
                <div>
                  <span className="text-xs font-semibold block">Tabela Mês a Mês</span>
                  <span className="text-[10px] text-muted-foreground block leading-tight mt-0.5">
                    Receitas, gastos, saldo e patrimônio
                  </span>
                </div>
              </button>

              {/* Toggle 2: Lançamentos Detalhados */}
              <button
                type="button"
                onClick={() => setIncludeTransactionsList(!includeTransactionsList)}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 ${
                  includeTransactionsList
                    ? "border-blue-500/40 bg-blue-500/5 text-foreground"
                    : "border-border/60 bg-muted/20 text-muted-foreground opacity-60"
                }`}
              >
                <div className={`size-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                  includeTransactionsList ? "bg-blue-600 text-white" : "border border-muted-foreground"
                }`}>
                  {includeTransactionsList && <CheckSquare className="size-3" />}
                </div>
                <div>
                  <span className="text-xs font-semibold block">Todos Lançamentos</span>
                  <span className="text-[10px] text-muted-foreground block leading-tight mt-0.5">
                    Data, descrição, categoria, status e valor
                  </span>
                </div>
              </button>

              {/* Toggle 3: Gastos por Categoria */}
              <button
                type="button"
                onClick={() => setIncludeCategoryBreakdown(!includeCategoryBreakdown)}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 ${
                  includeCategoryBreakdown
                    ? "border-blue-500/40 bg-blue-500/5 text-foreground"
                    : "border-border/60 bg-muted/20 text-muted-foreground opacity-60"
                }`}
              >
                <div className={`size-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                  includeCategoryBreakdown ? "bg-blue-600 text-white" : "border border-muted-foreground"
                }`}>
                  {includeCategoryBreakdown && <CheckSquare className="size-3" />}
                </div>
                <div>
                  <span className="text-xs font-semibold block">Por Categoria</span>
                  <span className="text-[10px] text-muted-foreground block leading-tight mt-0.5">
                    Ranking e % de gastos por categoria
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* SEÇÃO 3: PRÉ-VISUALIZAÇÃO DE DADOS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Card className="border-border/70 bg-card/60 p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Receitas Totais
              </span>
              <div className="text-base font-extrabold text-emerald-500 dark:text-emerald-400 font-mono mt-0.5">
                {formatCurrency(previewMetrics.income)}
              </div>
            </Card>

            <Card className="border-border/70 bg-card/60 p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Gastos Totais
              </span>
              <div className="text-base font-extrabold text-rose-500 dark:text-rose-400 font-mono mt-0.5">
                {formatCurrency(previewMetrics.expenses)}
              </div>
            </Card>

            <Card className="border-border/70 bg-card/60 p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Saldo Líquido
              </span>
              <div className={`text-base font-extrabold font-mono mt-0.5 ${previewMetrics.balance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {formatCurrency(previewMetrics.balance)}
              </div>
            </Card>

            <Card className="border-border/70 bg-card/60 p-3 shadow-2xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Patrimônio Final
              </span>
              <div className="text-base font-extrabold text-blue-500 dark:text-blue-400 font-mono mt-0.5">
                {formatCurrency(previewMetrics.patrimony)}
              </div>
            </Card>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <Receipt className="size-3.5 text-blue-500" />
              Total de <strong>{previewMetrics.txCount} lançamentos</strong> incluídos no documento.
            </span>
            <span className="text-[11px]">Formato: PDF A4 Padrão Executivo</span>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-start sm:self-center">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Processado localmente no navegador em alta resolução.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
              disabled={isGenerating}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviewPdf}
              disabled={isGenerating}
              className="text-xs gap-1.5"
              title="Abrir pré-visualização em nova aba do navegador"
            >
              <Eye className="size-3.5" />
              Visualizar
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="text-xs gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Download className="size-3.5" />
              {isGenerating ? "Gerando..." : "Baixar PDF"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
