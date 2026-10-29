-- Run after schema.sql in development. Safe to rerun.

alter table profiles alter column email drop not null;

alter table profiles add column if not exists phone text;
alter table profiles add column if not exists phone_verified boolean default false;

create unique index if not exists profiles_phone_unique on profiles (phone) where phone is not null;

create unique index if not exists profiles_email_unique on profiles (email) where email is not null;
