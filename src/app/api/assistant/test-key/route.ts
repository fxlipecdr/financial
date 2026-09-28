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

    let targetModel = (model && typeof model === "string") ? model.trim() : "gemini-3.8-flash";
    if (targetModel.includes("2.0") || targetModel.includes("1.5") || targetModel.includes("2.5") || !targetModel.startsWith("gemini-3")) {
      targetModel = "gemini-3.8-flash";
    }

    const result = await GeminiAdvisorService.testConnection(
      apiKey.trim(),
      targetModel
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
