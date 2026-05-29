# Auditoría de despliegue (Vercel)

## Proyecto Vercel

| Campo | Valor |
|-------|--------|
| **Nombre** | `album-figuritas-san-fernando` |
| **Project ID** | `prj_NmLdOr1D9l4zaQp2LGWKRQ4LTlkN` |
| **Team** | `arotomas-projects` |

## Repositorio Git

| Campo | Valor |
|-------|--------|
| **Remote** | `https://github.com/arotomas/album-figuritas-san-fernando.git` |
| **Producción (Vercel)** | rama `main` → alias `album-figuritas-san-fernando.vercel.app` |
| **Previews** | ramas/CLI → URLs `album-figuritas-san-fernando-*-arotomas-projects.vercel.app` |

## URLs y qué código sirven

| URL | Target | Código típico |
|-----|--------|----------------|
| `https://album-figuritas-san-fernando.vercel.app` | **production** | último deploy de `main` |
| `https://album-figuritas-san-fernando-XXXX.vercel.app` | **preview** | rama/commit del deploy concreto |
| PWA instalada desde producción | — | sigue apuntando a **production** aunque abras un link preview después |

## Por qué no se veían los cambios en el teléfono

1. **Producción ≠ preview**: flags (`map_free_camera`, CAMERA QA, cartel verde) están en ramas como `feat/map-free-camera-flag`, no en `main`.
2. **PWA / Service Worker**: puede servir bundle viejo de producción; borrar datos del sitio o desinstalar la PWA.
3. **Previews con protección Vercel**: algunas URLs preview piden login SSO; sin sesión no cargan el bundle nuevo.
4. **Deploy CLI (`vercel deploy`)**: construye el **checkout local** en el momento del deploy; el SHA debe coincidir con `BUILD SHA` en pantalla.

## Verificación en el dispositivo

En **cualquier** pantalla de la app:

- Esquina superior izquierda: **`BUILD SHA: xxxxxxx`**
- Página pública: **`/build-info`** (commit, branch, fecha UTC, entorno)

Si el SHA no coincide con el commit que esperás en GitHub, no estás en ese deploy.

## Protección SSO en previews (causa frecuente en el teléfono)

Las URLs `*-arotomas-projects.vercel.app` tienen **Vercel Authentication** activa. Sin iniciar sesión en Vercel en ese navegador:

- La app **no carga** (pantalla “Authentication Required”).
- No verás `BUILD SHA`, `/build-info`, ni el cartel verde aunque el link sea correcto.

**Qué hacer en el teléfono:** abrir el link preview → completar login Vercel (SSO) una vez → recargar. O usar el alias estable del deploy tras autenticarte.

Producción (`album-figuritas-san-fernando.vercel.app`) **no** tiene esa pantalla, pero sirve código de `main` (sin fingerprint ni flags de la rama feature).

## Deploys de referencia (mayo 2026)

| URL | Target | SHA en bundle | BUILD SHA badge |
|-----|--------|---------------|-----------------|
| `https://album-figuritas-san-fernando.vercel.app` | production | `87c5fb9` (`main`) | **No** |
| `https://album-figuritas-san-fernando-cxwq48jvv-arotomas-projects.vercel.app` | preview (CLI) | `988249e` | **Sí** |
| Alias: `…-arotomas-arotomas-projects.vercel.app` | preview | mismo deploy | **Sí** |

Deployment ID preview actual: `dpl_7YHEpPbWZD8xCiSfYTYU6UqkfxFL` (2026-05-29).

Actualizá esta tabla con el SHA que muestre `/build-info` tras cada deploy.
