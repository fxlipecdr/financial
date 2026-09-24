"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Calculator, Sparkles, AlertTriangle, CheckCircle2, AlertOctagon } from "lucide-react";
import { FinancialAdvisorService } from "../services/financial-advisor.service";
import { PurchaseSimulationResult } from "../types/assistant.types";

interface PurchaseSimulatorCardProps {
  totalIncome: number;
  totalExpenses: number;
  pendingExpenses: number;
  dailyBudget: number;
  daysRemainingInMonth: number;
}

export function PurchaseSimulatorCard({
  totalIncome,
  totalExpenses,
  pendingExpenses,
  dailyBudget,
  daysRemainingInMonth,
}: PurchaseSimulatorCardProps) {
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState<number | "">("");
  const [isInstallment, setIsInstallment] = React.useState(false);
  const [installmentsCount, setInstallmentsCount] = React.useState(3);

  const simulationResult = React.useMemo<PurchaseSimulationResult | null>(() => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return null;

    return FinancialAdvisorService.simulatePurchase({
      input: {
        itemDescription: description || "Nova Compra",
        amount: numAmount,
        isInstallment,
        installmentsCount: installmentsCount || 1,
      },
      totalIncome,
      totalExpenses,
      pendingExpenses,
      dailyBudget,
      daysRemainingInMonth,
    });
  }, [
    description,
    amount,
    isInstallment,
    installmentsCount,
    totalIncome,
    totalExpenses,
    pendingExpenses,
    dailyBudget,
    daysRemainingInMonth,
  ]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Simulador &quot;Posso Comprar?&quot;</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Descubra se uma compra planejada cabe no seu orçamento sem apertar o bolso.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] gap-1 text-primary border-primary/20 bg-primary/5">
            <Calculator className="size-3" />
            Decisor Inteligente
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* CAMPOS DE ENTRADA */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 space-y-1.5">
            <Label htmlFor="sim-desc" className="text-xs">O que você quer comprar?</Label>
            <Input
              id="sim-desc"
              placeholder="ex: Celular Novo, Tênis, Viagem"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="sm:col-span-3 space-y-1.5">
            <Label htmlFor="sim-amount" className="text-xs">Valor Total (R$)</Label>
            <Input
              id="sim-amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              className="text-xs h-8 font-mono"
            />
          </div>

          <div className="sm:col-span-4 flex flex-col justify-end pb-0.5">
            <div className="flex items-center gap-2">
              <input
                id="sim-installment"
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
              />
              <Label htmlFor="sim-installment" className="text-xs cursor-pointer text-muted-foreground">
                Parcelado no cartão?
              </Label>
            </div>
            {isInstallment && (
              <div className="flex items-center gap-1.5 mt-1.5 animate-in fade-in">
                <span className="text-[11px] text-muted-foreground">em</span>
                <Input
                  type="number"
                  min={2}
                  max={48}
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Math.max(2, Number(e.target.value)))}
                  className="w-16 h-7 text-xs font-mono font-semibold"
                />
                <span className="text-[11px] text-muted-foreground">vezes</span>
              </div>
            )}
          </div>
        </div>

        {/* VEREDITO DA SIMULAÇÃO */}
        {simulationResult ? (
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {simulationResult.verdict === "safe" ? (
                  <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                ) : simulationResult.verdict === "caution" ? (
                  <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                ) : (
                  <AlertOctagon className="size-5 text-rose-500 shrink-0" />
                )}
                <span className="text-sm font-bold text-foreground">
                  {simulationResult.headline}
                </span>
              </div>
              <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold ${simulationResult.badgeVariant}`}>
                {simulationResult.verdictLabel}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              {simulationResult.explanation}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border text-xs">
              <div className="rounded-lg bg-card p-2 border border-border">
                <span className="text-[10px] text-muted-foreground block">Impacto no Mês</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(simulationResult.monthlyImpact)}
                </span>
              </div>

              <div className="rounded-lg bg-card p-2 border border-border">
                <span className="text-[10px] text-muted-foreground block">Redução no Gasto/Dia</span>
                <span className="font-mono font-semibold text-destructive">
                  - {formatCurrency(simulationResult.dailyImpact)}/dia
                </span>
              </div>

              <div className="rounded-lg bg-card p-2 border border-border col-span-2 sm:col-span-1">
                <span className="text-[10px] text-muted-foreground block">Saldo Livre Restante</span>
                <span className={`font-mono font-semibold ${simulationResult.freeBalanceAfterPurchase >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {formatCurrency(simulationResult.freeBalanceAfterPurchase)}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-primary/5 p-2.5 border border-primary/20 text-xs text-foreground flex items-start gap-2">
              <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5" />
              <span>{simulationResult.recommendation}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Digite um valor acima para ver o diagnóstico em tempo real se a compra é segura para seu momento financeiro.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
