-- Run after 02_sections.sql, 03_campaigns.sql and 10_hexcrawl.sql.
-- Campaigns participate in tool groups directly. Removing the hexcrawl board
-- must never remove the campaign's Encounter Builder or DM Screen links.
-- Migrate existing board-mediated links once. Do not restore an explicitly
-- unlinked campaign when this script is run again.
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'campaigns' and column_name = 'link_group_id') then
    alter table public.campaigns add column link_group_id text;
    update public.boards b set link_group_id = 'link_' || md5(b.id)
      where b.link_group_id is null and exists (
        select 1 from public.campaigns c where c.hexcrawl_board_id = b.id and c.gm = b.owner
      );
    update public.campaigns c set link_group_id = b.link_group_id
      from public.boards b
      where c.hexcrawl_board_id = b.id and c.gm = b.owner and c.link_group_id is null;
  end if;
end $$;

create index if not exists campaigns_gm_link_group_idx
  on public.campaigns(gm, link_group_id);

-- Optional destination for new dungeon fights when several builders are linked.
alter table public.campaigns add column if not exists dungeon_encounter_id text
  references public.encounters(id) on delete set null;
