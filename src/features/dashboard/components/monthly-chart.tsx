"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { MonthData } from "../types/dashboard.types";
import { formatCurrency } from "../lib/financial-math";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlyChartProps {
  months: MonthData[];
  year: number;
  selectedMonth?: number;
  onSelectMonth?: (monthIndex: number) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number | string;
    color?: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const incomeItem = payload.find((p) => p.dataKey === "income");
    const expenseItem = payload.find((p) => p.dataKey === "expenses");

    const income = Number(incomeItem?.value || 0);
    const expenses = Number(expenseItem?.value || 0);
    const balance = income - expenses;

    return (
      <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-md">
        <p className="font-semibold text-card-foreground mb-1.5">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" />
              Receitas:
            </span>
            <span className="font-medium text-card-foreground">{formatCurrency(income)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-rose-500" />
              Gastos:
            </span>
            <span className="font-medium text-card-foreground">{formatCurrency(expenses)}</span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-border flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Saldo Líquido:</span>
            <span className={`font-semibold ${balance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function MonthlyChart({ months, year, selectedMonth, onSelectMonth }: MonthlyChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Comparativo Mensal</CardTitle>
          <CardDescription className="text-xs">Carregando visualização...</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-xs text-muted-foreground">
          Carregando dados do gráfico...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Comparativo Mensal: Receitas vs Gastos
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Distribuição dos fluxos financeiros mês a mês para o ano de {year}. Clique em qualquer mês para selecioná-lo.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={months}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barGap={6}
              onClick={(e) => {
                if (e && typeof e.activeTooltipIndex === "number") {
                  onSelectMonth?.(e.activeTooltipIndex);
                }
              }}
              style={{ cursor: onSelectMonth ? "pointer" : "default" }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                opacity={0.4}
              />
              <XAxis
                dataKey="monthName"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: "12px" }}
              />
              <Bar
                dataKey="income"
                name="Receitas"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="expenses"
                name="Gastos"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
