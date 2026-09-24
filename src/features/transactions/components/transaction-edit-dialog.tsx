"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownLeft, Pencil, Repeat } from "lucide-react";
import { Transaction } from "../types/transaction.types";
import {
  editTransactionFormSchema,
  EditTransactionFormData,
} from "../schemas/transaction.schemas";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { useTransactionStore } from "../stores/transaction.store";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionEditDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionEditDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionEditDialogProps) {
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const updateInstallmentGroup = useTransactionStore(
    (state) => state.updateInstallmentGroup
  );
  const allCategories = useCategoryStore((state) => state.categories);

  const expenseCategories = allCategories.filter((c) => c.type === "expense");
  const incomeCategories = allCategories.filter((c) => c.type === "income");

  const isInstallment = !!transaction?.installmentGroupId;

  // Extrair descrição limpa sem o sufixo " (1/3)" para o campo de edição se for parcelado
  const cleanDescription = React.useMemo(() => {
    if (!transaction) return "";
    if (transaction.installmentIndex && transaction.totalInstallments) {
      return transaction.description.replace(/\s*\(\d+\/\d+\)$/, "");
    }
    return transaction.description;
  }, [transaction]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditTransactionFormData>({
    resolver: zodResolver(editTransactionFormSchema),
    defaultValues: {
      type: "expense",
      description: "",
      amount: 0,
      category: "",
      date: "",
      status: "paid",
      updateGroupMeta: false,
    },
  });

  // Atualiza o formulário sempre que uma nova transação for aberta
  React.useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        description: cleanDescription,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
        status: transaction.status,
        updateGroupMeta: false,
      });
    }
  }, [transaction, cleanDescription, reset]);

  const selectedType = watch("type");
  const selectedCategory = watch("category");
  const categories = selectedType === "expense" ? expenseCategories : incomeCategories;

  const handleTypeChange = (newType: "income" | "expense") => {
    setValue("type", newType);
    const newCategories = newType === "expense" ? expenseCategories : incomeCategories;
    if (newCategories.length > 0) {
      setValue("category", newCategories[0].id);
    }
  };

  const onSubmit = (data: EditTransactionFormData) => {
    if (!transaction) return;

    try {
      let finalDescription = data.description.trim();
      if (transaction.installmentIndex && transaction.totalInstallments) {
        finalDescription = `${finalDescription} (${transaction.installmentIndex}/${transaction.totalInstallments})`;
      }

      // 1. Atualiza a transação individual
      updateTransaction(transaction.id, {
        description: finalDescription,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        date: data.date,
        status: data.status,
      });

      // 2. Se for parcelado e o usuário marcou para atualizar o grupo
      if (isInstallment && data.updateGroupMeta && transaction.installmentGroupId) {
        updateInstallmentGroup(transaction.installmentGroupId, {
          description: data.description.trim(),
          category: data.category,
        });
      }

      toast.success("Lançamento atualizado!", {
        description: `"${data.description.trim()}" foi alterado com sucesso.`,
      });

      onOpenChange(false);
    } catch {
      toast.error("Ocorreu um erro ao atualizar o lançamento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" />
            Editar Lançamento
          </DialogTitle>
          <DialogDescription>
            Altere as informações da transação selecionada.
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
            <Label htmlFor="edit-description">Descrição</Label>
            <Input
              id="edit-description"
              placeholder="ex: Compras do Supermercado"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* VALOR E DATA EM LINHA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Valor (R$)</Label>
              <Input
                id="edit-amount"
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
              <Label htmlFor="edit-date">Data</Label>
              <Input id="edit-date" type="date" {...register("date")} />
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

          {/* STATUS: PAGO OU PENDENTE */}
          <div className="space-y-1.5">
            <Label>Status</Label>
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

          {/* SE FOR PARCELADO: AVISO E OPÇÃO DE ATUALIZAR GRUPO */}
          {isInstallment && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground font-medium">
                <Repeat className="size-3.5 text-primary" />
                <span>
                  Parcela <strong>{transaction?.installmentIndex}</strong> de{" "}
                  <strong>{transaction?.totalInstallments}</strong>
                </span>
              </div>
              <div className="flex items-start gap-2 pt-1 border-t border-border">
                <input
                  id="updateGroupMeta"
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                  {...register("updateGroupMeta")}
                />
                <label
                  htmlFor="updateGroupMeta"
                  className="text-[11px] text-muted-foreground cursor-pointer"
                >
                  Replicar a nova <strong>descrição</strong> e <strong>categoria</strong> em todas as {transaction?.totalInstallments} parcelas desta compra
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
