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
import { useBudgetStore, DEFAULT_CATEGORY_LIMITS } from "../stores/budget.store";
import { EXPENSE_CATEGORIES } from "@/features/transactions/schemas/transaction.schemas";
import {
  Home,
  UtensilsCrossed,
  Car,
  HeartPulse,
  Gamepad2,
  GraduationCap,
  ShoppingBag,
  RotateCcw,
  Check,
} from "lucide-react";

interface EditBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCategoryId?: string | null;
}

export function getCategoryIcon(categoryId: string) {
  switch (categoryId) {
    case "moradia":
      return Home;
    case "alimentacao":
      return UtensilsCrossed;
    case "transporte":
      return Car;
    case "saude":
      return HeartPulse;
    case "lazer":
    case "lazer_outros":
      return Gamepad2;
    case "educacao":
      return GraduationCap;
    default:
      return ShoppingBag;
  }
}

import { useCategoryStore } from "@/features/categories/stores/category.store";

export function EditBudgetDialog({
  open,
  onOpenChange,
  targetCategoryId,
}: EditBudgetDialogProps) {
  const allCategories = useCategoryStore((state) => state.categories);
  const expenseCategories = React.useMemo(
    () => allCategories.filter((c) => c.type === "expense"),
    [allCategories]
  );
  const categoryLimits = useBudgetStore((state) => state.categoryLimits);
  const setCategoryLimit = useBudgetStore((state) => state.setCategoryLimit);
  const setMultipleLimits = useBudgetStore((state) => state.setMultipleLimits);
  const resetToDefaults = useBudgetStore((state) => state.resetToDefaults);

  // Estado local para os inputs
  const [formLimits, setFormLimits] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      expenseCategories.forEach((cat) => {
        initial[cat.id] = String(
          categoryLimits[cat.id] ?? cat.defaultLimit ?? DEFAULT_CATEGORY_LIMITS[cat.id] ?? 0
        );
      });
      setFormLimits(initial);
    }
  }, [open, categoryLimits, expenseCategories]);

  const handleChange = (catId: string, val: string) => {
    // Permite apenas dígitos e vírgula/ponto
    const sanitized = val.replace(/[^0-9.,]/g, "");
    setFormLimits((prev) => ({ ...prev, [catId]: sanitized }));
  };

  const handleSave = () => {
    if (targetCategoryId) {
      const raw = formLimits[targetCategoryId]?.replace(",", ".") || "0";
      const num = parseFloat(raw);
      if (!isNaN(num) && num >= 0) {
        setCategoryLimit(targetCategoryId, num);
      }
    } else {
      const updated: Record<string, number> = {};
      expenseCategories.forEach((cat) => {
        const raw = formLimits[cat.id]?.replace(",", ".") || "0";
        const num = parseFloat(raw);
        updated[cat.id] = isNaN(num) || num < 0 ? 0 : num;
      });
      setMultipleLimits(updated);
    }
    onOpenChange(false);
  };

  const handleReset = () => {
    if (targetCategoryId) {
      const cat = expenseCategories.find((c) => c.id === targetCategoryId);
      const def = cat?.defaultLimit ?? DEFAULT_CATEGORY_LIMITS[targetCategoryId] ?? 0;
      setFormLimits((prev) => ({ ...prev, [targetCategoryId]: String(def) }));
      setCategoryLimit(targetCategoryId, def);
    } else {
      resetToDefaults();
      const initial: Record<string, string> = {};
      expenseCategories.forEach((cat) => {
        initial[cat.id] = String(cat.defaultLimit ?? DEFAULT_CATEGORY_LIMITS[cat.id] ?? 0);
      });
      setFormLimits(initial);
    }
    onOpenChange(false);
  };

  const categoriesToShow = targetCategoryId
    ? expenseCategories.filter((c) => c.id === targetCategoryId)
    : expenseCategories;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {targetCategoryId ? "Ajustar Teto de Gasto" : "Estipular Tetos Orçamentários"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {targetCategoryId
              ? "Defina o valor máximo mensal desejado para esta categoria."
              : "Defina o teto máximo mensal que você planeja gastar em cada categoria."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {categoriesToShow.map((cat) => {
            const Icon = getCategoryIcon(cat.id);
            const val = formLimits[cat.id] ?? "";

            return (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card/60"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <Label
                      htmlFor={`budget-${cat.id}`}
                      className="text-xs font-semibold text-foreground block truncate cursor-pointer"
                    >
                      {cat.name}
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Teto Sugerido: R${" "}
                      {(DEFAULT_CATEGORY_LIMITS[cat.id] || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 w-36">
                  <span className="text-xs font-medium text-muted-foreground">R$</span>
                  <Input
                    id={`budget-${cat.id}`}
                    type="text"
                    inputMode="decimal"
                    value={val}
                    onChange={(e) => handleChange(cat.id, e.target.value)}
                    className="h-8 text-right text-xs font-semibold"
                    placeholder="0,00"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Redefinir Padrões
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs gap-1.5"
            >
              <Check className="size-3.5" />
              Salvar Tetos
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
