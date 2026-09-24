"use client";

import * as React from "react";
import { CategoryBudgetProgress } from "../types/budget.types";
import { getCategoryIcon } from "./edit-budget-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Receipt,
} from "lucide-react";

interface BudgetCategoryCardProps {
  item: CategoryBudgetProgress;
  onEdit: (categoryId: string) => void;
}

export function BudgetCategoryCard({ item, onEdit }: BudgetCategoryCardProps) {
  const Icon = getCategoryIcon(item.categoryId);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Status configuration
  let badgeConfig = {
    label: "Sob Controle",
    variant: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
    barColor: "bg-emerald-500",
  };

  if (item.status === "exceeded") {
    const diff = Math.abs(item.remaining);
    badgeConfig = {
      label: `Estourado (+${formatCurrency(diff)})`,
      variant: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      icon: AlertOctagon,
      barColor: "bg-rose-500",
    };
  } else if (item.status === "warning") {
    badgeConfig = {
      label: `Alerta (${item.percentage.toFixed(0)}%)`,
      variant: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: AlertTriangle,
      barColor: "bg-amber-500",
    };
  }

  const StatusIcon = badgeConfig.icon;
  const progressWidth = Math.min(Math.max(item.percentage, 0), 100);

  return (
    <Card className="overflow-hidden border-border bg-card transition-all hover:shadow-md hover:border-primary/30">
      <CardContent className="p-4 space-y-3.5">
        {/* CABEÇALHO DO CARD: ÍCONE, NOME E BOTÃO EDITAR */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="size-8.5 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs"
              style={{ backgroundColor: item.categoryColor }}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">
                {item.categoryName}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Receipt className="size-3 shrink-0" />
                <span>
                  {item.transactionCount === 0
                    ? "Sem gastos"
                    : `${item.transactionCount} lançamento${
                        item.transactionCount > 1 ? "s" : ""
                      }`}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onEdit(item.categoryId)}
            title="Ajustar teto desta categoria"
            className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>

        {/* STATUS BADGE E INFORMAÇÕES DE LIMITE */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold px-2 py-0.5 gap-1 shrink-0 ${badgeConfig.variant}`}
          >
            <StatusIcon className="size-3 shrink-0" />
            <span>{badgeConfig.label}</span>
          </Badge>

          <span className="text-[11px] text-muted-foreground font-medium">
            Teto: <span className="font-semibold text-foreground">{formatCurrency(item.limit)}</span>
          </span>
        </div>

        {/* BARRA DE PROGRESSO VISUAL */}
        <div className="space-y-1">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${badgeConfig.barColor}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-[10px] font-bold text-foreground">
              {item.percentage.toFixed(1)}% utilizado
            </span>
          </div>
        </div>

        {/* DETALHAMENTO DE VALORES (GASTO VS RESTANTE) */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
              Gasto no Mês
            </span>
            <span className="text-xs font-bold text-foreground">
              {formatCurrency(item.spent)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
              {item.remaining >= 0 ? "Disponível" : "Ultrapassado"}
            </span>
            <span
              className={`text-xs font-bold ${
                item.remaining >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {item.remaining >= 0
                ? formatCurrency(item.remaining)
                : `- ${formatCurrency(Math.abs(item.remaining))}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
