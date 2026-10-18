import { useState, useEffect } from "react";
import { KeyRound, Sparkles, ExternalLink, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AI_STORAGE_KEY = "gate_cse_ai_key";
export const AI_STORAGE_PROVIDER = "gate_cse_ai_provider";

export function useAiConfig() {
  const [apiKey, setApiKey] = useState<string>("");
  const [provider, setProvider] = useState<string>("auto");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem(AI_STORAGE_KEY) || "";
      const savedProv = localStorage.getItem(AI_STORAGE_PROVIDER) || "auto";
      setApiKey(savedKey);
      setProvider(savedProv);
    }
  }, []);

  const saveConfig = (newKey: string, newProvider: string) => {
    setApiKey(newKey);
    setProvider(newProvider);
    if (typeof window !== "undefined") {
      if (newKey) {
        localStorage.setItem(AI_STORAGE_KEY, newKey);
      } else {
        localStorage.removeItem(AI_STORAGE_KEY);
      }
      localStorage.setItem(AI_STORAGE_PROVIDER, newProvider);
    }
  };

  return {
    apiKey,
    provider,
    saveConfig,
    hasCustomKey: Boolean(apiKey.trim()),
  };
}

export function AiConfigButton() {
  const { apiKey, provider, saveConfig, hasCustomKey } = useAiConfig();
  const [open, setOpen] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey);
  const [selectedProvider, setSelectedProvider] = useState(provider);
  const [showKey, setShowKey] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
    setSelectedProvider(provider);
  }, [apiKey, provider, open]);

  const handleSave = () => {
    saveConfig(inputKey.trim(), selectedProvider);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      setOpen(false);
    }, 600);
  };

  const handleClear = () => {
    setInputKey("");
    saveConfig("", "auto");
    setSelectedProvider("auto");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <KeyRound className="size-3.5 text-primary" />
          <span>{hasCustomKey ? "AI API Key: Configured" : "AI API Settings"}</span>
          {hasCustomKey && <span className="size-2 rounded-full bg-green-500" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> AI Provider & Key Settings
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure your AI model and API key. Your key is saved locally in your browser and used for PDF extraction and AI question formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">AI Provider</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect from Key (Recommended)</SelectItem>
                <SelectItem value="gemini">Google Gemini (Recommended - Fast & Free)</SelectItem>
                <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">API Key</Label>
              {inputKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear Key
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Leave blank to use server environment variables"
                className="pr-10 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              If left blank, the app will use <code className="rounded bg-muted px-1">GEMINI_API_KEY</code> or{" "}
              <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> configured in your Vercel deployment.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3 text-xs space-y-2">
            <p className="font-semibold text-foreground">Need a free API key?</p>
            <div className="flex flex-col gap-1.5">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                Get Google Gemini API Key (Free) <ExternalLink className="size-3" />
              </a>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                Get OpenAI API Key <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            {savedToast ? (
              <>
                <Check className="size-3.5" /> Saved!
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
