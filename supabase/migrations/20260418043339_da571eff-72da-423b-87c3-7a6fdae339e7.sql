CREATE TABLE public.chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  message_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, message_id)
);

CREATE INDEX idx_chat_reports_reporter ON public.chat_reports (reporter_id);
CREATE INDEX idx_chat_reports_message ON public.chat_reports (message_id);

ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reports"
  ON public.chat_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users create own reports"
  ON public.chat_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users delete own reports"
  ON public.chat_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = reporter_id);