alter table public.content_items add column if not exists created_by uuid references auth.users(id);
