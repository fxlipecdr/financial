import { NextRequest, NextResponse } from "next/server";
import { GeminiAdvisorService } from "@/features/assistant/services/gemini-advisor.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = (typeof body?.apiKey === "string" && body.apiKey.trim()) || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Nenhuma chave configurada na ENV do Vercel (GEMINI_API_KEY)." },
        { status: 400 }
      );
    }

    let targetModel = (typeof body?.model === "string" && body.model.trim()) ? body.model.trim() : (process.env.GEMINI_MODEL || "gemini-3.8-flash");
    if (
      targetModel.includes("2.0") ||
      targetModel.includes("1.5") ||
      targetModel.includes("2.5") ||
      targetModel.includes("3.5-flash-lite") ||
      !targetModel.startsWith("gemini-")
    ) {
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
