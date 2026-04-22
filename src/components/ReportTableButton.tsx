import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

type Reason = "inappropriate" | "hate_speech" | "spam_scam" | "harassment" | "other";

const REASONS: { value: Reason; label: string; hint: string }[] = [
  { value: "inappropriate", label: "Conteúdo impróprio / Nudez", hint: "Imagens ou textos sexuais, violentos ou impróprios." },
  { value: "hate_speech", label: "Discurso de ódio", hint: "Racismo, homofobia, xenofobia ou intolerância." },
  { value: "spam_scam", label: "Spam / Golpe", hint: "Propaganda, link suspeito, tentativa de fraude." },
  { value: "harassment", label: "Assédio", hint: "Ameaças, intimidação ou comportamento abusivo." },
  { value: "other", label: "Outros", hint: "Descreva o problema no campo abaixo." },
];

const schema = z.object({
  reason: z.enum(["inappropriate", "hate_speech", "spam_scam", "harassment", "other"]),
  description: z.string().trim().max(1000, "Máximo de 1000 caracteres.").optional(),
});

interface ReportTableButtonProps {
  tableId: string;
  tableTitle: string;
  /** "icon" = pequeno ícone redondo (para cards). "menu-item" = item com texto. */
  variant?: "icon" | "menu-item";
  className?: string;
}

export function ReportTableButton({ tableId, tableTitle, variant = "icon", className }: ReportTableButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Faça login para denunciar", variant: "destructive" });
      return;
    }
    const parsed = schema.safeParse({ reason, description });
    if (!parsed.success) {
      toast({
        title: "Verifique os campos",
        description: parsed.error.issues[0]?.message ?? "Selecione um motivo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("reports").insert({
        table_id: tableId,
        reporter_id: user.id,
        reason: parsed.data.reason,
        description: parsed.data.description || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Você já denunciou esta mesa",
            description: "Sua denúncia anterior já está sendo analisada.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Denúncia enviada",
          description: "Obrigado! Nossa equipe vai analisar em breve.",
        });

        // Notifica moderação no Discord (não bloqueia a UX em caso de falha)
        supabase.functions
          .invoke("moderation-discord-webhook", {
            body: {
              table_id: tableId,
              table_title: tableTitle,
              reason: parsed.data.reason,
              description: parsed.data.description || null,
            },
          })
          .catch((err) => {
            console.warn("[ReportTableButton] Discord webhook failed:", err);
          });
      }

      setOpen(false);
      setReason("");
      setDescription("");
    } catch (err: any) {
      console.error("Report insert error:", err);
      toast({
        title: "Não foi possível enviar a denúncia",
        description: err?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const trigger =
    variant === "menu-item" ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`gap-2 ${className ?? ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Flag className="h-4 w-4" />
        Denunciar
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Denunciar mesa"
        title="Denunciar mesa"
        className={`h-8 w-8 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-sm border border-white/20 ${className ?? ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Flag className="h-4 w-4" />
      </Button>
    );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Denunciar mesa
            </DialogTitle>
            <DialogDescription>
              Você está denunciando <span className="font-semibold text-foreground">"{tableTitle}"</span>. Sua denúncia é confidencial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Motivo</Label>
              <RadioGroup value={reason} onValueChange={(v) => setReason(v as Reason)} className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    htmlFor={`report-${r.value}`}
                    className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <RadioGroupItem value={r.value} id={`report-${r.value}`} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.hint}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="report-description" className="mb-2 block">
                Descrição (opcional)
              </Label>
              <Textarea
                id="report-description"
                placeholder="Forneça detalhes que ajudem nossa equipe a avaliar a denúncia."
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/1000</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={loading || !reason}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar denúncia"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}