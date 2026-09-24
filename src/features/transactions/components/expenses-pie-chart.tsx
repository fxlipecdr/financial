"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { CategoryExpenseSummary } from "../types/transaction.types";
import { formatCurrency } from "@/features/dashboard/lib/financial-math";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieIcon, AlertCircle } from "lucide-react";

interface ExpensesPieChartProps {
  categoryExpenses: CategoryExpenseSummary[];
  monthName: string;
  year: number;
}

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: CategoryExpenseSummary;
  }>;
}

function CustomPieTooltip({ active, payload }: CustomPieTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data) return null;

    return (
      <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-card-foreground">{data.name}</span>
        </div>
        <div className="space-y-0.5 text-muted-foreground">
          <div className="flex justify-between gap-3">
            <span>Total gasto:</span>
            <span className="font-medium text-foreground">{formatCurrency(data.total)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Participação:</span>
            <span className="font-semibold text-primary">{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function ExpensesPieChart({
  categoryExpenses,
  monthName,
  year,
}: ExpensesPieChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const totalExpenses = categoryExpenses.reduce((acc, curr) => acc + curr.total, 0);

  if (!mounted) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Distribuição de Gastos</CardTitle>
          <CardDescription className="text-xs">Carregando gráfico...</CardDescription>
        </CardHeader>
        <CardContent className="h-72 flex items-center justify-center text-xs text-muted-foreground">
          Carregando visualização...
        </CardContent>
      </Card>
    );
  }

  if (categoryExpenses.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PieIcon className="size-4 text-primary" />
            Distribuição de Gastos por Categoria
          </CardTitle>
          <CardDescription className="text-xs">
            {monthName} de {year}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <AlertCircle className="size-5" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhum gasto registrado</p>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            Cadastre um novo lançamento do tipo despesa para visualizar a divisão dos gastos por categoria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          <PieIcon className="size-4 text-primary" />
          Distribuição dos Gastos por Categoria
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Onde está concentrada a maior parte dos gastos em {monthName} de {year}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* GRÁFICO DONUT / PIE */}
        <div className="relative h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomPieTooltip />} />
              <Pie
                data={categoryExpenses}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {categoryExpenses.map((entry) => (
                  <Cell key={entry.category} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* TOTAL CENTRALIZADO NO DONUT */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] text-muted-foreground font-medium">Total Gastos</span>
            <span className="text-sm font-bold text-foreground font-mono">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>

        {/* RANKING DE CATEGORIAS: PARA ONDE VAI A MAIOR PARTE */}
        <div className="space-y-2.5 pt-2 border-t border-border">
          <h4 className="text-xs font-semibold text-foreground">
            Ranking de Gastos por Categoria
          </h4>

          <div className="space-y-2">
            {categoryExpenses.map((cat, idx) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    {idx + 1}º {cat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(cat.total)}
                    </span>
                    <span className="font-semibold text-foreground w-12 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* BARRA DE PROGRESSO PERCENTUAL */}
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
