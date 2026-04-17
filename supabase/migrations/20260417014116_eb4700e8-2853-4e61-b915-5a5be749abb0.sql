-- Tabela de registros de sessão (Diário)
CREATE TABLE public.session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  session_number integer NOT NULL DEFAULT 1,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL DEFAULT 'Nova Sessão',
  master_narrative text DEFAULT '',
  ai_epic_summary text DEFAULT '',
  pinned_report_id uuid,
  sent_to_discord boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters manage own session logs"
ON public.session_logs FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.tables WHERE tables.id = session_logs.table_id AND tables.master_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.tables WHERE tables.id = session_logs.table_id AND tables.master_id = auth.uid()));

CREATE POLICY "Accepted players view session logs"
ON public.session_logs FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.table_applications
  WHERE table_applications.table_id = session_logs.table_id
    AND table_applications.player_id = auth.uid()
    AND table_applications.status = 'accepted'
));

-- Tabela de relatos dos jogadores
CREATE TABLE public.player_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_log_id uuid NOT NULL REFERENCES public.session_logs(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  character_name text NOT NULL DEFAULT 'Aventureiro',
  character_avatar_url text DEFAULT '',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view reports"
ON public.player_reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.session_logs sl
    JOIN public.tables t ON t.id = sl.table_id
    WHERE sl.id = player_reports.session_log_id
      AND (
        t.master_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.table_applications ta
          WHERE ta.table_id = t.id AND ta.player_id = auth.uid() AND ta.status = 'accepted'
        )
      )
  )
);

CREATE POLICY "Players create own reports"
ON public.player_reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM public.session_logs sl
    JOIN public.table_applications ta ON ta.table_id = sl.table_id
    WHERE sl.id = player_reports.session_log_id
      AND ta.player_id = auth.uid()
      AND ta.status = 'accepted'
  )
);

CREATE POLICY "Players update own reports"
ON public.player_reports FOR UPDATE
TO authenticated
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players delete own reports"
ON public.player_reports FOR DELETE
TO authenticated
USING (auth.uid() = player_id);

-- FK para fixar relato após criar a tabela
ALTER TABLE public.session_logs
  ADD CONSTRAINT fk_pinned_report
  FOREIGN KEY (pinned_report_id) REFERENCES public.player_reports(id) ON DELETE SET NULL;

-- Tabela de reações nos relatos
CREATE TABLE public.report_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.player_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id, emoji)
);

ALTER TABLE public.report_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view reactions"
ON public.report_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.player_reports pr
    JOIN public.session_logs sl ON sl.id = pr.session_log_id
    JOIN public.tables t ON t.id = sl.table_id
    WHERE pr.id = report_reactions.report_id
      AND (
        t.master_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.table_applications ta
          WHERE ta.table_id = t.id AND ta.player_id = auth.uid() AND ta.status = 'accepted'
        )
      )
  )
);

CREATE POLICY "Users add own reactions"
ON public.report_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own reactions"
ON public.report_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Triggers de updated_at
CREATE TRIGGER trg_session_logs_updated_at
  BEFORE UPDATE ON public.session_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_player_reports_updated_at
  BEFORE UPDATE ON public.player_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_reactions;