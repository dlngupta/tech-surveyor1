-- Metadata for files uploaded to the `gos-documents` storage bucket.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.gos_documents (
  storage_path text primary key,                 -- object name in the gos-documents bucket
  file_name    text not null check (char_length(file_name) between 1 and 150),
  subject      text not null check (char_length(subject) between 1 and 500),
  go_date      date not null,
  category     text not null check (category in (
                 'General administration',
                 'Survey and Land records',
                 'Revenue Lands')),
  created_at   timestamptz not null default now()
);

alter table public.gos_documents enable row level security;

-- The app uses the publishable (anon) key, same access level as the storage bucket.
create policy "gos_documents read"   on public.gos_documents for select to anon using (true);
create policy "gos_documents insert" on public.gos_documents for insert to anon with check (true);
create policy "gos_documents delete" on public.gos_documents for delete to anon using (true);
