-- Apply after campaigns.sql and vtt.sql. Private roll events are broadcast
-- only; no roll history is stored. Authorization follows campaign ownership.
-- https://supabase.com/docs/guides/realtime/authorization
drop policy if exists "gm_rolls_receive" on realtime.messages;
create policy "gm_rolls_receive" on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and realtime.topic() like 'gb-gm-rolls-%'
    and public.is_campaign_gm(public.uuid_or_null(substr(realtime.topic(), 13)))
  );

drop policy if exists "gm_rolls_send" on realtime.messages;
create policy "gm_rolls_send" on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and realtime.topic() like 'gb-gm-rolls-%'
    and public.is_campaign_gm(public.uuid_or_null(substr(realtime.topic(), 13)))
  );
