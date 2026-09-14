import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface SessionFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  reviewedId: string;
  reviewedName?: string;
  reviewerRole: "master" | "player";
  sessionNumber: number;
  sessionLogId: string;
  onSubmitted?: () => void;
}

const playerCriteria = ["Didática", "Preparação", "Narrativa"];
const masterCriteria = ["Pontualidade", "Engajamento", "Trabalho em Equipe"];

const playerCompliments = [
  "Muito Criativo",
  "Pontualidade Britânica",
  "Ótimo Roleplay",
  "Cooperativo",
  "Conhece as Regras",
  "Engraçado",
];

const masterCompliments = [
  "Narrativa Imersiva",
  "Preparação Impecável",
  "Mestre Justo",
  "Vozes Incríveis",
  "Ambiente Seguro",
  "Prestativo",
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-colors"
        >
          <Star
            className={`h-6 w-6 ${star <= value ? "fill-[hsl(var(--cavern-gold))] text-[hsl(var(--cavern-gold))]" : "text-muted-foreground/30"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function SessionFeedbackDialog({
  open,
  onOpenChange,
  tableId,
  reviewedId,
  reviewedName,
  reviewerRole,
  sessionNumber,
  sessionLogId,
  onSubmitted,
}: SessionFeedbackDialogProps) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([0, 0, 0]);
  const [compliments, setCompliments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const criteria = reviewerRole === "player" ? playerCriteria : masterCriteria;
  const availableCompliments = reviewerRole === "player" ? masterCompliments : playerCompliments;

  const allRated = ratings.every((r) => r > 0);

  useEffect(() => {
    if (!open) return;
    setRatings([0, 0, 0]);
    setCompliments([]);
  }, [open, reviewedId, sessionLogId]);

  const toggleCompliment = (c: string) => {
    setCompliments((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async () => {
    if (!user || !allRated) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("session_feedback").insert({
        table_id: tableId,
        session_log_id: sessionLogId,
        session_number: sessionNumber,
        reviewer_id: user.id,
        reviewed_id: reviewedId,
        reviewer_role: reviewerRole,
        rating_1: ratings[0],
        rating_2: ratings[1],
        rating_3: ratings[2],
        compliments,
      } as any);
      if (error) throw error;
      toast({ title: "Avaliação enviada!", description: "Obrigado pelo seu feedback." });
      // Reset for next use
      setRatings([0, 0, 0]);
      setCompliments([]);
      onSubmitted?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-[hsl(var(--cavern-gold))]/30 bg-card/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="glow-gold text-xl">
            Avaliação da Sessão #{sessionNumber}
          </DialogTitle>
          <DialogDescription>
            {reviewerRole === "player"
              ? "Avalie o Mestre desta sessão"
              : reviewedName
                ? `Avalie ${reviewedName}`
                : "Avalie o Jogador desta sessão"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Star Ratings */}
          {criteria.map((label, i) => (
            <div key={label} className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{label}</Label>
              <StarRating
                value={ratings[i]}
                onChange={(v) => {
                  const next = [...ratings];
                  next[i] = v;
                  setRatings(next);
                }}
              />
            </div>
          ))}

          {/* Compliment Tags */}
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Fazer um elogio (opcional)
            </Label>
            <div className="flex flex-wrap gap-2">
              {availableCompliments.map((c) => {
                const selected = compliments.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCompliment(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                      selected
                        ? "bg-[hsl(var(--cavern-gold))]/20 border-[hsl(var(--cavern-gold))] text-[hsl(var(--cavern-gold))] shadow-[0_0_12px_hsl(var(--cavern-gold)/0.3)]"
                        : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/50"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-sm"
          >
            Avaliar mais tarde
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !allRated}
            className="gap-2"
          >
            {submitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
