/**
 * Figuritas mock para el mapa de San Fernando.
 * Estilos de rareza → src/theme/rarity.js
 */

export { RARITY_STYLES, getRarity, RARITIES } from '../theme/rarity'

export const TOTAL_FIGURES = 10

export const PROXIMITY_THRESHOLD_METERS = 25

export const mockFigures = [
  {
    id: 1,
    slug: 'catedral',
    nombre: 'Catedral de San Fernando',
    rareza: 'común',
    lat: -34.4439,
    lng: -58.5597,
    obtenida: true,
    emoji: '⛪',
    description: 'Patrimonio histórico del centro de la ciudad.',
  },
  {
    id: 2,
    slug: 'plaza',
    nombre: 'Plaza San Martín',
    rareza: 'común',
    lat: -34.4428,
    lng: -58.5589,
    obtenida: true,
    emoji: '🌳',
    description: 'Corazón cívico y punto de encuentro local.',
  },
  {
    id: 3,
    slug: 'costanera',
    nombre: 'Costanera del Delta',
    rareza: 'rara',
    lat: -34.4365,
    lng: -58.5542,
    obtenida: true,
    emoji: '🌊',
    description: 'Vistas al río y paseos al aire libre.',
  },
  {
    id: 4,
    slug: 'museo',
    nombre: 'Museo Histórico',
    rareza: 'épica',
    lat: -34.4451,
    lng: -58.5563,
    obtenida: false,
    emoji: '🏛️',
    description: 'Historia y cultura de San Fernando.',
  },
  {
    id: 5,
    slug: 'estacion',
    nombre: 'Estación Fluvial',
    rareza: 'legendaria',
    lat: -34.4402,
    lng: -58.5621,
    obtenida: false,
    emoji: '⛴️',
    description: 'Puerta de entrada al delta.',
  },
]

export const SAN_FERNANDO_CENTER = [-58.5572, -34.4436]

export const splashDescription =
  'Recorré San Fernando, descubrí puntos turísticos y coleccioná figuritas digitales sacando fotos en cada lugar.'
