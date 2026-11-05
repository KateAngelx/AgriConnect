create table if not exists buyer_reports (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  report_type text not null check (report_type in ('product', 'seller', 'order', 'buyer', 'delivery-personnel', 'suspicious-activity')),
  target_id text not null default '',
  target_label text not null default '',
  reason text not null,
  description text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'in-review', 'resolved', 'dismissed')),
  admin_response text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists buyer_reports_user_created_idx
  on buyer_reports (user_id, created_at desc);
create index if not exists buyer_reports_status_created_idx
  on buyer_reports (status, created_at desc);

alter table buyer_reports enable row level security;

grant select, insert, update, delete on buyer_reports to service_role;
