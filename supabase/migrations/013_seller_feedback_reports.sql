alter table buyer_feedback
  add column if not exists submitter_role text not null default 'buyer'
  check (submitter_role in ('buyer', 'seller'));

alter table buyer_reports
  add column if not exists reporter_role text not null default 'buyer'
  check (reporter_role in ('buyer', 'seller'));

alter table buyer_reports
  drop constraint if exists buyer_reports_report_type_check;

alter table buyer_reports
  add constraint buyer_reports_report_type_check
  check (report_type in ('product', 'seller', 'order', 'buyer', 'delivery-personnel', 'suspicious-activity'));

grant select, insert, update, delete on buyer_feedback, buyer_reports to service_role;
