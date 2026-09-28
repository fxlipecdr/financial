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

    // Força o uso estrito da chave configurada nas variáveis de ambiente do Vercel
    payload.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    payload.model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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
