"use client";

import * as React from "react";
import { MonthData } from "../types/dashboard.types";
import { formatCurrency } from "../lib/financial-math";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";

interface MonthlyTableProps {
  months: MonthData[];
  year: number;
  selectedMonth?: number;
  onSelectMonth?: (monthIndex: number) => void;
  onOpenReportDialog?: () => void;
}

export function MonthlyTable({ months, year, selectedMonth, onSelectMonth, onOpenReportDialog }: MonthlyTableProps) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-foreground">
              Detalhamento Mês a Mês ({year})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Valores consolidados de receitas, despesas e balanço líquido mensal. Clique na linha de um mês para selecioná-lo.
            </CardDescription>
          </div>

          {onOpenReportDialog && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenReportDialog}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 rounded-lg border-border/80 shadow-2xs self-start sm:self-auto shrink-0 transition-colors"
              title="Emitir Relatório em PDF com todos os meses e lançamentos"
            >
              <FileText className="size-3.5 text-blue-500" />
              <span>Emitir Relatório PDF</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-3 font-medium">Mês</th>
                <th className="pb-3 font-medium">Receitas</th>
                <th className="pb-3 font-medium">Gastos</th>
                <th className="pb-3 font-medium">Saldo do Mês</th>
                <th className="pb-3 font-medium">Saldo Acumulado</th>
                <th className="pb-3 font-medium text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {months.map((m) => {
                const isPositive = m.balance >= 0;
                const isSelected = selectedMonth === m.monthIndex;
                const accBalance = m.accumulatedBalance ?? m.balance;
                const isAccPositive = accBalance >= 0;

                return (
                  <tr
                    key={m.monthIndex}
                    onClick={() => onSelectMonth?.(m.monthIndex)}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/15 font-semibold"
                        : "hover:bg-muted/40"
                    } ${onSelectMonth ? "cursor-pointer" : ""}`}
                    title="Clique para selecionar este mês"
                  >
                    <td className="py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {isSelected && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                        <span>{m.monthFullName}</span>
                        {isSelected && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                            Selecionado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-foreground font-mono">
                      {formatCurrency(m.income)}
                    </td>
                    <td className="py-3 text-foreground font-mono">
                      {formatCurrency(m.expenses)}
                    </td>
                    <td className="py-3 font-mono">
                      <span className={`font-semibold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                        {formatCurrency(m.balance)}
                      </span>
                    </td>
                    <td className="py-3 font-mono">
                      <span className={`font-semibold ${isAccPositive ? "text-emerald-500" : "text-rose-500"}`}>
                        {formatCurrency(accBalance)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {isPositive ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] gap-1 font-medium"
                        >
                          <ArrowUpRight className="size-3" />
                          Superávit
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-0 text-[10px] gap-1 font-medium"
                        >
                          <ArrowDownRight className="size-3" />
                          Déficit
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
