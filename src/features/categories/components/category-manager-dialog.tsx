"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCategoryStore } from "../stores/category.store";
import { Category, CategoryType } from "../types/category.types";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { useBudgetStore } from "@/features/budget/stores/budget.store";
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#84cc16", // Lime
  "#eab308", // Yellow
  "#f59e0b", // Amber
  "#f97316", // Orange
  "#f43f5e", // Rose
  "#ec4899", // Pink
  "#d946ef", // Fuchsia
  "#8b5cf6", // Purple
  "#a855f7", // Violet
  "#14b8a6", // Teal
  "#0ea5e9", // Sky
  "#64748b", // Slate
];

export function CategoryManagerDialog({
  open,
  onOpenChange,
}: CategoryManagerDialogProps) {
  const categories = useCategoryStore((state) => state.categories);
  const addCategory = useCategoryStore((state) => state.addCategory);
  const updateCategory = useCategoryStore((state) => state.updateCategory);
  const deleteCategory = useCategoryStore((state) => state.deleteCategory);
  const resetToDefaults = useCategoryStore((state) => state.resetToDefaults);

  const transactions = useTransactionStore((state) => state.transactions);
  const setCategoryLimit = useBudgetStore((state) => state.setCategoryLimit);

  const [activeTab, setActiveTab] = React.useState<CategoryType>("expense");

  // Estado do formulário de criação/edição
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formType, setFormType] = React.useState<CategoryType>("expense");
  const [formColor, setFormColor] = React.useState("#6366f1");
  const [formLimit, setFormLimit] = React.useState("0");
  const [errorMsg, setErrorMsg] = React.useState("");

  // Confirmação de exclusão
  const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  // Conta quantas transações pertencem a cada categoria
  const getUsageCount = (catId: string) => {
    return transactions.filter((tx) => tx.category === catId).length;
  };

  const handleStartCreate = (type: CategoryType) => {
    setEditingId(null);
    setFormName("");
    setFormType(type);
    setFormColor(type === "expense" ? "#f43f5e" : "#10b981");
    setFormLimit(type === "expense" ? "500" : "0");
    setErrorMsg("");
    setIsEditing(true);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormColor(cat.color);
    setFormLimit(String(cat.defaultLimit ?? 0));
    setErrorMsg("");
    setIsEditing(true);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setErrorMsg("");
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg("O nome da categoria é obrigatório.");
      return;
    }

    const cleanLimit = parseFloat(formLimit.replace(",", ".")) || 0;

    if (editingId) {
      // Atualizar existente
      updateCategory(editingId, {
        name: formName.trim(),
        type: formType,
        color: formColor,
        defaultLimit: formType === "expense" ? cleanLimit : undefined,
      });

      // Se for despesa e o teto foi modificado, atualiza no orçamento também
      if (formType === "expense") {
        setCategoryLimit(editingId, cleanLimit);
      }
    } else {
      // Criar nova
      const created = addCategory({
        name: formName.trim(),
        type: formType,
        color: formColor,
        defaultLimit: formType === "expense" ? cleanLimit : undefined,
      });

      // Inicializa o teto no orçamento
      if (formType === "expense") {
        setCategoryLimit(created.id, cleanLimit);
      }
    }

    setIsEditing(false);
    setEditingId(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    deleteCategory(deletingCategory.id);
    setDeletingCategory(null);
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        "Tem certeza que deseja restaurar as categorias padrão? Categorias personalizadas serão removidas."
      )
    ) {
      resetToDefaults();
      setIsEditing(false);
      setEditingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Tags className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Configuração de Categorias Globais
              </DialogTitle>
              <DialogDescription className="text-xs">
                Gerencie nomes, cores e tetos mensais padrão aplicados em todo o sistema.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO */}
          {isEditing ? (
            <form
              onSubmit={handleSaveForm}
              className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3.5 animate-in fade-in-50"
            >
              <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                <span className="text-xs font-bold text-foreground">
                  {editingId ? "Editar Categoria" : "Nova Categoria"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCancelForm}
                  className="size-6 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              {errorMsg && (
                <div className="text-[11px] text-destructive bg-destructive/10 p-2 rounded-md font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* NOME DA CATEGORIA */}
                <div className="space-y-1">
                  <Label htmlFor="cat-name" className="text-xs font-medium">
                    Nome da Categoria
                  </Label>
                  <Input
                    id="cat-name"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Pet Shop, Academia..."
                    className="h-8 text-xs font-medium"
                    autoFocus
                  />
                </div>

                {/* TIPO DA CATEGORIA */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Tipo</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormType("expense")}
                      className={`flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium border transition-all ${
                        formType === "expense"
                          ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ArrowDownRight className="size-3.5" />
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType("income")}
                      className={`flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium border transition-all ${
                        formType === "income"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ArrowUpRight className="size-3.5" />
                      Receita
                    </button>
                  </div>
                </div>
              </div>

              {/* TETO MENSAL (SE FOR DESPESA) */}
              {formType === "expense" && (
                <div className="space-y-1">
                  <Label htmlFor="cat-limit" className="text-xs font-medium">
                    Teto Mensal Padrão (R$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                      R$
                    </span>
                    <Input
                      id="cat-limit"
                      type="text"
                      inputMode="decimal"
                      value={formLimit}
                      onChange={(e) =>
                        setFormLimit(e.target.value.replace(/[^0-9.,]/g, ""))
                      }
                      placeholder="500,00"
                      className="h-8 pl-8 text-xs font-semibold"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Será o valor limite sugerido na aba de Orçamento Mensal.
                  </span>
                </div>
              )}

              {/* PALETA DE CORES */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Cor de Identificação</Label>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-3.5 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: formColor }}
                    />
                    <Input
                      type="text"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="h-6 w-20 text-[10px] font-mono text-center p-0"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-8 gap-1.5 pt-1">
                  {PRESET_COLORS.map((c) => {
                    const isSelected = formColor.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormColor(c)}
                        className={`size-7 rounded-lg transition-transform flex items-center justify-center shadow-2xs hover:scale-105 ${
                          isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : ""
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      >
                        {isSelected && <Check className="size-3.5 text-white drop-shadow-sm" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/20">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelForm}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="text-xs gap-1.5">
                  <Check className="size-3.5" />
                  {editingId ? "Salvar Alterações" : "Criar Categoria"}
                </Button>
              </div>
            </form>
          ) : null}

          {/* CONFIRMAÇÃO DE EXCLUSÃO */}
          {deletingCategory && (
            <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 space-y-2 animate-in fade-in-50">
              <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Excluir Categoria &quot;{deletingCategory.name}&quot;?</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Esta categoria possui{" "}
                <strong>{getUsageCount(deletingCategory.id)}</strong> lançamento(s) vinculados.
                Ao excluir, essas transações permanecerão com o nome original como texto histórico.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setDeletingCategory(null)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={handleConfirmDelete}
                  className="text-xs gap-1.5"
                >
                  <Trash2 className="size-3" />
                  Confirmar Exclusão
                </Button>
              </div>
            </div>
          )}

          {/* ABAS DESPESAS / RECEITAS */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as CategoryType);
              if (isEditing) setIsEditing(false);
            }}
          >
            <div className="flex items-center justify-between gap-2 pb-2">
              <TabsList className="grid grid-cols-2 h-8 w-52">
                <TabsTrigger value="expense" className="text-xs">
                  Despesas ({expenseCategories.length})
                </TabsTrigger>
                <TabsTrigger value="income" className="text-xs">
                  Receitas ({incomeCategories.length})
                </TabsTrigger>
              </TabsList>

              {!isEditing && (
                <Button
                  type="button"
                  size="xs"
                  onClick={() => handleStartCreate(activeTab)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Nova Categoria
                </Button>
              )}
            </div>

            {/* LISTA DE DESPESAS */}
            <TabsContent value="expense" className="mt-2 space-y-2">
              {expenseCategories.map((cat) => {
                const count = getUsageCount(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card/60 hover:bg-card transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="size-4 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground block truncate">
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>
                            Teto padrão:{" "}
                            <strong className="text-foreground">
                              {formatCurrency(cat.defaultLimit ?? 0)}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>{count} lançamento(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleStartEdit(cat)}
                        title="Editar categoria"
                        className="size-7 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeletingCategory(cat)}
                        title="Excluir categoria"
                        className="size-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* LISTA DE RECEITAS */}
            <TabsContent value="income" className="mt-2 space-y-2">
              {incomeCategories.map((cat) => {
                const count = getUsageCount(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card/60 hover:bg-card transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="size-4 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground block truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {count} lançamento(s) registrados
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleStartEdit(cat)}
                        title="Editar categoria"
                        className="size-7 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeletingCategory(cat)}
                        title="Excluir categoria"
                        className="size-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/40 flex items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Restaurar Padrões
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
