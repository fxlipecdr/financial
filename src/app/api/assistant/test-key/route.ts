import { NextRequest, NextResponse } from "next/server";
import { GeminiAdvisorService } from "@/features/assistant/services/gemini-advisor.service";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, model } = await req.json();

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { success: false, message: "Chave de API do Gemini não foi fornecida." },
        { status: 400 }
      );
    }

    const result = await GeminiAdvisorService.testConnection(
      apiKey.trim(),
      model || "gemini-2.0-flash"
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
