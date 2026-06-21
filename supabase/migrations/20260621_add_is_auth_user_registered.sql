create or replace function public.is_auth_user_registered(check_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(check_email)
  );
$$;

grant execute on function public.is_auth_user_registered(text) to anon;
grant execute on function public.is_auth_user_registered(text) to authenticated;
