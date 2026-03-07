-- LP-048: Allow invited users to view their own pending invites
-- Without this, the accept page returns "invalid or expired" because RLS blocks the lookup

CREATE POLICY "Invited users can view own invites"
ON project_invites FOR SELECT USING (
  lower(invited_email) = lower(auth.jwt() ->> 'email')
);
