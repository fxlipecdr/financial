"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Sparkles,
  TrendingDown,
  PiggyBank,
  ShieldCheck,
  Send,
  Bot,
  User,
  ArrowRight,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useTransactionStore } from "@/features/transactions/stores/transaction.store";
import { useCategoryStore } from "@/features/categories/stores/category.store";
import { useBudgetStore } from "@/features/budget/stores/budget.store";
import { useDashboardStore, MONTH_NAMES } from "@/features/dashboard/stores/dashboard.store";
import { FinancialAdvisorService } from "../services/financial-advisor.service";
import { ChatMessage } from "../types/assistant.types";
import { PurchaseSimulatorCard } from "./purchase-simulator-card";
import { formatCurrency } from "@/features/dashboard/lib/financial-math";


export function AssistantView() {
  const selectedMonth = useTransactionStore((state) => state.selectedMonth);
  const selectedYear = useTransactionStore((state) => state.selectedYear);
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useCategoryStore((state) => state.categories);
  const categoryLimits = useBudgetStore((state) => state.categoryLimits);

  const monthName = MONTH_NAMES[selectedMonth]?.full || "Mês Atual";

  // Diagnóstico financeiro completo recalculado em tempo real
  const report = React.useMemo(() => {
    return FinancialAdvisorService.generateReport({
      transactions,
      selectedMonth,
      selectedYear,
      categories,
      categoryLimits,
    });
  }, [transactions, selectedMonth, selectedYear, categories, categoryLimits]);

  // Sub-abas do assistente
  const [activeSubTab, setActiveSubTab] = React.useState<"cortes" | "dinheiro" | "simulador" | "chat">("cortes");

  // Estado do Chat
  const [inputMessage, setInputMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "msg_welcome",
      role: "assistant",
      content: `Olá! Sou seu **Consultor Financeiro Pessoal Inteligente**.

Analisei seus lançamentos de **${monthName} de ${selectedYear}** e seu Score de Saúde Financeira está em **${report.healthScore.score}/100 (${report.healthScore.rating})**.

Como posso te ajudar hoje? Você pode clicar em uma das sugestões abaixo ou me fazer uma pergunta livre!`,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "Onde posso cortar gastos agora?",
        "O que fazer com o dinheiro sobrando?",
        "Como montar minha reserva de emergência?",
        "Minhas compras parceladas estão perigosas?",
      ],
    },
  ]);

  // Limpa chaves salvas anteriormente no localStorage para garantir o uso exclusivo da env do servidor
  React.useEffect(() => {
    try {
      localStorage.removeItem("financial_gemini_api_key");
      localStorage.removeItem("financial_gemini_model");
    } catch {
      // noop
    }
  }, []);

  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          diagnosticReport: report,
          selectedMonthName: monthName,
          selectedYear,
        }),
      });

      if (!res.ok) throw new Error("Erro na comunicação com o assistente");

      const data = await res.json();
      const assistantReply: ChatMessage = {
        id: `msg_ast_${Date.now()}`,
        role: "assistant",
        content: data.reply || "Não foi possível gerar uma resposta detalhada no momento.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantReply]);
    } catch {
      // Fallback local caso a rota dê erro
      const fallbackReply = FinancialAdvisorService.generateReport({
        transactions,
        selectedMonth,
        selectedYear,
        categories,
        categoryLimits,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_ast_${Date.now()}`,
          role: "assistant",
          content: `### 💡 Análise Rápida de ${monthName} de ${selectedYear}

Seu Score atual é **${fallbackReply.healthScore.score}/100**.

Para diminuir despesas com eficácia, foque nas categorias com maior volume de gastos. Acesse a aba **"Onde Cortar Gastos"** para ver o plano sugerido!`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      toast.info("Respondido via motor de regras financeiras.");
    } finally {
      setIsSending(false);
    }
  };

  // Cálculos rápidos para o topo
  const totalPotentialSavings = report.costCuttingOpportunities.reduce(
    (sum, c) => sum + c.suggestedCutAmount,
    0
  );

  return (
    <div className="space-y-6">
      {/* HEADER DA VISÃO DO ASSISTENTE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Assistente Financeiro Inteligente
            </h1>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs gap-1">
              <Sparkles className="size-3" />
              IA & Diagnóstico
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise comportamental, oportunidades de economia e consultoria em tempo real para {monthName} de {selectedYear}.
          </p>
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS COM SEGMENTED CONTROL */}
        <SegmentedControl
          value={activeSubTab}
          onChange={(val) => setActiveSubTab(val as any)}
          size="sm"
          className="self-start sm:self-auto shrink-0"
          options={[
            { value: "cortes", label: "Onde Cortar Gastos", icon: <Scissors className="size-3.5" /> },
            { value: "dinheiro", label: "O que Fazer com o Dinheiro", icon: <PiggyBank className="size-3.5" /> },
            { value: "simulador", label: "Posso Comprar?", icon: <Zap className="size-3.5" /> },
            { value: "chat", label: "Chat com IA", icon: <Bot className="size-3.5" /> },
          ]}
        />
      </div>

      {/* PAINEL DE METRICAS E SCORE PRINCIPAL */}
      <div className="grid gap-3 sm:grid-cols-4">
        {/* SCORE DE SAÚDE */}
        <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs sm:col-span-1 group hover:border-border transition-all duration-200">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Score de Saúde</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black font-mono" style={{ color: report.healthScore.color }}>
                  {report.healthScore.score}
                </span>
                <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold uppercase rounded-full px-2"
                  style={{
                    borderColor: `${report.healthScore.color}40`,
                    backgroundColor: `${report.healthScore.color}15`,
                    color: report.healthScore.color,
                  }}
                >
                  {report.healthScore.rating}
                </Badge>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-2 leading-relaxed">
              {report.healthScore.summary}
            </p>
          </CardContent>
        </Card>

        {/* ECONOMIA POTENCIAL */}
        <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs sm:col-span-1 group hover:border-border transition-all duration-200">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Economia Potencial</p>
              <p className="text-2xl font-bold font-mono text-primary mt-1">
                {formatCurrency(totalPotentialSavings)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
              +{formatCurrency(totalPotentialSavings / 30)}/dia seguro no seu orçamento se aplicar os cortes.
            </p>
          </CardContent>
        </Card>

        {/* REGRA 50/30/20 */}
        <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs sm:col-span-1 group hover:border-border transition-all duration-200">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Distribuição 50/30/20</p>
              <div className="flex items-center gap-2 mt-1 font-mono text-xs font-semibold">
                <span className="text-blue-500">{report.rule503020.needsPercent}% Fixos</span>
                <span>•</span>
                <span className="text-purple-500">{report.rule503020.wantsPercent}% Lazer</span>
                <span>•</span>
                <span className="text-emerald-500">{report.rule503020.savingsPercent}% Sobra</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-2 truncate">
              {report.rule503020.status === "balanced" ? "Distribuição exemplar" : "Despesas exigem atenção"}
            </p>
          </CardContent>
        </Card>

        {/* RESERVA DE EMERGÊNCIA */}
        <Card className="rounded-2xl border-border/70 bg-card/80 backdrop-blur-xs shadow-xs sm:col-span-1 group hover:border-border transition-all duration-200">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Meta de Reserva (6M)</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">
                {formatCurrency(report.emergencyFund.target6Months)}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
              Baseado em gastos essenciais de {formatCurrency(report.emergencyFund.monthlyBurnRate)}/mês.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CONTEÚDO DA SUB-ABA ATIVA */}
      {activeSubTab === "cortes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Onde Cortar Gastos com Inteligência</h2>
              <p className="text-xs text-muted-foreground">
                Oportunidades identificadas para estancar estouros e resgatar dinheiro para sua conta.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveSubTab("chat");
                handleSendMessage("Como posso cortar gastos sem prejudicar meu estilo de vida?");
              }}
              className="text-xs gap-1.5"
            >
              <Sparkles className="size-3 text-primary" />
              Pedir Plano Personalizado à IA
            </Button>
          </div>

          {report.costCuttingOpportunities.length === 0 ? (
            <Card className="border-border bg-card p-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto mb-3">
                <CheckCircle2 className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Nenhum excesso crítico detectado!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Seus gastos em {monthName} estão dentro dos tetos estipulados. Continue mantendo esse padrão saudável.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.costCuttingOpportunities.map((cut) => (
                <Card key={cut.id} className="border-border bg-card relative overflow-hidden flex flex-col justify-between">
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: cut.categoryColor }}
                  />
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold"
                        style={{
                          borderColor: `${cut.categoryColor}40`,
                          backgroundColor: `${cut.categoryColor}15`,
                          color: cut.categoryColor,
                        }}
                      >
                        {cut.categoryName}
                      </Badge>
                      {cut.priority === "high" ? (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                          Prioridade Alta
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">
                          Otimização
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm font-bold mt-2">{cut.title}</CardTitle>
                    <CardDescription className="text-xs">{cut.actionTip}</CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2 border-t border-border mt-2 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Gasto Atual:</span>
                      <strong className="font-mono">{formatCurrency(cut.currentSpent)}</strong>
                    </div>
                    {cut.budgetLimit > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Teto Orçado:</span>
                        <span className="font-mono text-muted-foreground">{formatCurrency(cut.budgetLimit)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs pt-1 border-t border-border">
                      <span className="font-semibold text-primary">Economia Mensal Sugerida:</span>
                      <strong className="font-mono text-primary">
                        - {formatCurrency(cut.suggestedCutAmount)}
                      </strong>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      Devolve +{formatCurrency(cut.dailyImpactRecovery)}/dia ao seu orçamento livre.
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "dinheiro" && (
        <div className="space-y-6">
          {/* REGRA 50/30/20 DETALHADA */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">Diagnóstico da Regra 50/30/20</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Distribuição recomendada: até 50% em Necessidades Básicas, até 30% em Estilo de Vida e no mínimo 20% em Poupança/Investimentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-blue-500">
                    Necessidades Essenciais ({report.rule503020.needsPercent}%)
                  </span>
                  <span className="font-mono font-semibold">{formatCurrency(report.rule503020.needsAmount)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, report.rule503020.needsPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Moradia, alimentação básica, saúde, transporte e despesas fixas da casa.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-purple-500">
                    Estilo de Vida & Lazer ({report.rule503020.wantsPercent}%)
                  </span>
                  <span className="font-mono font-semibold">{formatCurrency(report.rule503020.wantsAmount)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${Math.min(100, report.rule503020.wantsPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Restaurantes, passeios, compras por desejo, streamings e lazer.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-emerald-500">
                    Reserva & Quitações ({report.rule503020.savingsPercent}%)
                  </span>
                  <span className="font-mono font-semibold">{formatCurrency(report.rule503020.savingsAmount)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, report.rule503020.savingsPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Saldo líquido positivo reservado para construção de patrimônio ou amortizações.
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-3 text-xs text-foreground border border-border">
                <strong>Veredito do Consultor:</strong> {report.rule503020.recommendation}
              </div>
            </CardContent>
          </Card>

          {/* ONDE ALOCAR AS SOBRAS */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                <CardTitle className="text-base font-semibold">Destinação Inteligente do Saldo Livre</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Como distribuir qualquer valor que sobrar no seu mês para maximizar segurança e rendimento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {report.emergencyFund.surplusAllocationTips.map((tip, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-3.5 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{tip.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary border-primary/20">
                          {tip.percentage}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                    {tip.amount > 0 && (
                      <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Valor sugerido:</span>
                        <strong className="font-mono text-primary font-bold">{formatCurrency(tip.amount)}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === "simulador" && (
        <PurchaseSimulatorCard
          totalIncome={report.rule503020.totalIncome}
          totalExpenses={report.rule503020.totalExpenses}
          pendingExpenses={0}
          dailyBudget={Math.max(10, (report.rule503020.totalIncome - report.rule503020.totalExpenses) / 30)}
          daysRemainingInMonth={15}
        />
      )}

      {activeSubTab === "chat" && (
        <Card className="border-border bg-card flex flex-col h-[650px] shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Consultor Financeiro Pessoal</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Alimentado por IA com dados reais do seu fluxo de caixa e orçamento.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] text-emerald-500 border-emerald-500/20 bg-emerald-500/5 gap-1.5 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  IA Conectada
                </Badge>
              </div>
            </div>
          </CardHeader>

          {/* HISTÓRICO DE MENSAGENS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 mt-0.5 shadow-xs">
                      <Bot className="size-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-tr-xs"
                          : "bg-muted/60 text-foreground border border-border rounded-tl-xs"
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans markdown-content">
                        {msg.content}
                      </div>
                    </div>

                    <div className={`text-[10px] text-muted-foreground ${isUser ? "text-right" : "text-left"} px-1`}>
                      {msg.timestamp}
                    </div>

                    {/* SUGESTÕES RÁPIDAS ABAIXO DA RESPOSTA */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSendMessage(sug)}
                            className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/60 transition-all text-left"
                          >
                            💬 {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0 mt-0.5 border border-border">
                      <User className="size-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-3 justify-start items-center">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                  <Bot className="size-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground border border-border flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary animate-ping" />
                  <span>Analisando suas finanças e preparando conselho...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* INPUT DO CHAT */}
          <div className="p-3 border-t border-border bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Pergunte ao consultor: ex: 'Posso comprar um notebook de 3.000?'"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSending}
                className="text-xs h-9 bg-muted/30"
              />
              <Button type="submit" size="sm" disabled={isSending || !inputMessage.trim()} className="gap-1.5 h-9">
                <Send className="size-3.5" />
                <span className="hidden sm:inline">Enviar</span>
              </Button>
            </form>
          </div>
        </Card>
      )}

    </div>
  );
}
