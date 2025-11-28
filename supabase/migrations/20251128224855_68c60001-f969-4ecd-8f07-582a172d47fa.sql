-- Allow authenticated users to insert their own connection logs
CREATE POLICY "Users can insert own connection logs"
ON public.user_connection_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own connection logs
CREATE POLICY "Users can view own connection logs"
ON public.user_connection_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own connection logs (for disconnection)
CREATE POLICY "Users can update own connection logs"
ON public.user_connection_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);