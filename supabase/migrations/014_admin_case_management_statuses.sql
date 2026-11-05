alter table buyer_feedback
  add column if not exists response_history jsonb not null default '[]'::jsonb;

alter table buyer_feedback
  drop constraint if exists buyer_feedback_status_check;

update buyer_feedback
set status = case status
  when 'submitted' then 'pending'
  when 'in-review' then 'under-review'
  else status
end
where status in ('submitted', 'in-review');

update buyer_feedback
set status = 'responded'
where status in ('pending', 'under-review')
  and coalesce(admin_response, '') <> '';

alter table buyer_feedback
  alter column status set default 'pending';

alter table buyer_feedback
  add constraint buyer_feedback_status_check
  check (status in ('pending', 'under-review', 'responded', 'resolved'));

update buyer_feedback
set response_history = jsonb_build_array(jsonb_build_object(
  'response', admin_response,
  'createdAt', coalesce(responded_at, updated_at, created_at)
))
where coalesce(admin_response, '') <> ''
  and response_history = '[]'::jsonb;

alter table buyer_reports
  add column if not exists administrative_actions jsonb not null default '[]'::jsonb;

alter table buyer_reports
  drop constraint if exists buyer_reports_status_check;

update buyer_reports
set status = case status
  when 'submitted' then 'pending'
  when 'in-review' then 'under-review'
  when 'dismissed' then 'rejected'
  else status
end
where status in ('submitted', 'in-review', 'dismissed');

alter table buyer_reports
  alter column status set default 'pending';

alter table buyer_reports
  add constraint buyer_reports_status_check
  check (status in ('pending', 'under-review', 'resolved', 'rejected'));
