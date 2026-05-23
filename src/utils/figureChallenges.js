export const CHALLENGE_TYPES = [
  {
    id: 'facade',
    label: 'Fachada completa',
    title: 'Fachada completa',
    description: 'Sacá la foto donde se vea la fachada principal completa del lugar.',
  },
  {
    id: 'sign',
    label: 'Cartel visible',
    title: 'Cartel visible',
    description: 'Sacá la foto donde se vea el cartel o letrero principal bien legible.',
  },
  {
    id: 'monument',
    label: 'Monumento entero',
    title: 'Monumento entero',
    description: 'Capturá el monumento o punto de referencia completo en el encuadre.',
  },
  {
    id: 'sky',
    label: 'Con cielo',
    title: 'Con cielo',
    description: 'Incluí parte del cielo para mostrar que estás en el lugar real.',
  },
  {
    id: 'corner',
    label: 'Desde la esquina',
    title: 'Desde la esquina',
    description: 'Sacá la foto desde una esquina cercana para mostrar el contexto del lugar.',
  },
  {
    id: 'partial_selfie',
    label: 'Selfie parcial',
    title: 'Selfie parcial',
    description: 'Incluí una parte tuya o de alguien del grupo para confirmar presencia.',
  },
  {
    id: 'custom',
    label: 'Personalizada',
    title: 'Misión visual',
    description: '',
  },
]

export const OPTIONAL_CHALLENGE_TIPS = [
  'Tip extra: incluí un poco del piso en la foto.',
  'Tip extra: probá con una foto vertical.',
  'Tip extra: que se vea un poco del cielo.',
]

function presetForType(type) {
  return CHALLENGE_TYPES.find((item) => item.id === type) ?? null
}

function tipForFigure(figure) {
  if (!figure?.id || figure.challenge_description?.trim()) return null
  const seed = String(figure.id)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return OPTIONAL_CHALLENGE_TIPS[seed % OPTIONAL_CHALLENGE_TIPS.length]
}

export function getFigureChallenge(figure) {
  if (!figure) return null

  const type = figure.challenge_type?.trim() || null
  const preset = type ? presetForType(type) : null
  const title = figure.challenge_title?.trim() || preset?.title || null
  const description =
    figure.challenge_description?.trim() || preset?.description || null
  const exampleUrl = figure.challenge_example_image_url?.trim() || null

  if (!title && !description && !type) return null

  return {
    title: title ?? '📸 Misión visual',
    description:
      description ??
      'Sacá una foto clara del lugar que muestre que estuviste ahí de verdad.',
    type,
    typeLabel: preset?.label ?? (type ? type : null),
    exampleUrl,
    extraTip: type && !figure.challenge_description?.trim() ? tipForFigure(figure) : null,
  }
}

export function hasCaptureChallenge(figure) {
  return getFigureChallenge(figure) !== null
}
