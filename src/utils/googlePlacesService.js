import { loadGoogleMapsPlaces } from './loadGoogleMaps'
import { parseGooglePlace } from './parseGooglePlace'
import { addressAutocompleteLog } from './addressAutocompleteLog'
import {
  getPredictionSearchText,
  matchesAllowedMunicipality,
  POI_PREDICTION_TYPES,
  scorePredictionRelevance,
  ZONA_NORTE_BOUNDS,
  ZONA_NORTE_CENTER,
  ZONA_NORTE_RADIUS_METERS,
} from '../config/googlePlaces'

function isAllowedPredictionType(prediction) {
  const types = prediction?.types ?? []
  if (!types.length) return true

  if (types.some((type) => POI_PREDICTION_TYPES.has(type))) {
    return false
  }

  return types.some((type) =>
    ['street_address', 'premise', 'subpremise', 'route', 'geocode'].includes(type),
  )
}

export function filterPredictionsByZone(predictions, input = '') {
  const accepted = []
  const rejected = []

  for (const prediction of predictions ?? []) {
    const text = getPredictionSearchText(prediction)

    if (!isAllowedPredictionType(prediction)) {
      rejected.push({ prediction, reason: 'poi_or_non_address' })
      continue
    }

    if (!matchesAllowedMunicipality(text)) {
      rejected.push({ prediction, reason: 'outside_zona_norte' })
      continue
    }

    accepted.push(prediction)
  }

  addressAutocompleteLog.info('filtered predictions', {
    inputCount: predictions?.length ?? 0,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
  })

  for (const item of rejected) {
    addressAutocompleteLog.info('rejected prediction', {
      description: item.prediction.description,
      reason: item.reason,
      types: item.prediction.types,
    })
  }

  for (const prediction of accepted) {
    const { score, tier } = scorePredictionRelevance(prediction, input)
    addressAutocompleteLog.info('accepted prediction', {
      description: prediction.description,
      types: prediction.types,
      score,
      tier,
    })
  }

  return rankPlacePredictions(accepted, input)
}

export function rankPlacePredictions(predictions, input = '') {
  const scored = [...(predictions ?? [])].map((prediction) => ({
    prediction,
    ...scorePredictionRelevance(prediction, input),
  }))

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return String(a.prediction.description).localeCompare(String(b.prediction.description), 'es')
  })

  addressAutocompleteLog.info('ranked predictions', {
    input: String(input ?? '').trim(),
    order: scored.map(({ prediction, score, tier }) => ({
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text,
      secondaryText: prediction.structured_formatting?.secondary_text,
      score,
      tier,
    })),
  })

  return scored.map(({ prediction }) => prediction)
}

export async function fetchPlaceDetails(placeId, sessionToken) {
  const google = await loadGoogleMapsPlaces()
  const container = document.createElement('div')
  const service = new google.maps.places.PlacesService(container)

  return new Promise((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: ['formatted_address', 'geometry', 'address_components', 'name', 'types'],
        sessionToken,
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          reject(new Error('PLACE_DETAILS_FAILED'))
          return
        }
        resolve(parseGooglePlace(place))
      },
    )
  })
}

export function createPlacesSession(google) {
  return {
    autocompleteService: new google.maps.places.AutocompleteService(),
    sessionToken: new google.maps.places.AutocompleteSessionToken(),
  }
}

export function refreshPlacesSession(session) {
  if (!window.google?.maps?.places) return session
  return {
    ...session,
    sessionToken: new window.google.maps.places.AutocompleteSessionToken(),
  }
}

export function requestPlacePredictions(session, input) {
  const google = window.google
  const bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(ZONA_NORTE_BOUNDS.south, ZONA_NORTE_BOUNDS.west),
    new google.maps.LatLng(ZONA_NORTE_BOUNDS.north, ZONA_NORTE_BOUNDS.east),
  )

  return new Promise((resolve) => {
    session.autocompleteService.getPlacePredictions(
      {
        input,
        types: ['address'],
        componentRestrictions: { country: 'ar' },
        location: new google.maps.LatLng(ZONA_NORTE_CENTER.lat, ZONA_NORTE_CENTER.lng),
        radius: ZONA_NORTE_RADIUS_METERS,
        bounds,
        strictBounds: false,
        sessionToken: session.sessionToken,
      },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
          addressAutocompleteLog.info('filtered predictions', {
            inputCount: 0,
            acceptedCount: 0,
            rejectedCount: 0,
            status,
          })
          resolve([])
          return
        }
        resolve(filterPredictionsByZone(results, input))
      },
    )
  })
}
