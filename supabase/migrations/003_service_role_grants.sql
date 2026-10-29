-- Allow the Supabase service role (used by the Next.js server) to read/write app tables.
-- Run this in the SQL editor if verify-setup reports "permission denied for table profiles".

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
