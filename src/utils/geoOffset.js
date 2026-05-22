/** Desplaza coordenadas N metros en un rumbo (grados). */
export function offsetCoordinates(lat, lng, distanceMeters, bearingDegrees) {
  const bearing = (bearingDegrees * Math.PI) / 180
  const latRad = (lat * Math.PI) / 180
  const dLat = (distanceMeters * Math.cos(bearing)) / 111_111
  const dLng =
    (distanceMeters * Math.sin(bearing)) / (111_111 * Math.cos(latRad))

  return {
    lat: lat + dLat,
    lng: lng + dLng,
  }
}
