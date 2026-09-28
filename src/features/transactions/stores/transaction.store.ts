import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Decimal from "decimal.js";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  CategoryExpenseSummary,
  MonthlyTransactionSummary,
} from "../types/transaction.types";
import { getCategoryById } from "../schemas/transaction.schemas";
import { SupabaseSyncService } from "@/features/sync/services/supabase-sync.service";

export interface AddInstallmentInput {
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  status: TransactionStatus;
  installmentsCount: number;
  amountMode: "per_installment" | "total";
}

/**
 * Adiciona N meses a uma data (AAAA-MM-DD), ajustando para o último dia do mês quando necessário
 * (ex: 31/01 + 1 mês -> 28/02).
 */
export function addMonthsClamped(dateStr: string, monthsToAdd: number): string {
  const parts = dateStr.split("-");
  const origYear = parseInt(parts[0], 10);
  const origMonth = parseInt(parts[1], 10) - 1; // 0-based
  const origDay = parseInt(parts[2], 10);

  const totalMonths = origMonth + monthsToAdd;
  const targetYear = origYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const finalDay = Math.min(origDay, daysInTargetMonth);

  const mm = String(targetMonth + 1).padStart(2, "0");
  const dd = String(finalDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

interface TransactionState {
  transactions: Transaction[];
  selectedMonth: number; // 0 = Jan ... 8 = Set ... 11 = Dez
  selectedYear: number;
  addTransaction: (data: Omit<Transaction, "id" | "createdAt">) => void;
  addInstallmentTransactions: (data: AddInstallmentInput) => Transaction[];
  removeTransaction: (id: string) => void;
  removeInstallmentGroup: (groupId: string, fromIndex?: number) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => void;
  updateInstallmentGroup: (groupId: string, updates: { description?: string; category?: string }) => void;
  clearAllTransactions: () => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  toggleTransactionStatus: (id: string) => void;
  getTransactionsForSelectedMonth: () => Transaction[];
  getCategoryExpensesForSelectedMonth: () => CategoryExpenseSummary[];
  getMonthlySummary: () => MonthlyTransactionSummary;
}

const SEED_TRANSACTIONS: Transaction[] = [
  // Setembro / 2026 (Mês Atual)
  {
    id: "tx_sep_1",
    description: "Salário Mensal",
    amount: 8500,
    type: "income",
    category: "salario",
    date: "2026-09-05",
    status: "paid",
    createdAt: "2026-09-05T08:00:00Z",
  },
  {
    id: "tx_sep_2",
    description: "Consultoria Freelance",
    amount: 700,
    type: "income",
    category: "freelance",
    date: "2026-09-12",
    status: "paid",
    createdAt: "2026-09-12T10:00:00Z",
  },
  {
    id: "tx_sep_3",
    description: "Aluguel e Condomínio",
    amount: 2400,
    type: "expense",
    category: "moradia",
    date: "2026-09-06",
    status: "paid",
    createdAt: "2026-09-06T09:00:00Z",
  },
  {
    id: "tx_sep_4",
    description: "Supermercado Mensal",
    amount: 1350,
    type: "expense",
    category: "alimentacao",
    date: "2026-09-08",
    status: "paid",
    createdAt: "2026-09-08T15:30:00Z",
  },
  {
    id: "tx_sep_5",
    description: "Combustível e Estacionamento",
    amount: 580,
    type: "expense",
    category: "transporte",
    date: "2026-09-10",
    status: "paid",
    createdAt: "2026-09-10T11:00:00Z",
  },
  {
    id: "tx_sep_6",
    description: "Assinaturas de Streaming",
    amount: 170,
    type: "expense",
    category: "lazer_outros",
    date: "2026-09-15",
    status: "paid",
    createdAt: "2026-09-15T18:00:00Z",
  },
  // Contas Futuras / A vencer em Setembro
  {
    id: "tx_sep_7",
    description: "Plano de Saúde e Farmácia",
    amount: 600,
    type: "expense",
    category: "saude",
    date: "2026-09-22",
    status: "pending",
    createdAt: "2026-09-11T14:00:00Z",
  },
  {
    id: "tx_sep_8",
    description: "Fatura Cartão & Restaurantes",
    amount: 450,
    type: "expense",
    category: "alimentacao",
    date: "2026-09-25",
    status: "pending",
    createdAt: "2026-09-13T20:00:00Z",
  },
  {
    id: "tx_sep_9",
    description: "Energia Elétrica & Internet",
    amount: 150,
    type: "expense",
    category: "moradia",
    date: "2026-09-28",
    status: "pending",
    createdAt: "2026-09-15T09:00:00Z",
  },
];

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      selectedMonth: 8, // Setembro
      selectedYear: 2026,

      addTransaction: (data) => {
        const todayStr = new Date().toISOString().split("T")[0];
        const status = data.status || (data.date > todayStr ? "pending" : "paid");

        const newTx: Transaction = {
          ...data,
          status,
          id: `tx_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          transactions: [newTx, ...state.transactions],
        }));

        // Sincronização automática em segundo plano com Supabase
        SupabaseSyncService.upsertTransaction(newTx).catch(console.error);
      },

      addInstallmentTransactions: (data) => {
        const {
          description,
          amount,
          type,
          category,
          date,
          status,
          installmentsCount,
          amountMode,
        } = data;

        const installmentGroupId = `grp_${Date.now()}`;
        const todayStr = new Date().toISOString().split("T")[0];

        let baseAmountDec = new Decimal(0);
        let lastAmountDec = new Decimal(0);

        if (amountMode === "total") {
          const totalDec = new Decimal(amount);
          const countDec = new Decimal(installmentsCount);
          baseAmountDec = totalDec.dividedBy(countDec).toDecimalPlaces(2, Decimal.ROUND_DOWN);
          const accumulatedDec = baseAmountDec.times(installmentsCount - 1);
          lastAmountDec = totalDec.minus(accumulatedDec);
        } else {
          baseAmountDec = new Decimal(amount).toDecimalPlaces(2);
          lastAmountDec = baseAmountDec;
        }

        const newTransactions: Transaction[] = [];

        for (let i = 0; i < installmentsCount; i++) {
          const installmentIndex = i + 1;
          const installmentDate = addMonthsClamped(date, i);
          const installmentAmount =
            amountMode === "total" && i === installmentsCount - 1
              ? lastAmountDec.toNumber()
              : baseAmountDec.toNumber();

          let installmentStatus: TransactionStatus = "pending";
          if (i === 0) {
            installmentStatus = status || (installmentDate > todayStr ? "pending" : "paid");
          } else {
            installmentStatus = "pending";
          }

          const tx: Transaction = {
            id: `tx_${Date.now()}_${i}`,
            description: `${description} (${installmentIndex}/${installmentsCount})`,
            amount: installmentAmount,
            type,
            category,
            date: installmentDate,
            status: installmentStatus,
            installmentIndex,
            totalInstallments: installmentsCount,
            installmentGroupId,
            createdAt: new Date().toISOString(),
          };

          newTransactions.push(tx);
        }

        set((state) => ({
          transactions: [...newTransactions, ...state.transactions],
        }));

        // Sincronização automática em segundo plano com Supabase
        SupabaseSyncService.upsertTransactions(newTransactions).catch(console.error);

        return newTransactions;
      },

      removeTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));

        // Sincronização automática em segundo plano com Supabase
        SupabaseSyncService.deleteTransaction(id).catch(console.error);
      },

      removeInstallmentGroup: (groupId, fromIndex) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => {
            if (tx.installmentGroupId !== groupId) return true;
            if (fromIndex !== undefined) {
              return (tx.installmentIndex || 0) < fromIndex;
            }
            return false;
          }),
        }));

        // Sincronização automática em segundo plano com Supabase
        SupabaseSyncService.deleteInstallmentGroup(groupId, fromIndex).catch(console.error);
      },

      updateTransaction: (id, updates) => {
        let updatedTx: Transaction | undefined;

        set((state) => ({
          transactions: state.transactions.map((tx) => {
            if (tx.id !== id) return tx;
            updatedTx = { ...tx, ...updates };
            return updatedTx;
          }),
        }));

        if (updatedTx) {
          SupabaseSyncService.upsertTransaction(updatedTx).catch(console.error);
        }
      },

      updateInstallmentGroup: (groupId, updates) => {
        const updatedTxs: Transaction[] = [];

        set((state) => ({
          transactions: state.transactions.map((tx) => {
            if (tx.installmentGroupId !== groupId) return tx;

            let newDescription = tx.description;
            if (updates.description) {
              if (tx.installmentIndex && tx.totalInstallments) {
                const cleanDesc = updates.description.replace(/\s*\(\d+\/\d+\)$/, "");
                newDescription = `${cleanDesc} (${tx.installmentIndex}/${tx.totalInstallments})`;
              } else {
                newDescription = updates.description;
              }
            }

            const mod: Transaction = {
              ...tx,
              ...(updates.category ? { category: updates.category } : {}),
              description: newDescription,
            };
            updatedTxs.push(mod);
            return mod;
          }),
        }));

        if (updatedTxs.length > 0) {
          SupabaseSyncService.upsertTransactions(updatedTxs).catch(console.error);
        }
      },

      clearAllTransactions: () => {
        set({ transactions: [] });
      },

      toggleTransactionStatus: (id: string) => {
        let updatedTx: Transaction | undefined;

        set((state) => ({
          transactions: state.transactions.map((tx) => {
            if (tx.id !== id) return tx;
            const newStatus = tx.status === "pending" ? "paid" : "pending";
            updatedTx = { ...tx, status: newStatus };
            return updatedTx;
          }),
        }));

        if (updatedTx) {
          SupabaseSyncService.upsertTransaction(updatedTx).catch(console.error);
        }
      },

      setSelectedMonth: (month) => {
        set({ selectedMonth: month });
      },

      setSelectedYear: (year) => {
        set({ selectedYear: year });
      },

      getTransactionsForSelectedMonth: () => {
        const { transactions, selectedMonth, selectedYear } = get();

        return transactions
          .filter((tx) => {
            const parts = tx.date.split("-");
            const txYear = parseInt(parts[0], 10);
            const txMonth = parseInt(parts[1], 10) - 1; // 0-indexed
            return txYear === selectedYear && txMonth === selectedMonth;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      getCategoryExpensesForSelectedMonth: () => {
        const monthTransactions = get().getTransactionsForSelectedMonth();
        const expenses = monthTransactions.filter((tx) => tx.type === "expense");

        if (expenses.length === 0) {
          return [];
        }

        // Agrupa e soma com decimal.js
        const categoryMap = new Map<string, Decimal>();
        let totalExpensesDec = new Decimal(0);

        for (const tx of expenses) {
          const currentAmount = new Decimal(tx.amount);
          totalExpensesDec = totalExpensesDec.plus(currentAmount);

          const catTotal = categoryMap.get(tx.category) || new Decimal(0);
          categoryMap.set(tx.category, catTotal.plus(currentAmount));
        }

        const summaries: CategoryExpenseSummary[] = [];

        categoryMap.forEach((amountDec, catId) => {
          const catInfo = getCategoryById(catId);
          const total = amountDec.toNumber();
          const percentage = totalExpensesDec.isZero()
            ? 0
            : amountDec
                .dividedBy(totalExpensesDec)
                .times(100)
                .toDecimalPlaces(1)
                .toNumber();

          summaries.push({
            category: catId,
            name: catInfo.name,
            total,
            percentage,
            color: catInfo.color,
          });
        });

        // Ordena pela categoria com maior gasto
        return summaries.sort((a, b) => b.total - a.total);
      },

      getMonthlySummary: () => {
        const monthTransactions = get().getTransactionsForSelectedMonth();

        let incomeDec = new Decimal(0);
        let expensesDec = new Decimal(0);
        let paidExpensesDec = new Decimal(0);
        let pendingExpensesDec = new Decimal(0);
        let pendingCount = 0;

        for (const tx of monthTransactions) {
          const amount = new Decimal(tx.amount);
          if (tx.type === "income") {
            incomeDec = incomeDec.plus(amount);
          } else {
            expensesDec = expensesDec.plus(amount);
            if (tx.status === "pending") {
              pendingExpensesDec = pendingExpensesDec.plus(amount);
              pendingCount++;
            } else {
              paidExpensesDec = paidExpensesDec.plus(amount);
            }
          }
        }

        return {
          totalIncome: incomeDec.toNumber(),
          totalExpenses: expensesDec.toNumber(),
          balance: incomeDec.minus(expensesDec).toNumber(),
          paidExpenses: paidExpensesDec.toNumber(),
          pendingExpenses: pendingExpensesDec.toNumber(),
          pendingCount,
        };
      },
    }),
    {
      name: "financial_transactions_store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
