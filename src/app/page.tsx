"use client";

import * as React from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { SupabaseSyncService } from "@/features/sync/services/supabase-sync.service";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { useBudgetStore } from "@/features/budget/stores/budget.store";

export default function HomePage() {
  const [mounted, setMounted] = React.useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);

  React.useEffect(() => {
    setMounted(true);
    SupabaseSyncService.fetchUserData().then((cloudData) => {
      if (cloudData) {
        if (cloudData.transactions.length > 0) {
          useTransactionStore.setState({ transactions: cloudData.transactions });
        }
        if (cloudData.categories.length > 0) {
          useCategoryStore.setState({ categories: cloudData.categories });
        }
        if (Object.keys(cloudData.categoryLimits).length > 0) {
          useBudgetStore.setState({ categoryLimits: cloudData.categoryLimits });
        }
      }
    }).catch(console.error);
  }, []);

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent" />
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 sm:p-8">
        <AuthCard />
      </main>
    );
  }

  return <DashboardView />;
}
