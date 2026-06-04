-- Rollback STAGING — álbum y figuritas QA Costanera
-- Orden: album_figures → figures QA → album_collections QA → albums QA
-- No borra user_figures (puede quedar progreso huérfano en ids qa-* si alguien capturó; limpiar manual si hace falta).

delete from public.album_figures
where album_id = 'qa-costanera';

delete from public.figures
where id like 'qa-costanera-%';

delete from public.album_collections
where id = 'qa-costanera-paseo'
   or album_id = 'qa-costanera';

delete from public.albums
where id = 'qa-costanera';
