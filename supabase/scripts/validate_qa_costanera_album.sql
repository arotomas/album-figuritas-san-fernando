-- Validación seed QA Costanera (staging)

select
  'published_albums' as check_name,
  count(*)::bigint as value
from public.albums
where status = 'published' and active = true;

select id, title, is_default, sort_order
from public.albums
where status = 'published' and active = true
order by sort_order, title;

select
  'san_fernando_figure_count' as check_name,
  count(*)::bigint as value
from public.album_figures
where album_id = 'san-fernando';

select
  'qa_costanera_figure_count' as check_name,
  count(*)::bigint as value
from public.album_figures
where album_id = 'qa-costanera' and active_in_album = true;

select album_id, figure_id, collection_id
from public.album_figures
where album_id = 'qa-costanera'
order by sort_order;

select id, title, rarity, lat, lng
from public.figures
where id like 'qa-costanera-%'
order by id;

-- Cross-álbum: figuras en ambos álbumes
select af.figure_id, array_agg(af.album_id order by af.album_id) as albums
from public.album_figures af
where af.figure_id in ('2', '3')
group by af.figure_id;

-- Integridad puntos intacta
select
  'missing_ledger' as check_name,
  count(*)::bigint as failing_rows
from public.user_figures uf
where not exists (
  select 1 from public.user_points_ledger l
  where l.user_figure_id = uf.id and l.source = 'figure_unlock'
);
