"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusCircle, ArrowUpRight, ArrowDownLeft, Repeat } from "lucide-react";
import {
  transactionFormSchema,
  TransactionFormData,
} from "../schemas/transaction.schemas";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { useTransactionStore, addMonthsClamped } from "../stores/transaction.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TransactionFormProps {
  defaultDate?: string;
}

export function TransactionForm({ defaultDate }: TransactionFormProps) {
  const [open, setOpen] = React.useState(false);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const addInstallmentTransactions = useTransactionStore(
    (state) => state.addInstallmentTransactions
  );
  const allCategories = useCategoryStore((state) => state.categories);

  const expenseCategories = allCategories.filter((c) => c.type === "expense");
  const incomeCategories = allCategories.filter((c) => c.type === "income");

  const todayStr = defaultDate || new Date().toISOString().split("T")[0];

  const defaultCategory = expenseCategories[0]?.id || "alimentacao";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      description: "",
      amount: 0,
      category: defaultCategory,
      date: todayStr,
      status: "paid",
      isInstallment: false,
      installmentsCount: 2,
      amountMode: "total",
    },
  });

  const selectedType = watch("type");
  const selectedCategory = watch("category");
  const isInstallment = watch("isInstallment");
  const installmentsCount = watch("installmentsCount") || 2;
  const amountMode = watch("amountMode") || "total";
  const rawAmount = watch("amount") || 0;
  const selectedDate = watch("date") || todayStr;

  const categories = selectedType === "expense" ? expenseCategories : incomeCategories;

  const handleTypeChange = (newType: "income" | "expense") => {
    setValue("type", newType);
    const newCategories = newType === "expense" ? expenseCategories : incomeCategories;
    if (newCategories.length > 0) {
      setValue("category", newCategories[0].id);
    }
  };

  // Cálculos de pré-visualização das parcelas
  const calculatedPerInstallment =
    amountMode === "total"
      ? installmentsCount > 0
        ? rawAmount / installmentsCount
        : 0
      : rawAmount;

  const calculatedTotal =
    amountMode === "total" ? rawAmount : rawAmount * installmentsCount;

  const endDate = addMonthsClamped(selectedDate, Math.max(0, installmentsCount - 1));

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDateBR = (iso: string) => {
    if (!iso) return "";
    const parts = iso.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const onSubmit = (data: TransactionFormData) => {
    try {
      if (data.isInstallment && data.installmentsCount > 1) {
        const created = addInstallmentTransactions({
          description: data.description.trim(),
          amount: Number(data.amount),
          type: data.type,
          category: data.category,
          date: data.date,
          status: data.status,
          installmentsCount: Number(data.installmentsCount),
          amountMode: data.amountMode,
        });

        const perInstValue =
          data.amountMode === "total"
            ? Number(data.amount) / Number(data.installmentsCount)
            : Number(data.amount);

        toast.success(
          `${created.length} parcelas registradas com sucesso!`,
          {
            description: `${data.description} (${data.installmentsCount}x de ${formatCurrency(
              perInstValue
            )}) geradas mês a mês.`,
          }
        );
      } else {
        addTransaction({
          description: data.description.trim(),
          amount: Number(data.amount),
          type: data.type,
          category: data.category,
          date: data.date,
          status: data.status,
        });

        toast.success(
          data.type === "income" ? "Receita adicionada!" : "Gasto registrado!",
          {
            description: `${data.description} no valor de ${formatCurrency(
              Number(data.amount)
            )} (${data.status === "pending" ? "Pendente" : "Pago"})`,
          }
        );
      }

      reset({
        type: selectedType,
        description: "",
        amount: 0,
        category: categories[0]?.id || "alimentacao",
        date: data.date,
        status: "paid",
        isInstallment: false,
        installmentsCount: 2,
        amountMode: "total",
      });

      setOpen(false);
    } catch {
      toast.error("Ocorreu um erro ao salvar o lançamento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm">
          <PlusCircle className="size-4" />
          Novo Lançamento
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Lançamento</DialogTitle>
          <DialogDescription>
            Adicione uma nova receita ou despesa categorizada para o mês.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* SELETOR DE TIPO (RECEITA / DESPESA) */}
          <div className="space-y-1.5">
            <Label>Tipo de Transação</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("expense")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                  selectedType === "expense"
                    ? "border-destructive bg-destructive/10 text-destructive font-semibold shadow-xs"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <ArrowUpRight className="size-4" />
                Despesa / Gasto
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("income")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                  selectedType === "income"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <ArrowDownLeft className="size-4" />
                Receita / Entrada
              </button>
            </div>
          </div>

          {/* DESCRIÇÃO */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder={
                selectedType === "expense"
                  ? "ex: Compras do Supermercado"
                  : "ex: Salário mensal"
              }
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* VALOR E DATA EM LINHA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* CATEGORIA */}
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select
              value={selectedCategory}
              onValueChange={(val) => setValue("category", val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* OPÇÃO DE REPETIR / PARCELAR EM MÚLTIPLOS MESES */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="isInstallment"
                  className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer"
                >
                  <Repeat className="size-3.5 text-primary" />
                  Repetir / Parcelar em vários meses?
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Gera parcelas futuras automaticamente mês a mês.
                </p>
              </div>
              <input
                id="isInstallment"
                type="checkbox"
                className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                {...register("isInstallment")}
              />
            </div>

            {isInstallment && (
              <div className="space-y-3 pt-2 border-t border-border animate-in fade-in-50">
                {/* MODO DO VALOR */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    O valor digitado acima é:
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setValue("amountMode", "total")}
                      className={`px-2.5 py-1.5 text-xs rounded-md border text-center transition-all ${
                        amountMode === "total"
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Valor Total da Compra
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("amountMode", "per_installment")}
                      className={`px-2.5 py-1.5 text-xs rounded-md border text-center transition-all ${
                        amountMode === "per_installment"
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Valor de Cada Parcela
                    </button>
                  </div>
                </div>

                {/* QUANTIDADE DE PARCELAS */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="installmentsCount"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Número de Parcelas
                    </Label>
                    <div className="flex items-center gap-1">
                      {[2, 3, 6, 10, 12].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setValue("installmentsCount", num)}
                          className={`px-1.5 py-0.5 text-[10px] rounded border transition-all ${
                            installmentsCount === num
                              ? "bg-primary text-primary-foreground font-bold border-primary"
                              : "bg-card text-muted-foreground hover:text-foreground border-border"
                          }`}
                        >
                          {num}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      id="installmentsCount"
                      type="number"
                      min={2}
                      max={72}
                      className="h-8 text-xs font-semibold"
                      {...register("installmentsCount", { valueAsNumber: true })}
                    />
                    <span className="text-xs text-muted-foreground shrink-0 font-medium">
                      vezes (meses)
                    </span>
                  </div>
                </div>

                {/* RESUMO DO PARCELAMENTO */}
                <div className="rounded-lg bg-card p-2.5 border border-border text-[11px] space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Plano de parcelamento:</span>
                    <strong className="text-foreground">
                      {installmentsCount}x de {formatCurrency(calculatedPerInstallment)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Valor consolidado:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(calculatedTotal)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                    📅 1ª parcela em {formatDateBR(selectedDate)}, restantes como &quot;A Vencer&quot; até {formatDateBR(endDate)}.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STATUS: PAGO OU PENDENTE (CONTA FUTURA) */}
          <div className="space-y-1.5">
            <Label>
              {isInstallment ? "Status da 1ª Parcela" : "Status do Lançamento"}
            </Label>
            <Select
              value={watch("status") || "paid"}
              onValueChange={(val: "paid" | "pending") => setValue("status", val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    Pago / Liquidado
                  </span>
                </SelectItem>
                <SelectItem value="pending" className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500" />
                    Pendente / A Vencer (Conta Futura)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Lançamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
