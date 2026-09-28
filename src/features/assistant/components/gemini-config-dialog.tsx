"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Key,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Trash2,
  Bot,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const LOCAL_STORAGE_GEMINI_KEY = "financial_gemini_api_key";
export const LOCAL_STORAGE_GEMINI_MODEL = "financial_gemini_model";
export const DEFAULT_GEMINI_MODEL = "gemini-3.7-flash";

export const AVAILABLE_GEMINI_MODELS = [
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash (Mais Recomendado - Alta Disponibilidade e Sem Filas)" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (Frontier Model - Mais Recente)" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (Versão Estável Rápida)" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Versão Consolidada)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (Econômico e Rápido)" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (Leve - Sujeito a filas 503)" },
];

interface GeminiConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigChanged?: (status: { hasKey: boolean; model: string }) => void;
}

export function GeminiConfigDialog({
  open,
  onOpenChange,
  onConfigChanged,
}: GeminiConfigDialogProps) {
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState(DEFAULT_GEMINI_MODEL);
  const [showKey, setShowKey] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Carregar dados salvos ao abrir (migrando modelos legados se necessário)
  React.useEffect(() => {
    if (open) {
      const savedKey = localStorage.getItem(LOCAL_STORAGE_GEMINI_KEY) || "";
      let savedModel = localStorage.getItem(LOCAL_STORAGE_GEMINI_MODEL) || DEFAULT_GEMINI_MODEL;
      
      // Migração automática de modelos antigos ou com instabilidade crônica de fila 503
      if (
        savedModel.includes("2.0") ||
        savedModel.includes("1.5") ||
        savedModel.includes("3.5-flash-lite") ||
        !savedModel.startsWith("gemini-")
      ) {
        savedModel = DEFAULT_GEMINI_MODEL;
        localStorage.setItem(LOCAL_STORAGE_GEMINI_MODEL, DEFAULT_GEMINI_MODEL);
      }

      setApiKey(savedKey);
      setModel(savedModel);
      setTestResult(null);
    }
  }, [open]);

  // Testar a conexão
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error("Insira uma chave de API antes de testar.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/assistant/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), model }),
      });

      const data = await res.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `Conexão bem-sucedida! O modelo ${data.model} respondeu perfeitamente.`,
        });
        toast.success("Conexão com Gemini validada com sucesso!");
      } else {
        setTestResult({
          success: false,
          message: data.message || "A API recusou a requisição com essa chave.",
        });
        toast.error("Falha ao conectar com o Gemini.");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Erro de rede ao tentar conectar.",
      });
      toast.error("Erro ao testar conexão.");
    } finally {
      setIsTesting(false);
    }
  };

  // Salvar no localStorage
  const handleSave = () => {
    const cleanKey = apiKey.trim();
    if (cleanKey) {
      localStorage.setItem(LOCAL_STORAGE_GEMINI_KEY, cleanKey);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEY);
    }
    localStorage.setItem(LOCAL_STORAGE_GEMINI_MODEL, model);

    toast.success("Configurações do Gemini salvas!", {
      description: cleanKey
        ? `Usando o modelo ${model} para o consultor financeiro.`
        : "Chave removida. O assistente usará o motor analítico local.",
    });

    onConfigChanged?.({
      hasKey: Boolean(cleanKey),
      model,
    });

    onOpenChange(false);
  };

  // Limpar a chave
  const handleClear = () => {
    localStorage.removeItem(LOCAL_STORAGE_GEMINI_KEY);
    setApiKey("");
    setTestResult(null);
    toast.info("Chave de API do Gemini removida.");
    onConfigChanged?.({
      hasKey: false,
      model,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Configuração da IA (Google Gemini)</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Conecte sua chave gratuita do Google AI Studio para desbloquear respostas inteligentes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status Atual */}
          <div className="p-3 rounded-lg border border-border bg-muted/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              <span>Status do Consultor:</span>
            </div>
            {apiKey ? (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                ● Chave Configurada
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5">
                ● Modo Local (Sem Chave)
              </Badge>
            )}
          </div>

          {/* Seleção do Modelo */}
          <div className="space-y-1.5">
            <Label htmlFor="gemini-model" className="text-xs font-medium">
              Modelo do Gemini
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="gemini-model" className="text-xs">
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_GEMINI_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Recomendamos o <strong>Gemini 3.7 Flash</strong> pela velocidade, alta capacidade e ausência de filas (503) na API gratuita.
            </p>
          </div>

          {/* Chave de API */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="gemini-api-key" className="text-xs font-medium">
                Chave da API (API Key)
              </Label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                Obter chave grátis no Google AI Studio
                <ExternalLink className="size-2.5" />
              </a>
            </div>
            <div className="relative">
              <Input
                id="gemini-api-key"
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-xs pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sua chave é armazenada de forma segura apenas no seu navegador ou lida do seu servidor Vercel.
            </p>
          </div>

          {/* Resultado do Teste */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-rose-500 mt-0.5" />
              )}
              <div className="flex-1 text-[11px] leading-relaxed">
                {testResult.message}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {apiKey ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 h-8"
            >
              <Trash2 className="size-3.5" />
              Remover Chave
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTesting || !apiKey.trim()}
              onClick={handleTestConnection}
              className="text-xs gap-1.5 h-8"
            >
              {isTesting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Key className="size-3.5" />
              )}
              Testar Conexão
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs gap-1.5 h-8"
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
