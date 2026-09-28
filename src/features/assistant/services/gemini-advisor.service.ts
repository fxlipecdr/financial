import { GoogleGenAI } from "@google/genai";
import { AssistantDiagnosticReport } from "../types/assistant.types";

export interface ChatContextPayload {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  diagnosticReport: AssistantDiagnosticReport;
  selectedMonthName: string;
  selectedYear: number;
  apiKey?: string;
  model?: string;
}

export interface ChatResponseResult {
  reply: string;
  provider: "gemini" | "fallback";
  modelUsed?: string;
  errorDetail?: string;
}

function extractCleanErrorMessage(err: any): string {
  if (err?.error?.message) {
    return String(err.error.message);
  }
  if (err?.body) {
    try {
      const parsed = typeof err.body === "string" ? JSON.parse(err.body) : err.body;
      const target = Array.isArray(parsed) ? parsed[0] : parsed;
      if (target?.error?.message) return String(target.error.message);
    } catch {}
  }
  const raw = String(err?.message || err || "");
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    }
  } catch {}
  return raw;
}

export const GeminiAdvisorService = {
  /**
   * Constrói o histórico formatado para a API do Google Gemini.
   * IMPORTANTE: A API Gemini EXIGE que:
   * 1. A conversa inicie com uma mensagem de role 'user'.
   * 2. As mensagens alternem estritamente entre 'user' e 'model'.
   */
  buildGeminiContents(
    history: { role: "user" | "assistant"; content: string }[] | undefined,
    currentMessage: string
  ): Array<{ role: "user" | "model"; parts: [{ text: string }] }> {
    const contents: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];

    // Filtra mensagens vazias
    const validHistory = (history || []).filter(
      (h) => h.content && h.content.trim().length > 0
    );

    // Encontra a primeira mensagem real do usuário (descarta boas-vindas do assistente no topo)
    const firstUserIndex = validHistory.findIndex((h) => h.role === "user");
    const usableHistory = firstUserIndex >= 0 ? validHistory.slice(firstUserIndex) : [];

    for (const item of usableHistory) {
      const role = item.role === "assistant" ? "model" : "user";
      // Se houver duas mensagens seguidas do mesmo role, mescla para garantir alternância
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += "\n\n" + item.content;
      } else {
        contents.push({
          role,
          parts: [{ text: item.content }],
        });
      }
    }

    // Adiciona a pergunta atual do usuário no final
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += "\n\n" + currentMessage;
    } else {
      contents.push({
        role: "user",
        parts: [{ text: currentMessage }],
      });
    }

    return contents;
  },

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
- Responda SEMPRE em Português do Brasil de forma clara, amigável e estruturada com tópicos e markdown.
- Use valores em Reais formatados (R$ X.XXX,XX).
- Cite números específicos dos dados acima para tornar o conselho pessoal e confiável.
- Se o usuário perguntar sobre compras ou parcelamentos, avalie o impacto no orçamento diário e recomende cautela ou segurança.
- Mantenha as respostas concisas, práticas e com passos acionáveis (passo 1, passo 2).
`;
  },

  /**
   * Testa a conectividade com a API do Google Gemini usando uma chave fornecida.
   */
  async testConnection(
    apiKey: string,
    model: string = "gemini-3.8-flash"
  ): Promise<{ success: boolean; model: string; message: string }> {
    try {
      const client = new GoogleGenAI({ apiKey, vertexai: false });
      let targetModel = model || "gemini-3.8-flash";
      if (
        targetModel.includes("2.0") ||
        targetModel.includes("1.5") ||
        targetModel.includes("2.5") ||
        targetModel.includes("3.5-flash-lite") ||
        !targetModel.startsWith("gemini-")
      ) {
        targetModel = "gemini-3.8-flash";
      }

      // 1. Tenta listar modelos para autenticar a chave e obter os modelos ativos na conta
      let availableModels: string[] = [];
      try {
        const pager = await client.models.list({ config: { pageSize: 50 } });
        if (pager && pager.page) {
          availableModels = pager.page
            .map((m) => (m.name || "").replace(/^models\//, ""))
            .filter((name) =>
              name.length > 0 &&
              name.startsWith("gemini-") &&
              !name.includes("embedding") &&
              !name.includes("imagen") &&
              !name.includes("veo") &&
              !name.includes("audio") &&
              !name.includes("tts") &&
              !name.includes("transcribe") &&
              !name.includes("2.0") &&
              !name.includes("1.5") &&
              !name.includes("2.5")
            );
        }
      } catch (listErr: any) {
        const cleanMsg = extractCleanErrorMessage(listErr);
        console.warn("[GeminiAdvisor.testConnection] Falha ao listar modelos:", cleanMsg);

        if (cleanMsg.includes("API_KEY_INVALID") || cleanMsg.includes("API key not valid")) {
          return {
            success: false,
            model: targetModel,
            message: "Chave de API inválida. Verifique se copiou a chave correta no Google AI Studio (aistudio.google.com).",
          };
        }

        if (cleanMsg.includes("PERMISSION_DENIED") || cleanMsg.includes("403")) {
          return {
            success: false,
            model: targetModel,
            message: `Acesso negado (403): ${cleanMsg}. Verifique as permissões da chave ou restrições de IP/projeto.`,
          };
        }
      }

      // 2. Lista de modelos candidatos priorizando os mais estáveis da linha Gemini 3 (Free Tier)
      const candidateModels = Array.from(
        new Set([
          targetModel,
          "gemini-3.8-flash",
          "gemini-3.7-flash",
          "gemini-3.6-flash",
          "gemini-3.5-flash",
          "gemini-3.1-flash-lite",
          "gemini-3-flash-preview",
          ...availableModels,
        ])
      ).filter(
        (m) =>
          m &&
          !m.includes("2.0") &&
          !m.includes("1.5") &&
          !m.includes("2.5") &&
          m.startsWith("gemini-")
      );

      let lastError: any = null;

      for (const m of candidateModels) {
        // Tenta primeiro via Interactions API (recomendado pelo Google)
        try {
          const interaction = await client.interactions.create({
            model: m,
            input: "Responda apenas com a palavra: 'Conexão OK'",
          });
          if (interaction && interaction.output_text) {
            return {
              success: true,
              model: m,
              message: `Conexão bem-sucedida! O modelo ${m} respondeu perfeitamente via Interactions API.`,
            };
          }
        } catch (intErr: any) {
          const cleanMsg = extractCleanErrorMessage(intErr);
          if (cleanMsg.includes("API_KEY_INVALID") || cleanMsg.includes("API key not valid")) {
            return {
              success: false,
              model: m,
              message: "Chave de API inválida. Verifique sua chave no Google AI Studio.",
            };
          }
        }

        // Fallback para generateContent
        try {
          const res = await client.models.generateContent({
            model: m,
            contents: "Responda apenas com a palavra: 'Conexão OK'",
          });
          if (res && res.text) {
            return {
              success: true,
              model: m,
              message: `Conexão bem-sucedida! O modelo ${m} respondeu perfeitamente.`,
            };
          }
        } catch (e: any) {
          lastError = e;
          const cleanMsg = extractCleanErrorMessage(e);
          console.warn(`[GeminiAdvisor.testConnection] Falha com modelo ${m}:`, cleanMsg);

          if (cleanMsg.includes("API_KEY_INVALID") || cleanMsg.includes("API key not valid")) {
            return {
              success: false,
              model: m,
              message: "Chave de API inválida. Verifique sua chave no Google AI Studio.",
            };
          }

          continue;
        }
      }

      const finalErrorMsg = extractCleanErrorMessage(lastError);
      return {
        success: false,
        model: targetModel,
        message: finalErrorMsg
          ? `O Google retornou o seguinte erro: ${finalErrorMsg}`
          : "Nenhum modelo do Gemini respondeu com a chave fornecida. Verifique se a chave do Google AI Studio está correta e ativa.",
      };
    } catch (err: any) {
      return {
        success: false,
        model,
        message: extractCleanErrorMessage(err),
      };
    }
  },

  /**
   * Gera a resposta do assistente utilizando o Gemini via @google/genai,
   * ou fallback contextualizado caso não haja chave de API configurada.
   */
  async generateAdvice(payload: ChatContextPayload): Promise<ChatResponseResult> {
    const { message, history, diagnosticReport, selectedMonthName, selectedYear } = payload;

    // Prioriza estritamente as variáveis de ambiente do servidor Vercel (GEMINI_API_KEY ou GOOGLE_API_KEY)
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      (payload.apiKey && payload.apiKey.trim()) ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    let requestedModel =
      process.env.GEMINI_MODEL ||
      (payload.model && payload.model.trim()) ||
      "gemini-3.8-flash";

    // Substituição automática de modelos legados ou descontinuados
    if (
      requestedModel.includes("2.0") ||
      requestedModel.includes("1.5") ||
      requestedModel.includes("2.5") ||
      requestedModel.includes("3.5-flash-lite") ||
      !requestedModel.startsWith("gemini-")
    ) {
      requestedModel = "gemini-3.8-flash";
    }

    // Se a chave de API estiver configurada
    if (apiKey) {
      try {
        const client = new GoogleGenAI({ apiKey, vertexai: false });

        // 1. Tenta listar modelos autorizados na conta para failover com máxima precisão
        let liveModels: string[] = [];
        try {
          const pager = await client.models.list({ config: { pageSize: 50 } });
          if (pager && pager.page) {
            liveModels = pager.page
              .map((m) => (m.name || "").replace(/^models\//, ""))
              .filter((name) =>
                name.length > 0 &&
                name.startsWith("gemini-") &&
                !name.includes("embedding") &&
                !name.includes("imagen") &&
                !name.includes("veo") &&
                !name.includes("audio") &&
                !name.includes("tts") &&
                !name.includes("transcribe") &&
                !name.includes("2.0") &&
                !name.includes("1.5") &&
                !name.includes("2.5")
              );
          }
        } catch (e) {
          console.warn("[GeminiAdvisor] Falha ao consultar models.list:", e);
        }

        // 2. Cascata oficial de modelos Gemini 3 Free Tier com prioridade nos mais rápidos e sem fila
        const candidateModels = Array.from(
          new Set([
            requestedModel,
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview",
            ...liveModels,
            "gemini-3.5-flash-lite",
          ])
        ).filter(
          (m) =>
            m &&
            !m.includes("2.0") &&
            !m.includes("1.5") &&
            !m.includes("2.5") &&
            m.startsWith("gemini-")
        );

        const systemInstruction = this.buildSystemInstruction(
          diagnosticReport,
          selectedMonthName,
          selectedYear
        );

        const contents = this.buildGeminiContents(history, message);

        // Prepara histórico em formato de texto para a Interactions API
        const inputPrompt = history && history.length > 0
          ? `${history.map((h) => `${h.role === "user" ? "Usuário" : "Assistente"}: ${h.content}`).join("\n\n")}\n\nUsuário: ${message}`
          : message;

        let lastError: any = null;

        for (const model of candidateModels) {
          // 1. Tenta primeiro via Interactions API (recomendado oficialmente pelo Google para a linha Gemini 3)
          try {
            const interaction = await client.interactions.create({
              model,
              input: inputPrompt,
              system_instruction: systemInstruction,
            });

            if (interaction && interaction.output_text) {
              return {
                reply: interaction.output_text.trim(),
                provider: "gemini",
                modelUsed: `${model} (Interactions API)`,
              };
            }
          } catch (interactionErr: any) {
            lastError = interactionErr;
            const intMsg = extractCleanErrorMessage(interactionErr);
            console.warn(`[GeminiAdvisor] Interactions API falhou com modelo ${model}:`, intMsg);

            if (intMsg.includes("API_KEY_INVALID") || intMsg.includes("API key not valid") || intMsg.includes("401") || intMsg.includes("403")) {
              return {
                reply: `⚠️ **Chave de API Inválida:** O Google recusou a autenticação da chave (${intMsg}). Verifique se copiou a chave correta no Google AI Studio.`,
                provider: "fallback",
                errorDetail: intMsg,
              };
            }
          }

          // 2. Tenta via models.generateContent (fallback de compatibilidade)
          try {
            const response = await client.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction,
              },
            });

            if (response && response.text) {
              return {
                reply: response.text.trim(),
                provider: "gemini",
                modelUsed: model,
              };
            }
          } catch (err: any) {
            lastError = err;
            const cleanMsg = extractCleanErrorMessage(err);
            console.warn(`[GeminiAdvisor] generateContent falhou com modelo "${model}":`, cleanMsg);

            // Se for erro de chave inválida ou permissão negada, interrompe tentativas
            if (
              cleanMsg.includes("API_KEY_INVALID") ||
              cleanMsg.includes("API key not valid") ||
              cleanMsg.includes("401") ||
              cleanMsg.includes("403")
            ) {
              return {
                reply: `⚠️ **Chave de API Inválida:** O Google recusou a autenticação da chave (${cleanMsg}). Verifique se copiou a chave correta no Google AI Studio.`,
                provider: "fallback",
                errorDetail: cleanMsg,
              };
            }

            // Se for pico de demanda (503 UNAVAILABLE) ou rate limit (429), aguarda brevemente e tenta o próximo modelo
            if (cleanMsg.includes("503") || cleanMsg.includes("UNAVAILABLE") || cleanMsg.includes("429")) {
              console.info(`[GeminiAdvisor] Modelo ${model} congestionado. Alternando automaticamente para o próximo modelo de contingência...`);
              await new Promise((r) => setTimeout(r, 400));
              continue;
            }

            continue;
          }
        }

        console.warn("[GeminiAdvisor] Todas as tentativas do Gemini falharam. Último erro:", lastError);
        const errorDetail = extractCleanErrorMessage(lastError) || "Erro de comunicação com a API do Gemini.";

        return {
          reply: `⚠️ **Aviso:** Não foi possível obter resposta do Google Gemini (${errorDetail}).\n\nExibindo resposta calculada pelo motor local:\n\n` +
            this.generateLocalFallback(message, diagnosticReport, selectedMonthName, selectedYear),
          provider: "fallback",
          errorDetail,
        };
      } catch (err: any) {
        console.warn("Falha geral ao inicializar cliente Gemini:", err);
      }
    }

    // Fallback inteligente: motor analítico determinístico com respostas estruturadas
    return {
      reply: this.generateLocalFallback(message, diagnosticReport, selectedMonthName, selectedYear),
      provider: "fallback",
      errorDetail: "Nenhuma chave GEMINI_API_KEY configurada.",
    };
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
