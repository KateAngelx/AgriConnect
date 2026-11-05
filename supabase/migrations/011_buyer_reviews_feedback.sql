alter table product_reviews
  add column if not exists updated_at timestamptz not null default now();

create table if not exists product_review_owners (
  review_id text primary key references product_reviews(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  reviewer_id text not null references profiles(id) on delete cascade,
  unique (product_id, reviewer_id)
);

alter table product_review_owners enable row level security;

create table if not exists buyer_feedback (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  subject text not null,
  category text not null check (category in ('general-feedback', 'suggestion', 'bug-report', 'user-experience', 'other-concern')),
  message text not null,
  status text not null default 'submitted' check (status in ('submitted', 'in-review', 'resolved')),
  admin_response text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists buyer_feedback_user_created_idx
  on buyer_feedback (user_id, created_at desc);
create index if not exists buyer_feedback_status_created_idx
  on buyer_feedback (status, created_at desc);

alter table buyer_feedback enable row level security;

grant select, insert, update, delete on product_review_owners, buyer_feedback to service_role;
