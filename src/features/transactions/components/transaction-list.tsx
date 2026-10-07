"use client";

import * as React from "react";
import { toast } from "sonner";
import { Transaction } from "../types/transaction.types";
import { getCategoryById } from "../schemas/transaction.schemas";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { useTransactionStore } from "../stores/transaction.store";
import { formatCurrency } from "@/features/dashboard/lib/financial-math";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Pencil,
  Search,
  Receipt,
  Filter,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionEditDialog } from "./transaction-edit-dialog";

interface TransactionListProps {
  transactions: Transaction[];
  monthName: string;
  year: number;
}

export function TransactionList({
  transactions,
  monthName,
  year,
}: TransactionListProps) {
  const [filterType, setFilterType] = React.useState<"all" | "income" | "expense" | "pending">("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  // Reativo às mudanças de categorias (nome, cor, etc.)
  useCategoryStore((state) => state.categories);
  const getCategory = useCategoryStore((state) => state.getCategoryById);

  const removeTransaction = useTransactionStore((state) => state.removeTransaction);
  const removeInstallmentGroup = useTransactionStore((state) => state.removeInstallmentGroup);
  const toggleStatus = useTransactionStore((state) => state.toggleTransactionStatus);

  const [installmentDeleteTx, setInstallmentDeleteTx] = React.useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType =
      filterType === "all" ||
      (filterType === "pending" ? tx.status === "pending" : tx.type === filterType);
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategory(tx.category).name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleDelete = (id: string, description: string) => {
    removeTransaction(id);
    toast.success("Lançamento removido", {
      description: `"${description}" foi excluído com sucesso.`,
    });
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              Lançamentos de {monthName}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {transactions.length} lançamentos registrados em {monthName} de {year}
            </CardDescription>
          </div>

          {/* FILTROS RÁPIDOS COM SEGMENTED CONTROL */}
          <SegmentedControl
            value={filterType}
            onChange={setFilterType}
            size="sm"
            className="self-start sm:self-auto shrink-0"
            options={[
              { value: "all", label: "Todos" },
              { value: "expense", label: "Gastos" },
              { value: "income", label: "Receitas" },
              { value: "pending", label: "A Vencer" },
            ]}
          />
        </div>

        {/* CAMPO DE BUSCA */}
        <div className="relative pt-2">
          <Input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-8 bg-muted/30 border-border/60 rounded-xl"
          />
          <Search className="size-3.5 absolute left-2.5 top-4 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Filter className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhum lançamento encontrado</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              {searchTerm || filterType !== "all"
                ? "Nenhum resultado com os filtros selecionados."
                : "Utilize o botão 'Novo Lançamento' para adicionar uma receita ou despesa."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2.5 font-medium">Data</th>
                  <th className="pb-2.5 font-medium">Descrição</th>
                  <th className="pb-2.5 font-medium">Categoria</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">Valor</th>
                  <th className="pb-2.5 font-medium text-right w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => {
                  const cat = getCategoryById(tx.category);
                  const isIncome = tx.type === "income";

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* DATA */}
                      <td className="py-2.5 text-muted-foreground font-mono">
                        {formatDate(tx.date)}
                      </td>

                      {/* DESCRIÇÃO E ÍCONE */}
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex size-6 items-center justify-center rounded-md shrink-0 ${
                              isIncome
                                ? "bg-primary/10 text-primary"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="size-3.5" />
                            ) : (
                              <ArrowUpRight className="size-3.5" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-foreground">
                              {tx.description}
                            </span>
                            {tx.installmentIndex != null && tx.totalInstallments != null && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono font-medium px-1.5 py-0 h-4 bg-muted text-muted-foreground border border-border"
                              >
                                {tx.installmentIndex}/{tx.totalInstallments}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CATEGORIA */}
                      <td className="py-2.5">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal gap-1.5"
                          style={{
                            borderColor: `${cat.color}40`,
                            backgroundColor: `${cat.color}15`,
                            color: cat.color,
                          }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </Badge>
                      </td>

                      {/* STATUS (PAGO / A VENCER) */}
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            toggleStatus(tx.id);
                            toast.info(
                              tx.status === "pending"
                                ? `"${tx.description}" marcado como Pago`
                                : `"${tx.description}" marcado como Pendente`
                            );
                          }}
                          title="Clique para alternar status (Pago / Pendente)"
                          className="cursor-pointer"
                        >
                          {tx.status === "pending" ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-500 gap-1 hover:bg-amber-500/20 transition-colors cursor-pointer"
                            >
                              <Clock className="size-2.5" />
                              A Vencer
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-primary/30 bg-primary/10 text-primary gap-1 hover:bg-primary/20 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="size-2.5" />
                              Pago
                            </Badge>
                          )}
                        </button>
                      </td>

                      {/* VALOR */}
                      <td className="py-2.5 text-right font-mono font-semibold">
                        <span
                          className={
                            isIncome ? "text-primary" : "text-foreground"
                          }
                        >
                          {isIncome ? "+ " : "- "}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* AÇÕES: EDITAR E EXCLUIR */}
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setEditingTx(tx)}
                            className="opacity-60 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 transition-all"
                            title="Editar lançamento"
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              if (tx.installmentGroupId) {
                                setInstallmentDeleteTx(tx);
                              } else {
                                handleDelete(tx.id, tx.description);
                              }
                            }}
                            className="opacity-60 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO DE PARCELA */}
      <Dialog
        open={!!installmentDeleteTx}
        onOpenChange={(open) => !open && setInstallmentDeleteTx(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Excluir Lançamento Parcelado
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              &quot;{installmentDeleteTx?.description}&quot; faz parte de um lançamento em {installmentDeleteTx?.totalInstallments} parcelas (Parcela {installmentDeleteTx?.installmentIndex}/{installmentDeleteTx?.totalInstallments}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-xs h-10 border-border hover:bg-muted font-normal text-foreground"
              onClick={() => {
                if (installmentDeleteTx) {
                  removeTransaction(installmentDeleteTx.id);
                  toast.success("Parcela excluída", {
                    description: `Apenas a parcela ${installmentDeleteTx.installmentIndex}/${installmentDeleteTx.totalInstallments} foi removida.`,
                  });
                  setInstallmentDeleteTx(null);
                }
              }}
            >
              <Trash2 className="size-3.5 mr-2 text-muted-foreground shrink-0" />
              <span>Excluir <strong>apenas</strong> esta parcela ({installmentDeleteTx?.installmentIndex}/{installmentDeleteTx?.totalInstallments})</span>
            </Button>

            <Button
              type="button"
              variant="destructive"
              className="w-full justify-start text-xs h-10 font-normal"
              onClick={() => {
                if (installmentDeleteTx && installmentDeleteTx.installmentGroupId) {
                  removeInstallmentGroup(
                    installmentDeleteTx.installmentGroupId,
                    installmentDeleteTx.installmentIndex
                  );
                  toast.success("Série de parcelas excluída", {
                    description: `A parcela ${installmentDeleteTx.installmentIndex} e as parcelas futuras foram removidas.`,
                  });
                  setInstallmentDeleteTx(null);
                }
              }}
            >
              <Trash2 className="size-3.5 mr-2 shrink-0" />
              <span>Excluir <strong>esta e todas as próximas</strong> parcelas</span>
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setInstallmentDeleteTx(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE LANÇAMENTO */}
      <TransactionEditDialog
        transaction={editingTx}
        open={!!editingTx}
        onOpenChange={(open) => !open && setEditingTx(null)}
      />
    </Card>
  );
}
