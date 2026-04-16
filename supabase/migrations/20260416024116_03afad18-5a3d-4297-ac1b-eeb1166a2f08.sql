
-- Add compliments column to session_feedback
ALTER TABLE public.session_feedback ADD COLUMN compliments text[] DEFAULT '{}'::text[];

-- Enable realtime for tables so players get notified of status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
