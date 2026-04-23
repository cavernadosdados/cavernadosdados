
-- Tabela: tables — leitura pública (exceto under_review)
CREATE POLICY "Public can view non-restricted tables"
  ON public.tables
  FOR SELECT
  TO anon
  USING (status <> 'under_review');

-- Tabela: profiles — leitura pública (necessária para mostrar nome/avatar do mestre na página pública)
CREATE POLICY "Public can view profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- Tabela: campaign_details — leitura pública limitada (a página pública só lê schedule/frequency/next_session_date)
CREATE POLICY "Public can view campaign_details"
  ON public.campaign_details
  FOR SELECT
  TO anon
  USING (true);

-- Tabela: table_applications — público pode contar candidaturas aceitas para mostrar vagas restantes
CREATE POLICY "Public can count accepted applications"
  ON public.table_applications
  FOR SELECT
  TO anon
  USING (status = 'accepted');
