export const VISUAL_PREVIEW_ENABLED = import.meta.env.VITE_VISUAL_PREVIEW === '1'

export const VISUAL_PREVIEW_USER_ID = '11111111-1111-4111-8111-111111111111'

export const VISUAL_PREVIEW_PROFILE = {
  id: VISUAL_PREVIEW_USER_ID,
  username: 'explorador_sf',
  nombre: 'Tomás',
  apellido: 'Explorador',
  email: 'explorador@sanfernando.test',
  celular: '+54 11 5555-1234',
  dni: '30123456',
  direccion_texto: 'Av. Constitución 1234, San Fernando',
  localidad: 'San Fernando',
  provincia: 'Buenos Aires',
  pais: 'Argentina',
  auth_provider: 'email',
  role: 'user',
  profile_completed: true,
}

export const VISUAL_PREVIEW_RANKING = {
  leaderboard: [
    { rank: 1, username: 'campeona_sf', totalPoints: 420 },
    { rank: 2, username: 'cazador_verde', totalPoints: 385 },
    { rank: 3, username: 'figuritas_pro', totalPoints: 340 },
    { rank: 4, username: 'explorador_sf', totalPoints: 275 },
    { rank: 5, username: 'barrio_norte', totalPoints: 240 },
    { rank: 6, username: 'album_master', totalPoints: 210 },
    { rank: 7, username: 'paseo_costanera', totalPoints: 188 },
    { rank: 8, username: 'coleccionista', totalPoints: 165 },
    { rank: 9, username: 'sanfer_jr', totalPoints: 142 },
    { rank: 10, username: 'vecino_mapa', totalPoints: 120 },
  ],
  me: { rank: 4, username: 'explorador_sf', totalPoints: 275 },
}

export const VISUAL_PREVIEW_ALBUM = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  slug: 'san-fernando-2026',
  title: 'San Fernando 2026',
  is_published: true,
  sort_order: 1,
}

export function seedVisualPreviewAuth({ setSupabaseAuth, login, setAuthBootstrapped, setAlbumState }) {
  setSupabaseAuth({
    userId: VISUAL_PREVIEW_USER_ID,
    isAdmin: false,
    isModeratorOrAdmin: false,
    profile: VISUAL_PREVIEW_PROFILE,
  })

  login({
    username: VISUAL_PREVIEW_PROFILE.username,
    profileCompleted: true,
  })

  setAlbumState?.({
    publishedAlbums: [VISUAL_PREVIEW_ALBUM],
    activeAlbumId: VISUAL_PREVIEW_ALBUM.id,
  })

  setAuthBootstrapped(true)
}
