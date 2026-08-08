begin;

-- Supabase Web3 identities can expose the wallet as `address`, or embed it in
-- `sub` / `provider_id` using the form web3:ethereum:0x.... Normalize every
-- supported form to the canonical lowercase EVM address used by VPorkPay RLS.
create or replace function public.authenticated_wallet_address()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower((regexp_match(
    concat_ws(' ', identity_data ->> 'address', identity_data ->> 'sub', provider_id),
    '(0x[0-9a-fA-F]{40})'
  ))[1])
  from auth.identities
  where user_id = auth.uid()
    and provider = 'web3'
    and concat_ws(' ', identity_data ->> 'address', identity_data ->> 'sub', provider_id) ~ '0x[0-9a-fA-F]{40}'
  order by created_at desc
  limit 1;
$$;

revoke all on function public.authenticated_wallet_address() from public;
grant execute on function public.authenticated_wallet_address() to authenticated;

commit;
