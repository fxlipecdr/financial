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

    const reply = await GeminiAdvisorService.generateAdvice(payload);

    return NextResponse.json({ reply });
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
