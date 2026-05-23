import { loadGoogleMapsPlaces } from './loadGoogleMaps'
import { parseGooglePlace } from './parseGooglePlace'
import {
  PRIORITY_LOCALITIES,
  ZONA_NORTE_BOUNDS,
  ZONA_NORTE_CENTER,
} from '../config/googlePlaces'

function localityBoost(description) {
  const normalized = String(description ?? '').toLowerCase()
  let score = 0
  for (const locality of PRIORITY_LOCALITIES) {
    if (normalized.includes(locality)) score += 10
  }
  if (normalized.includes('buenos aires')) score += 2
  if (normalized.includes('argentina')) score += 1
  return score
}

export function rankPlacePredictions(predictions) {
  return [...(predictions ?? [])].sort((a, b) => {
    const scoreDiff = localityBoost(b.description) - localityBoost(a.description)
    if (scoreDiff !== 0) return scoreDiff
    return String(a.description).localeCompare(String(b.description), 'es')
  })
}

export async function fetchPlaceDetails(placeId, sessionToken) {
  const google = await loadGoogleMapsPlaces()
  const container = document.createElement('div')
  const service = new google.maps.places.PlacesService(container)

  return new Promise((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: ['formatted_address', 'geometry', 'address_components', 'name'],
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
        componentRestrictions: { country: 'ar' },
        location: new google.maps.LatLng(ZONA_NORTE_CENTER.lat, ZONA_NORTE_CENTER.lng),
        radius: 45000,
        bounds,
        strictBounds: false,
        sessionToken: session.sessionToken,
      },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
          resolve([])
          return
        }
        resolve(rankPlacePredictions(results))
      },
    )
  })
}
