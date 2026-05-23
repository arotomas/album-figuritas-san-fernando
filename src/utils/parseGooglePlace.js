function getComponent(components, type, useShort = false) {
  const match = (components ?? []).find((component) => component.types?.includes(type))
  if (!match) return null
  return useShort ? match.short_name ?? match.long_name : match.long_name ?? null
}

export function parseGooglePlace(place) {
  const components = place?.address_components ?? []
  const location = place?.geometry?.location

  return {
    direccion_texto:
      place?.formatted_address?.trim() ||
      place?.name?.trim() ||
      null,
    direccion_lat:
      typeof location?.lat === 'function' ? location.lat() : (location?.lat ?? null),
    direccion_lng:
      typeof location?.lng === 'function' ? location.lng() : (location?.lng ?? null),
    localidad:
      getComponent(components, 'locality') ??
      getComponent(components, 'sublocality') ??
      getComponent(components, 'administrative_area_level_2'),
    provincia: getComponent(components, 'administrative_area_level_1'),
    pais: getComponent(components, 'country'),
    codigo_postal: getComponent(components, 'postal_code'),
  }
}

export function hasValidAddress(address) {
  return Boolean(
    address?.direccion_texto?.trim() &&
      address?.direccion_lat != null &&
      address?.direccion_lng != null,
  )
}
