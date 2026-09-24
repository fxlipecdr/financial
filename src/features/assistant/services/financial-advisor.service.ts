import { Transaction } from "@/features/transactions/types/transaction.types";
import { Category } from "@/features/categories/types/category.types";
import {
  AssistantDiagnosticReport,
  CostCuttingAdvice,
  EmergencyFundStatus,
  FinancialHealthScore,
  HealthFactor,
  PurchaseSimulationInput,
  PurchaseSimulationResult,
  Rule503020Breakdown,
} from "../types/assistant.types";

const ESSENTIAL_CATEGORIES = new Set([
  "moradia",
  "alimentacao",
  "transporte",
  "saude",
  "educacao",
]);

export const FinancialAdvisorService = {
  /**
   * Gera o diagnóstico completo de saúde financeira, oportunidades de corte e destinação de recursos.
   */
  generateReport(params: {
    transactions: Transaction[];
    selectedMonth: number;
    selectedYear: number;
    categories: Category[];
    categoryLimits: Record<string, number>;
  }): AssistantDiagnosticReport {
    const { transactions, selectedMonth, selectedYear, categories, categoryLimits } = params;

    const monthNum = selectedMonth + 1;
    const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const ymPrefix = `${selectedYear}-${monthStr}`;

    const monthTxs = transactions.filter((tx) => tx.date.startsWith(ymPrefix));

    const totalIncome = monthTxs
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpenses = monthTxs
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingExpenses = monthTxs
      .filter((tx) => tx.type === "expense" && tx.status === "pending")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const netBalance = totalIncome - totalExpenses;

    // Gastos agrupados por categoria
    const categorySpentMap: Record<string, number> = {};
    monthTxs
      .filter((tx) => tx.type === "expense")
      .forEach((tx) => {
        categorySpentMap[tx.category] = (categorySpentMap[tx.category] || 0) + tx.amount;
      });

    // 1. Diagnóstico 50/30/20
    const rule503020 = this.calculate503020(totalIncome, totalExpenses, categorySpentMap);

    // 2. Oportunidades de Corte de Gastos
    const costCuttingOpportunities = this.generateCostCuttingOpportunities(
      categories,
      categoryLimits,
      categorySpentMap,
      totalIncome
    );

    // 3. Reserva de Emergência e Alocação de Recursos
    const emergencyFund = this.calculateEmergencyFund(
      categorySpentMap,
      netBalance,
      pendingExpenses
    );

    // 4. Score de Saúde Financeira
    const healthScore = this.calculateHealthScore({
      totalIncome,
      totalExpenses,
      netBalance,
      pendingExpenses,
      rule503020,
      costCuttingOpportunities,
    });

    // 5. Insights Rápidos
    const quickInsights = this.generateQuickInsights({
      totalIncome,
      totalExpenses,
      netBalance,
      pendingExpenses,
      healthScore,
      costCuttingOpportunities,
    });

    return {
      healthScore,
      rule503020,
      costCuttingOpportunities,
      emergencyFund,
      quickInsights,
    };
  },

  /**
   * Cálculo da Regra 50/30/20 (Necessidades vs Desejos vs Poupança)
   */
  calculate503020(
    totalIncome: number,
    totalExpenses: number,
    categorySpentMap: Record<string, number>
  ): Rule503020Breakdown {
    let needsAmount = 0;
    let wantsAmount = 0;

    Object.entries(categorySpentMap).forEach(([catId, amount]) => {
      if (ESSENTIAL_CATEGORIES.has(catId)) {
        needsAmount += amount;
      } else {
        wantsAmount += amount;
      }
    });

    const base = totalIncome > 0 ? totalIncome : Math.max(totalExpenses, 1);
    const needsPercent = Math.round((needsAmount / base) * 100);
    const wantsPercent = Math.round((wantsAmount / base) * 100);

    const savingsAmount = Math.max(0, totalIncome - totalExpenses);
    const savingsPercent = totalIncome > 0 ? Math.round((savingsAmount / totalIncome) * 100) : 0;

    let status: Rule503020Breakdown["status"] = "balanced";
    let recommendation = "Sua distribuição de orçamento está alinhada às boas práticas financeiras.";

    if (totalIncome > 0 && totalExpenses > totalIncome) {
      status = "deficit";
      recommendation = "Atenção: seus gastos superam sua receita este mês. É urgente reduzir gastos com desejos e lazer para estancar o saldo negativo.";
    } else if (wantsPercent > 35) {
      status = "wants_heavy";
      recommendation = `Seus gastos com Estilo de Vida e Lazer representam ${wantsPercent}% da renda (o recomendado é até 30%). Cortar compras por impulso devolverá fôlego ao seu mês.`;
    } else if (needsPercent > 60) {
      status = "needs_heavy";
      recommendation = `Seus custos fixos essenciais consomem ${needsPercent}% dos seus ganhos (o ideal é até 50%). Busque renegociar contratos de moradia, contas básicas e planos de internet/celular.`;
    }

    return {
      totalIncome,
      totalExpenses,
      needsAmount,
      needsPercent,
      wantsAmount,
      wantsPercent,
      savingsAmount,
      savingsPercent,
      status,
      recommendation,
    };
  },

  /**
   * Identifica oportunidades práticas de corte de gastos.
   */
  generateCostCuttingOpportunities(
    categories: Category[],
    categoryLimits: Record<string, number>,
    categorySpentMap: Record<string, number>,
    totalIncome: number
  ): CostCuttingAdvice[] {
    const list: CostCuttingAdvice[] = [];

    categories
      .filter((c) => c.type === "expense")
      .forEach((cat) => {
        const spent = categorySpentMap[cat.id] || 0;
        const limit = categoryLimits[cat.id] || cat.defaultLimit || 0;
        const isEssential = ESSENTIAL_CATEGORIES.has(cat.id);

        // 1. Categoria que estourou o teto orçado
        if (limit > 0 && spent > limit) {
          const overspent = spent - limit;
          list.push({
            id: `cut_over_${cat.id}`,
            categoryId: cat.id,
            categoryName: cat.name,
            categoryColor: cat.color,
            type: "over_budget",
            currentSpent: spent,
            budgetLimit: limit,
            overspentAmount: overspent,
            suggestedCutAmount: overspent,
            dailyImpactRecovery: Math.round((overspent / 30) * 100) / 100,
            title: `Excesso de ${cat.name}`,
            actionTip: `Você ultrapassou o teto estipulado em R$ ${overspent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Congele novas compras nesta categoria até o próximo mês.`,
            priority: "high",
          });
        }
        // 2. Gastos de lazer ou supérfluos que pesam sem teto definido ou consumo alto
        else if (!isEssential && spent > 200) {
          const suggestedCut = Math.round(spent * 0.25); // Redução saudável de 25%
          list.push({
            id: `cut_discretionary_${cat.id}`,
            categoryId: cat.id,
            categoryName: cat.name,
            categoryColor: cat.color,
            type: "discretionary_leak",
            currentSpent: spent,
            budgetLimit: limit,
            overspentAmount: 0,
            suggestedCutAmount: suggestedCut,
            dailyImpactRecovery: Math.round((suggestedCut / 30) * 100) / 100,
            title: `Otimização em ${cat.name}`,
            actionTip: `Reduzir 25% nesta categoria liberaria R$ ${suggestedCut.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} no seu saldo (R$ ${(suggestedCut / 30).toFixed(2)} a mais por dia). Experimente alternativas mais econômicas para lazer e compras.`,
            priority: "medium",
          });
        }
        // 3. Alimentação ou Transporte muito altos comparados à renda
        else if (isEssential && totalIncome > 0 && spent / totalIncome > 0.35) {
          const suggestedCut = Math.round(spent * 0.15); // 15% de otimização
          list.push({
            id: `cut_heavy_${cat.id}`,
            categoryId: cat.id,
            categoryName: cat.name,
            categoryColor: cat.color,
            type: "high_proportion",
            currentSpent: spent,
            budgetLimit: limit,
            overspentAmount: 0,
            suggestedCutAmount: suggestedCut,
            dailyImpactRecovery: Math.round((suggestedCut / 30) * 100) / 100,
            title: `Custo Elevado de ${cat.name}`,
            actionTip: `Esta categoria consome mais de 35% dos seus ganhos. Fazer lista de compras no mercado e planejar refeições semanais pode economizar até 15% (R$ ${suggestedCut.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`,
            priority: "medium",
          });
        }
      });

    // Ordena por maior economia potencial
    return list.sort((a, b) => b.suggestedCutAmount - a.suggestedCutAmount);
  },

  /**
   * Cálculo da Reserva de Emergência e destinação de sobras
   */
  calculateEmergencyFund(
    categorySpentMap: Record<string, number>,
    netBalance: number,
    pendingExpenses: number
  ): EmergencyFundStatus {
    let monthlyBurnRate = 0;
    Object.entries(categorySpentMap).forEach(([catId, amount]) => {
      if (ESSENTIAL_CATEGORIES.has(catId)) {
        monthlyBurnRate += amount;
      }
    });

    if (monthlyBurnRate === 0) {
      monthlyBurnRate = 2500; // Valor de referência para custo básico caso ainda não haja dados
    }

    const target3Months = monthlyBurnRate * 3;
    const target6Months = monthlyBurnRate * 6;
    const currentFreeCash = Math.max(0, netBalance - pendingExpenses);
    const currentFundingPercent = Math.min(
      100,
      Math.round((currentFreeCash / target6Months) * 100)
    );

    // Sugestão de divisão de qualquer saldo livre que sobrar no mês
    const surplus = currentFreeCash > 0 ? currentFreeCash : 0;
    const surplusAllocationTips = [
      {
        title: "Reserva de Emergência (Liquidez Diária)",
        description: "Aplique em CDB 100% CDI com liquidez imediata ou Tesouro Selic para criar seu colchão de segurança.",
        percentage: 50,
        amount: Math.round(surplus * 0.5),
      },
      {
        title: "Antecipação e Quitação de Parcelamentos",
        description: "Alivie o orçamento dos próximos meses liquidando faturas futuras ou compras parceladas.",
        percentage: 30,
        amount: Math.round(surplus * 0.3),
      },
      {
        title: "Objetivos e Liberdade Financeira",
        description: "Separe para compras planejadas sem dívidas ou investimentos de médio prazo (LCI/LCA ou Tesouro IPCA+).",
        percentage: 20,
        amount: Math.round(surplus * 0.2),
      },
    ];

    return {
      monthlyBurnRate,
      target3Months,
      target6Months,
      currentFreeCash,
      currentFundingPercent,
      surplusAllocationTips,
    };
  },

  /**
   * Avalia a pontuação geral de saúde financeira (0 a 100).
   */
  calculateHealthScore(params: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    pendingExpenses: number;
    rule503020: Rule503020Breakdown;
    costCuttingOpportunities: CostCuttingAdvice[];
  }): FinancialHealthScore {
    const { totalIncome, totalExpenses, netBalance, pendingExpenses, rule503020, costCuttingOpportunities } = params;

    const factors: HealthFactor[] = [];

    // Fator 1: Equilíbrio de Fluxo (Receita vs Despesa)
    let flowScore = 70;
    if (totalIncome > 0) {
      if (netBalance >= totalIncome * 0.2) {
        flowScore = 100;
      } else if (netBalance > 0) {
        flowScore = 80;
      } else if (netBalance === 0) {
        flowScore = 60;
      } else {
        flowScore = 25;
      }
    } else if (totalExpenses > 0) {
      flowScore = 30;
    }
    factors.push({
      id: "factor_flow",
      name: "Fluxo Mensal",
      score: flowScore,
      status: flowScore >= 80 ? "good" : flowScore >= 50 ? "warning" : "bad",
      description:
        flowScore >= 80
          ? "Você retém uma margem saudável de sobra financeira."
          : flowScore >= 50
          ? "Orçamento operando próximo do limite da receita."
          : "Despesas superiores aos ganhos; risco iminente de endividamento.",
    });

    // Fator 2: Aderência aos Tetos de Orçamento
    const overBudgetCount = costCuttingOpportunities.filter((c) => c.type === "over_budget").length;
    let budgetScore = 100 - overBudgetCount * 25;
    budgetScore = Math.max(20, Math.min(100, budgetScore));
    factors.push({
      id: "factor_budget",
      name: "Controle de Tetos",
      score: budgetScore,
      status: budgetScore >= 80 ? "good" : budgetScore >= 60 ? "warning" : "bad",
      description:
        overBudgetCount === 0
          ? "Nenhuma categoria ultrapassou o teto estipulado."
          : `${overBudgetCount} categoria(s) estouraram o teto no mês.`,
    });

    // Fator 3: Comprometimento de Contas Futuras
    let futureScore = 85;
    if (totalIncome > 0 && pendingExpenses > 0) {
      const pendingRatio = pendingExpenses / totalIncome;
      if (pendingRatio > 0.5) futureScore = 35;
      else if (pendingRatio > 0.3) futureScore = 60;
      else futureScore = 95;
    }
    factors.push({
      id: "factor_future",
      name: "Contas Futuras & Faturas",
      score: futureScore,
      status: futureScore >= 80 ? "good" : futureScore >= 60 ? "warning" : "bad",
      description:
        futureScore >= 80
          ? "Suas contas a vencer estão bem dimensionadas."
          : "Faturas futuras ou parcelas consomem grande parcela da sua renda esperada.",
    });

    // Fator 4: Estrutura 50/30/20
    let structureScore = 80;
    if (rule503020.status === "deficit") structureScore = 20;
    else if (rule503020.status === "wants_heavy") structureScore = 55;
    else if (rule503020.status === "needs_heavy") structureScore = 65;
    else structureScore = 95;
    factors.push({
      id: "factor_structure",
      name: "Distribuição 50/30/20",
      score: structureScore,
      status: structureScore >= 80 ? "good" : structureScore >= 50 ? "warning" : "bad",
      description: rule503020.recommendation,
    });

    // Média ponderada
    const totalScore = Math.round(
      flowScore * 0.35 + budgetScore * 0.25 + futureScore * 0.2 + structureScore * 0.2
    );

    let rating: FinancialHealthScore["rating"] = "Boa";
    let color = "#10b981";
    let summary = "Suas finanças estão equilibradas e sob controle.";

    if (totalScore >= 85) {
      rating = "Excelente";
      color = "#10b981";
      summary = "Parabéns! Você mantém uma gestão orçamentária exemplar com margem segura para investimentos.";
    } else if (totalScore >= 70) {
      rating = "Boa";
      color = "#06b6d4";
      summary = "Situação positiva com boas oportunidades de corte para acelerar seus objetivos financeiros.";
    } else if (totalScore >= 50) {
      rating = "Atenção";
      color = "#f59e0b";
      summary = "Cuidado com gastos supérfluos e contas a vencer para não comprometer o próximo mês.";
    } else {
      rating = "Crítica";
      color = "#ef4444";
      summary = "Alerta financeiro: corte imediatamente compras não essenciais para equilibrar seu fluxo de caixa.";
    }

    return {
      score: totalScore,
      rating,
      color,
      summary,
      factors,
    };
  },

  /**
   * Simulador "Posso Comprar?"
   */
  simulatePurchase(params: {
    input: PurchaseSimulationInput;
    totalIncome: number;
    totalExpenses: number;
    pendingExpenses: number;
    dailyBudget: number;
    daysRemainingInMonth: number;
  }): PurchaseSimulationResult {
    const { input, totalIncome, totalExpenses, pendingExpenses, dailyBudget, daysRemainingInMonth } = params;

    const installmentCount = input.isInstallment && input.installmentsCount > 1 ? input.installmentsCount : 1;
    const monthlyImpact = input.amount / installmentCount;
    const safeDays = Math.max(1, daysRemainingInMonth);
    const dailyImpact = monthlyImpact / safeDays;

    const currentFree = totalIncome - totalExpenses - pendingExpenses;
    const freeBalanceAfterPurchase = currentFree - monthlyImpact;

    const formatBrl = (val: number) =>
      val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let verdict: PurchaseSimulationResult["verdict"] = "safe";
    let verdictLabel = "Compra Segura";
    let badgeVariant: PurchaseSimulationResult["badgeVariant"] = "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
    let headline = `Você pode realizar essa compra de R$ ${formatBrl(input.amount)} sem comprometer suas contas essenciais.`;
    let explanation = `O impacto mensal é de R$ ${formatBrl(monthlyImpact)} (reduzindo R$ ${formatBrl(dailyImpact)} do seu gasto diário seguro).`;
    let recommendation = "Recomendação: Se possível, tente negociar desconto para pagamento à vista ou encaixe nas despesas de estilo de vida sem usar o limite de emergência.";

    if (freeBalanceAfterPurchase < 0) {
      verdict = "risky";
      verdictLabel = "Compra Arriscada";
      badgeVariant = "border-rose-500/30 bg-rose-500/10 text-rose-600";
      headline = "Essa compra deixará seu fluxo de caixa no vermelho ou comprometerá contas já agendadas.";
      explanation = `Seu saldo livre ficaria negativo em R$ ${formatBrl(Math.abs(freeBalanceAfterPurchase))}.`;
      recommendation = "Recomendação: Adie esta compra até liquidar as parcelas pendentes ou corte gastos em outras categorias antes de assumir esta nova despesa.";
    } else if (monthlyImpact > dailyBudget * safeDays * 0.5 || freeBalanceAfterPurchase < totalIncome * 0.1) {
      verdict = "caution";
      verdictLabel = "Comprar com Cautela";
      badgeVariant = "border-amber-500/30 bg-amber-500/10 text-amber-600";
      headline = "A compra cabe no bolso, mas reduzirá significativamente sua margem de segurança diária.";
      explanation = `Seu orçamento diário disponível cairá de R$ ${formatBrl(dailyBudget)} para R$ ${formatBrl(Math.max(0, dailyBudget - dailyImpact))}/dia até o fim do mês.`;
      recommendation = "Recomendação: Se for uma necessidade, vá em frente mantendo rédeas curtas em lazer e delivery. Se for um desejo impulsivo, aguarde 7 dias antes de decidir.";
    }

    return {
      verdict,
      verdictLabel,
      badgeVariant,
      headline,
      monthlyImpact,
      dailyImpact,
      freeBalanceAfterPurchase,
      explanation,
      recommendation,
    };
  },

  /**
   * Gera frases sintéticas e práticas para exibição rápida.
   */
  generateQuickInsights(params: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    pendingExpenses: number;
    healthScore: FinancialHealthScore;
    costCuttingOpportunities: CostCuttingAdvice[];
  }): string[] {
    const { totalIncome, netBalance, pendingExpenses, costCuttingOpportunities } = params;
    const insights: string[] = [];

    if (costCuttingOpportunities.length > 0) {
      const top = costCuttingOpportunities[0];
      insights.push(`💡 Oportunidade prioritária: Cortar ${top.categoryName} pode economizar R$ ${top.suggestedCutAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês.`);
    }

    if (netBalance > 0) {
      insights.push(`💰 Você tem R$ ${netBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de saldo positivo gerado no mês. Direcione 50% para reserva de liquidez.`);
    }

    if (pendingExpenses > 0) {
      insights.push(`📅 Você possui R$ ${pendingExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em contas futuras e faturas a vencer antes da virada do mês.`);
    } else {
      insights.push("✅ Todas as contas do mês atual já estão quitadas e sem pendências!");
    }

    if (totalIncome === 0) {
      insights.push("ℹ️ Dica: Registre suas receitas (salário, freelance) para habilitar o cálculo da taxa de poupança e da regra 50/30/20.");
    }

    return insights;
  },
};
