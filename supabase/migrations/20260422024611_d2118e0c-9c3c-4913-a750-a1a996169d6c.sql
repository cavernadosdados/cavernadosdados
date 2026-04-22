-- Permitir que jogadores removam suas próprias candidaturas
CREATE POLICY "Players can delete own applications"
ON public.table_applications
FOR DELETE
TO authenticated
USING (auth.uid() = player_id);