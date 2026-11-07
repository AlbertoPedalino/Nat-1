-- ============================================================================
-- GM Board — One recovery read for everything a client has open.
--
-- Run AFTER 25_player_token_images.sql (it reads tables from 01–20 and uses
-- uuid_or_null from 05). Safe to re-run. Creates no table and stores nothing:
-- it only reads revisions that already exist.
--
-- Realtime carries changes; every 30 seconds (and when a tab comes back or the
-- network returns) the client asks once "did anything I have open move?". It
-- sends the keys of what it has open and gets back one short string per key:
-- a revision, a timestamp, or a hash of a list's ids and revisions. The client
-- compares them with the last ones it saw and reads in full only what moved.
--
-- Keys are `<kind>:<id>` (src/shared/cloud/sync/syncKeys.js builds them):
--   sheet:<character>          a character's sheet_revision
--   digests:<campaign>         every character digest of a campaign
--   digest:<character>         one character digest
--   fights:<instance>          every fight of an encounter builder
--   fight:<fight>              one fight
--   boards|encounters|dm_screens:<id>   a tool instance's version
--   my:boards|encounters|dm_screens     the caller's own instances (names, links)
--   campaign:<campaign>        a campaign's name and tool links
--   board-campaigns:<board>    the campaigns using a hexcrawl board
--   clock:<campaign>           the campaign clock
--   clock-log:<campaign>       the campaign clock's log
--   live-scene:<campaign>      the scene a campaign is playing
--   scene:<scene>              a battle-map scene
--   tokens:<scene> / drawings:<scene> / token-secrets:<scene>
--   scene-turn:<scene>         which fight a scene shows, and its round
--   hex-cells:<scene>          a hexcrawl map's cells
--
-- SECURITY INVOKER: every read goes through the caller's RLS, so a key answers
-- only for rows the caller may read (an unreadable row reads as missing, a list
-- as the rows the caller sees). An unknown kind or a bad id answers null.
-- ============================================================================

create or replace function public.sync_digest(watch text[])
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  watched text;
  kind text;
  arg text;
  arg_uuid uuid;
  answer text;
  result jsonb := '{}'::jsonb;
begin
  if coalesce(array_length(watch, 1), 0) > 200 then
    raise exception 'sync_digest: at most 200 keys';
  end if;
  foreach watched in array coalesce(watch, '{}'::text[]) loop
    kind := split_part(watched, ':', 1);
    arg := substr(watched, length(kind) + 2);
    arg_uuid := public.uuid_or_null(arg);
    answer := case kind
      when 'sheet' then
        (select c.sheet_revision::text from characters c where c.id = arg)
      when 'digests' then
        (select md5(coalesce(string_agg(d.character_id || '@' || d.row_revision, ',' order by d.character_id), ''))
           from character_digests d where d.campaign_id = arg_uuid)
      when 'digest' then
        (select d.row_revision::text from character_digests d where d.character_id = arg)
      when 'fights' then
        (select md5(coalesce(string_agg(f.id || '@' || f.updated_at, ',' order by f.id), ''))
           from encounter_fights f where f.instance_id = arg)
      when 'fight' then
        (select f.updated_at::text from encounter_fights f where f.id = arg)
      when 'boards' then
        (select b.version::text from boards b where b.id = arg)
      when 'encounters' then
        (select e.version::text from encounters e where e.id = arg)
      when 'dm_screens' then
        (select s.version::text from dm_screens s where s.id = arg)
      when 'my' then
        case arg
          when 'boards' then
            (select md5(coalesce(string_agg(concat_ws('@', b.id, b.name, b.link_group_id, b.updated_at), ',' order by b.id), ''))
               from boards b where b.owner = auth.uid())
          when 'encounters' then
            (select md5(coalesce(string_agg(concat_ws('@', e.id, e.name, e.link_group_id, e.updated_at), ',' order by e.id), ''))
               from encounters e where e.owner = auth.uid())
          when 'dm_screens' then
            (select md5(coalesce(string_agg(concat_ws('@', s.id, s.name, s.link_group_id, s.updated_at), ',' order by s.id), ''))
               from dm_screens s where s.owner = auth.uid())
        end
      when 'campaign' then
        (select md5(concat_ws('@', c.name, c.hexcrawl_board_id, c.link_group_id, c.dungeon_encounter_id))
           from campaigns c where c.id = arg_uuid)
      when 'board-campaigns' then
        (select md5(coalesce(string_agg(c.id || '@' || c.name, ',' order by c.id), ''))
           from campaigns c where c.hexcrawl_board_id = arg)
      when 'clock' then
        (select h.updated_at::text from campaign_hexcrawl h where h.campaign_id = arg_uuid)
      when 'clock-log' then
        (select count(*) || '@' || coalesce(max(l.created_at)::text, '')
           from campaign_hexcrawl_log l where l.campaign_id = arg_uuid)
      when 'live-scene' then
        (select concat_ws('@', s.scene_id, s.updated_at) from campaign_live_scenes s where s.campaign_id = arg_uuid)
      when 'scene' then
        (select s.updated_at::text from map_scenes s where s.id = arg_uuid)
      when 'tokens' then
        (select md5(coalesce(string_agg(t.id || '@' || t.updated_at, ',' order by t.id), ''))
           from map_tokens t where t.scene_id = arg_uuid)
      when 'drawings' then
        (select md5(coalesce(string_agg(d.id || '@' || d.updated_at, ',' order by d.id), ''))
           from map_drawings d where d.scene_id = arg_uuid)
      when 'token-secrets' then
        (select md5(coalesce(string_agg(s.token_id || '@' || s.updated_at, ',' order by s.token_id), ''))
           from map_token_secrets s join map_tokens t on t.id = s.token_id where t.scene_id = arg_uuid)
      when 'scene-turn' then
        (select md5(concat_ws('@', s.instance_id, s.fight_id, s.round, s.updated_at))
           from map_scene_turns s where s.scene_id = arg_uuid)
      when 'hex-cells' then
        (select md5(coalesce(string_agg(c.q || ',' || c.r || '@' || c.updated_at, ';' order by c.q, c.r), ''))
           from map_hex_cells c where c.scene_id = arg_uuid)
    end;
    result := result || jsonb_build_object(watched, answer);
  end loop;
  return result;
end;
$$;

grant execute on function public.sync_digest(text[]) to authenticated;
