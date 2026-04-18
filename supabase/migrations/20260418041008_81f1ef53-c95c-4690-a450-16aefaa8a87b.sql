DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Apenas para o próprio usuário (defesa em profundidade); triggers SECURITY DEFINER ignoram RLS
CREATE POLICY "Users can insert own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);