-- 014: gate platform-admin powers behind approval. A self-signed-up administrator
-- can manage their OWN org (org_id-scoped policies), but is_admin() — which grants
-- platform-wide reads + coach verification — now also requires approved = true.
-- Approval is a manual flip until a super-admin UI exists. Additive/idempotent.

ALTER TABLE public.administrators
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.administrators WHERE id = auth.user_id() AND approved = true
) $$;
