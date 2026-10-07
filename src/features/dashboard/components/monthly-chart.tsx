"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { MonthData } from "../types/dashboard.types";
import { formatCurrency } from "../lib/financial-math";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TrendingUp, BarChart3, Wallet } from "lucide-react";

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
    const patrimonyItem = payload.find((p) => p.dataKey === "patrimony");

    const income = Number(incomeItem?.value || 0);
    const expenses = Number(expenseItem?.value || 0);
    const balance = income - expenses;
    const patrimony = Number(patrimonyItem?.value ?? balance);

    return (
      <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-sm p-3.5 text-xs shadow-lg space-y-2 min-w-48 z-50">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <p className="font-bold text-foreground text-sm">{label}</p>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Resumo Mensal
          </span>
        </div>

        <div className="space-y-1.5 font-mono">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground font-sans">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              Receitas:
            </span>
            <span className="font-semibold text-emerald-500 dark:text-emerald-400">
              {formatCurrency(income)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground font-sans">
              <span className="size-2 rounded-full bg-rose-500 shrink-0" />
              Gastos:
            </span>
            <span className="font-semibold text-rose-500 dark:text-rose-400">
              {formatCurrency(expenses)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 pt-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground font-sans">
              <span className="size-2 rounded-full bg-blue-500 shrink-0" />
              Patrimônio:
            </span>
            <span className="font-bold text-blue-500 dark:text-blue-400">
              {formatCurrency(patrimony)}
            </span>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-border/60 flex items-center justify-between gap-4">
            <span className="text-muted-foreground font-sans">Saldo do Mês:</span>
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
  const [chartMode, setChartMode] = React.useState<"combo" | "bars" | "patrimony">("combo");
  const [visible, setVisible] = React.useState({
    income: true,
    expenses: true,
    patrimony: true,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prepara os dados adicionando explicitamente o campo patrimony (saldo acumulado)
  const chartData = React.useMemo(() => {
    return months.map((m) => {
      const patrimony = m.accumulatedBalance ?? m.balance;
      return {
        ...m,
        patrimony,
      };
    });
  }, [months]);

  const handleLegendClick = (data: { dataKey?: string | number }) => {
    const key = data?.dataKey as "income" | "expenses" | "patrimony" | undefined;
    if (key && key in visible) {
      setVisible((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

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
    <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              Comparativo Mensal: Receitas, Gastos & Patrimônio
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Distribuição dos fluxos financeiros e evolução do patrimônio líquido para o ano de {year}. Clique em qualquer mês para selecioná-lo.
            </CardDescription>
          </div>

          {/* ALTERNADOR DE VISUALIZAÇÃO DO GRÁFICO */}
          <SegmentedControl
            value={chartMode}
            onChange={setChartMode}
            size="sm"
            className="self-start sm:self-auto shrink-0"
            options={[
              {
                value: "combo",
                label: "Barras + Linha",
                icon: <TrendingUp className="size-3.5 text-blue-500" />,
                title: "Exibe Receitas e Gastos em barras com a evolução do Patrimônio em linha contínua",
              },
              {
                value: "bars",
                label: "3 Barras",
                icon: <BarChart3 className="size-3.5 text-emerald-500" />,
                title: "Exibe Receitas, Gastos e Patrimônio lado a lado em 3 barras",
              },
              {
                value: "patrimony",
                label: "Só Patrimônio",
                icon: <Wallet className="size-3.5 text-blue-500" />,
                title: "Foco exclusivo na evolução acumulada do Patrimônio Líquido",
              },
            ]}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 15, left: 5, bottom: 0 }}
              barGap={chartMode === "bars" ? 4 : 6}
              onClick={(e) => {
                if (e && typeof e.activeTooltipIndex === "number") {
                  onSelectMonth?.(e.activeTooltipIndex);
                }
              }}
              style={{ cursor: onSelectMonth ? "pointer" : "default" }}
            >
              <defs>
                <linearGradient id="patrimonyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                opacity={0.35}
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
                width={65}
                tickFormatter={(value) => {
                  const sign = value < 0 ? "-" : "";
                  const abs = Math.abs(value);
                  if (abs >= 1000) {
                    return `${sign}R$ ${(abs / 1000).toFixed(0)}k`;
                  }
                  return `${sign}R$ ${abs}`;
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: "12px", cursor: "pointer" }}
                onClick={(e) => handleLegendClick(e as any)}
              />

              {/* MODO SÓ PATRIMÔNIO: Área preenchida com gradiente */}
              {chartMode === "patrimony" && (
                <Area
                  type="monotone"
                  dataKey="patrimony"
                  name="Patrimônio"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#patrimonyAreaGradient)"
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6, fill: "#60a5fa", stroke: "#ffffff", strokeWidth: 2 }}
                  hide={!visible.patrimony}
                />
              )}

              {/* MODO BARRAS OU COMBO: Barras de Receitas e Gastos */}
              {chartMode !== "patrimony" && (
                <>
                  <Bar
                    dataKey="income"
                    name="Receitas"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={chartMode === "bars" ? 22 : 28}
                    hide={!visible.income}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Gastos"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={chartMode === "bars" ? 22 : 28}
                    hide={!visible.expenses}
                  />
                </>
              )}

              {/* MODO 3 BARRAS: Patrimônio como 3ª barra lado a lado */}
              {chartMode === "bars" && (
                <Bar
                  dataKey="patrimony"
                  name="Patrimônio"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                  hide={!visible.patrimony}
                />
              )}

              {/* MODO COMBO (PADRÃO): Patrimônio como linha contínua conectando os meses */}
              {chartMode === "combo" && (
                <Line
                  type="monotone"
                  dataKey="patrimony"
                  name="Patrimônio"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6, fill: "#60a5fa", stroke: "#ffffff", strokeWidth: 2 }}
                  hide={!visible.patrimony}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
