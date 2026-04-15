
-- Campaign details table
CREATE TABLE public.campaign_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  campaign_objectives TEXT DEFAULT '',
  progression_expectation TEXT DEFAULT '',
  house_rules TEXT DEFAULT '',
  combat_rules TEXT DEFAULT '',
  pvp_rules TEXT DEFAULT '',
  safety_lines TEXT DEFAULT '',
  safety_veils TEXT DEFAULT '',
  restricted_races TEXT DEFAULT '',
  restricted_classes TEXT DEFAULT '',
  restricted_spells TEXT DEFAULT '',
  absence_policy TEXT DEFAULT '',
  lateness_policy TEXT DEFAULT '',
  frequency TEXT DEFAULT '',
  schedule_time TEXT DEFAULT '',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(table_id)
);

ALTER TABLE public.campaign_details ENABLE ROW LEVEL SECURITY;

-- Masters can manage their campaign details
CREATE POLICY "Masters can view own campaign details"
ON public.campaign_details FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tables WHERE tables.id = campaign_details.table_id AND tables.master_id = auth.uid())
);

CREATE POLICY "Players can view campaign details of accepted tables"
ON public.campaign_details FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.table_applications
    WHERE table_applications.table_id = campaign_details.table_id
    AND table_applications.player_id = auth.uid()
    AND table_applications.status = 'accepted'
  )
);

CREATE POLICY "Masters can insert campaign details"
ON public.campaign_details FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tables WHERE tables.id = campaign_details.table_id AND tables.master_id = auth.uid())
);

CREATE POLICY "Masters can update campaign details"
ON public.campaign_details FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tables WHERE tables.id = campaign_details.table_id AND tables.master_id = auth.uid())
);

-- Session feedback table
CREATE TABLE public.session_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL DEFAULT 1,
  reviewer_id UUID NOT NULL,
  reviewed_id UUID NOT NULL,
  reviewer_role TEXT NOT NULL DEFAULT 'player',
  rating_1 INTEGER NOT NULL DEFAULT 5,
  rating_2 INTEGER NOT NULL DEFAULT 5,
  rating_3 INTEGER NOT NULL DEFAULT 5,
  comment TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create feedback"
ON public.session_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can view own feedback"
ON public.session_feedback FOR SELECT
TO authenticated
USING (auth.uid() = reviewer_id OR auth.uid() = reviewed_id);

CREATE POLICY "Masters can view all feedback for their tables"
ON public.session_feedback FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.tables WHERE tables.id = session_feedback.table_id AND tables.master_id = auth.uid())
);

-- Trigger for updated_at on campaign_details
CREATE OR REPLACE FUNCTION public.update_campaign_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_campaign_details_updated_at
BEFORE UPDATE ON public.campaign_details
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_details_updated_at();
