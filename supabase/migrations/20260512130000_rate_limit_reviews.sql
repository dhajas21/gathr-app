-- Rate limit: max 10 reviews per reviewer per 24 hours.
-- Prevents spam/abuse on the user_reviews table.

create or replace function rate_limit_user_reviews()
returns trigger
language plpgsql
security definer
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
    from user_reviews
    where reviewer_id = NEW.reviewer_id
      and created_at > now() - interval '24 hours';

  if recent_count >= 10 then
    raise exception 'Rate limit: max 10 reviews per 24 hours';
  end if;

  return NEW;
end;
$$;

drop trigger if exists rate_limit_reviews_trg on user_reviews;
create trigger rate_limit_reviews_trg
  before insert on user_reviews
  for each row
  execute function rate_limit_user_reviews();
