import { GoogleGenAI } from "@google/genai";
import { AssistantDiagnosticReport } from "../types/assistant.types";

export interface ChatContextPayload {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  diagnosticReport: AssistantDiagnosticReport;
  selectedMonthName: string;
  selectedYear: number;
}

export const GeminiAdvisorService = {
  /**
   * Constrói o prompt do sistema enriquecido com as métricas financeiras reais do usuário.
   */
  buildSystemInstruction(report: AssistantDiagnosticReport, monthName: string, year: number): string {
    const { healthScore, rule503020, costCuttingOpportunities, emergencyFund } = report;

    const cutsText = costCuttingOpportunities.length > 0
      ? costCuttingOpportunities
          .map(
            (c) =>
              `- Categoria "${c.categoryName}": Gasto atual R$ ${c.currentSpent.toFixed(
                2
              )} | Teto: R$ ${c.budgetLimit.toFixed(2)} | Corte sugerido: R$ ${c.suggestedCutAmount.toFixed(
                2
              )} (${c.actionTip})`
          )
          .join("\n")
      : "Nenhuma categoria crítica com estouro de orçamento no momento.";

    return `
Você é o Consultor Financeiro Pessoal Inteligente integrado ao aplicativo de controle financeiro do usuário.
Seu objetivo é orientar o usuário de forma prática, direta, empática e motivadora sobre:
1. Onde cortar gastos sem perder qualidade de vida básica.
2. O que fazer com o dinheiro que sobra (Reserva de emergência, quitação de parcelas futuras e investimentos seguros).
3. Avaliar compras planejadas e ajudar na tomada de decisões financeiras seguras.

DADOS FINANCEIROS REAIS DO USUÁRIO (${monthName} de ${year}):
- Score de Saúde Financeira: ${healthScore.score}/100 (${healthScore.rating}) - ${healthScore.summary}
- Receitas Totais: R$ ${rule503020.totalIncome.toFixed(2)}
- Despesas Totais: R$ ${rule503020.totalExpenses.toFixed(2)}
- Saldo Líquido do Mês: R$ ${(rule503020.totalIncome - rule503020.totalExpenses).toFixed(2)}
- Regra 50/30/20:
  * Necessidades Essenciais: R$ ${rule503020.needsAmount.toFixed(2)} (${rule503020.needsPercent}% da renda - meta até 50%)
  * Desejos e Lazer: R$ ${rule503020.wantsAmount.toFixed(2)} (${rule503020.wantsPercent}% da renda - meta até 30%)
  * Economia/Investimento: R$ ${rule503020.savingsAmount.toFixed(2)} (${rule503020.savingsPercent}% da renda - meta mín 20%)
  * Diagnóstico: ${rule503020.recommendation}
- Custo de Vida Mensal Básico Estimado: R$ ${emergencyFund.monthlyBurnRate.toFixed(2)}
- Meta de Reserva de Emergência (6 meses): R$ ${emergencyFund.target6Months.toFixed(2)}
- Oportunidades de Corte de Gastos Detectadas:
${cutsText}

DIRETRIZES DE RESPOSTA:
- Responda SEMPRE em Português do Brasil de forma clara, amigável e estruturada com tópicos.
- Use valores em Reais formatados (R$ X.XXX,XX).
- Cite números específicos dos dados acima para tornar o conselho pessoal e confiável.
- Se o usuário perguntar sobre compras ou parcelamentos, avalie o impacto no orçamento diário e recomende cautela ou segurança.
- Mantenha as respostas concisas, práticas e com passos acionáveis (passo 1, passo 2).
`;
  },

  /**
   * Gera a resposta do assistente utilizando o Gemini 3.8 / 2.5 Flash via @google/genai,
   * ou fallback contextualizado caso não haja chave de API configurada.
   */
  async generateAdvice(payload: ChatContextPayload): Promise<string> {
    const { message, history, diagnosticReport, selectedMonthName, selectedYear } = payload;
    const apiKey = process.env.GEMINI_API_KEY;

    // Se a chave de API estiver configurada no ambiente
    if (apiKey) {
      try {
        const client = new GoogleGenAI({ apiKey });
        const systemInstruction = this.buildSystemInstruction(
          diagnosticReport,
          selectedMonthName,
          selectedYear
        );

        // Prepara o histórico recente
        const contents = (history || []).slice(-6).map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        }));

        // Adiciona a pergunta atual do usuário
        contents.push({
          role: "user",
          parts: [{ text: message }],
        });

        const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

        const response = await client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        if (response && response.text) {
          return response.text.trim();
        }
      } catch (err) {
        console.warn("Falha ao consultar Gemini API, recorrendo ao motor analítico local:", err);
      }
    }

    // Fallback inteligente: motor analítico determinístico com respostas estruturadas
    return this.generateLocalFallback(message, diagnosticReport, selectedMonthName, selectedYear);
  },

  /**
   * Resposta gerada localmente pelo motor de regras quando não há chave de API ou em modo offline.
   */
  generateLocalFallback(
    query: string,
    report: AssistantDiagnosticReport,
    monthName: string,
    year: number
  ): string {
    const q = query.toLowerCase();
    const { healthScore, rule503020, costCuttingOpportunities, emergencyFund } = report;

    const formatBrl = (val: number) =>
      val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 1. Perguntas sobre onde cortar gastos
    if (q.includes("cortar") || q.includes("diminuir") || q.includes("reduzir") || q.includes("economia") || q.includes("economizar")) {
      if (costCuttingOpportunities.length === 0) {
        return `### 💡 Análise de Gastos para ${monthName} de ${year}

Parabéns! Seus gastos estão bem controlados e nenhuma categoria ultrapassou os tetos estipulados.

**Dicas para otimizar ainda mais:**
1. **Compras por impulso:** Adote a regra das 48 horas antes de compras não essenciais.
2. **Assinaturas recorrentes:** Revise streamings e serviços que você utiliza com pouca frequência.
3. **Alimentação:** Pequenos ajustes em pedidos de delivery podem liberar mais de **R$ 150 a R$ 300 por mês** para sua reserva.`;
      }

      const topCuts = costCuttingOpportunities.slice(0, 3);
      const totalSavings = topCuts.reduce((acc, c) => acc + c.suggestedCutAmount, 0);

      const items = topCuts
        .map(
          (c, idx) =>
            `${idx + 1}. **${c.categoryName}** (Gasto atual: R$ ${formatBrl(c.currentSpent)})\n   * ✂️ **Corte sugerido:** R$ ${formatBrl(c.suggestedCutAmount)}/mês (+R$ ${formatBrl(c.dailyImpactRecovery)}/dia)\n   * 🎯 *Ação recomendada:* ${c.actionTip}`
        )
        .join("\n\n");

      return `### ✂️ Onde Cortar Gastos em ${monthName} de ${year}

Identifiquei **${costCuttingOpportunities.length} oportunidades** no seu orçamento atual. Focando nestas frentes, você pode economizar até **R$ ${formatBrl(totalSavings)} por mês**:

${items}

> 📌 **Impacto no seu bolso:** Aplicando essas reduções, seu orçamento diário seguro aumentará cerca de **R$ ${formatBrl(totalSavings / 30)} por dia**!`;
    }

    // 2. Perguntas sobre o que fazer com o dinheiro / reserva / investimentos
    if (q.includes("dinheiro") || q.includes("investir") || q.includes("fazer com") || q.includes("reserva") || q.includes("poupar")) {
      const net = rule503020.totalIncome - rule503020.totalExpenses;
      const surplus = net > 0 ? net : 0;

      return `### 💰 O que Fazer com o Dinheiro em ${monthName} de ${year}

Com base na metodologia financeira recomendada para o seu perfil (Score: **${healthScore.score}/100**):

#### 1. Prioridade Máxima: Construção da Reserva de Emergência
* **Sua meta de reserva (6 meses):** R$ ${formatBrl(emergencyFund.target6Months)}
* **Onde aplicar:** Tesouro Selic ou CDB de liquidez diária (100% do CDI) em bancos consolidados. Nunca deixe parado na conta corrente.

#### 2. Distribuição Inteligente da Sobra Mensal (Regra 50/30/20)
${
  surplus > 0
    ? `Você gerou **R$ ${formatBrl(surplus)}** de margem positiva. Sugestão de divisão:`
    : "No momento seu fluxo está zerado ou sem sobra. Foque primeiro em reequilibrar receitas e despesas."
}
* **50% (R$ ${formatBrl(surplus * 0.5)}):** Direto para a Reserva de Emergência.
* **30% (R$ ${formatBrl(surplus * 0.3)}):** Fundo para amortizar faturas e parcelamentos futuros.
* **20% (R$ ${formatBrl(surplus * 0.2)}):** Metas de curto/médio prazo (viagem, estudos, compras à vista).

> 💡 *Dica de ouro:* Antes de investir em ações ou fundos arriscados, garanta que suas contas futuras do próximo mês estejam 100% provisionadas!`;
    }

    // 3. Resposta geral / diagnóstico amplo
    return `### 📊 Diagnóstico Financeiro de ${monthName} de ${year}

Olá! Aqui está o raio-x da sua saúde financeira neste momento:

* 🩺 **Score de Saúde:** **${healthScore.score}/100 (${healthScore.rating})**
* 💵 **Receitas:** R$ ${formatBrl(rule503020.totalIncome)} | **Despesas:** R$ ${formatBrl(rule503020.totalExpenses)}
* ⚖️ **Saldo Líquido:** R$ ${formatBrl(rule503020.totalIncome - rule503020.totalExpenses)}
* 🎯 **Regra 50/30/20:** Essenciais consomem ${rule503020.needsPercent}%, Estilo de vida ${rule503020.wantsPercent}% e Poupança ${rule503020.savingsPercent}%.

**Como posso te ajudar hoje?**
* Experimente perguntar: *"Onde posso cortar gastos agora?"*
* Ou: *"O que fazer com o dinheiro sobrando?"*
* Ou: *"Como organizar meu dinheiro para sobrar mais no final do mês?"*
* Ou utilize a aba **"Posso Comprar?"** para simular uma compra!`;
  },
};
