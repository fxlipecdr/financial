import { NextRequest, NextResponse } from "next/server";
import { GeminiAdvisorService, ChatContextPayload } from "@/features/assistant/services/gemini-advisor.service";

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as ChatContextPayload;

    if (!payload.message || !payload.diagnosticReport) {
      return NextResponse.json(
        { error: "Mensagem e relatório de diagnóstico são obrigatórios." },
        { status: 400 }
      );
    }

    if (!payload.model || payload.model.includes("2.0") || payload.model.includes("1.5") || payload.model.includes("2.5") || !payload.model.startsWith("gemini-3")) {
      payload.model = "gemini-3.8-flash";
    }

    const result = await GeminiAdvisorService.generateAdvice(payload);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro na API do assistente:", error);
    return NextResponse.json(
      {
        error: "Falha interna ao processar consulta do assistente.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
