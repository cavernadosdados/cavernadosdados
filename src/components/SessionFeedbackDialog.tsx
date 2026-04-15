import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  reviewerRole: "master" | "player";
  sessionNumber: number;
  onSubmitted?: () => void;
}

const playerCriteria = ["Didática", "Preparação", "Narrativa"];
const masterCriteria = ["Pontualidade", "Engajamento", "Trabalho em Equipe"];

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
            className={`h-5 w-5 ${star <= value ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
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
  reviewerRole,
  sessionNumber,
  onSubmitted,
}: SessionFeedbackDialogProps) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([5, 5, 5]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const criteria = reviewerRole === "player" ? playerCriteria : masterCriteria;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("session_feedback").insert({
        table_id: tableId,
        session_number: sessionNumber,
        reviewer_id: user.id,
        reviewed_id: reviewedId,
        reviewer_role: reviewerRole,
        rating_1: ratings[0],
        rating_2: ratings[1],
        rating_3: ratings[2],
        comment,
      });
      if (error) throw error;
      toast({ title: "Avaliação enviada!", description: "Obrigado pelo seu feedback." });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="glow-gold">Avaliação da Sessão #{sessionNumber}</DialogTitle>
          <DialogDescription>
            {reviewerRole === "player"
              ? "Avalie o Mestre desta sessão"
              : "Avalie o Jogador desta sessão"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {criteria.map((label, i) => (
            <div key={label} className="space-y-1">
              <Label className="text-sm font-medium">{label}</Label>
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

          <div className="space-y-1">
            <Label className="text-sm font-medium">Comentário (opcional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Deixe um comentário sobre a sessão..."
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
