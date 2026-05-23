import { useEffect, useId, useRef, useState } from 'react'
import { FaLocationDot, FaMagnifyingGlass } from 'react-icons/fa6'
import { isGooglePlacesConfigured } from '../../config/googlePlaces'
import { usePlacesAutocomplete } from '../../hooks/usePlacesAutocomplete'
import { fetchPlaceDetails } from '../../utils/googlePlacesService'
import { isAllowedZonaNorteAddress } from '../../config/googlePlaces'
import { addressAutocompleteLog } from '../../utils/addressAutocompleteLog'
import { hasValidAddress } from '../../utils/parseGooglePlace'

export function AddressAutocomplete({
  value = '',
  onInputChange,
  onAddressSelect,
  label = 'Dirección',
  placeholder = 'Buscá tu dirección…',
  disabled = false,
  required = false,
  helperText = 'Buscá calles de Zona Norte (San Fernando, Tigre, San Isidro, Vicente López y alrededores). Elegí una sugerencia.',
}) {
  const listId = useId()
  const rootRef = useRef(null)
  const [inputValue, setInputValue] = useState(value ?? '')
  const [selected, setSelected] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [open, setOpen] = useState(false)

  const { predictions, loading, ready, error, resetSession, getSessionToken } =
    usePlacesAutocomplete(inputValue, { enabled: !disabled && isGooglePlacesConfigured() })

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const handleInputChange = (event) => {
    const next = event.target.value
    setInputValue(next)
    setSelected(null)
    setLocalError(null)
    setOpen(true)
    onInputChange?.(next)
    onAddressSelect?.(null)
  }

  const handleSelectPrediction = async (prediction) => {
    setResolving(true)
    setLocalError(null)
    setOpen(false)

    try {
      const address = await fetchPlaceDetails(prediction.place_id, getSessionToken())
      if (!hasValidAddress(address)) {
        throw new Error('INVALID_ADDRESS')
      }
      if (!isAllowedZonaNorteAddress(address)) {
        addressAutocompleteLog.info('rejected prediction', {
          description: prediction.description,
          reason: 'outside_zona_norte_after_details',
          localidad: address.localidad,
        })
        throw new Error('OUTSIDE_ZONA_NORTE')
      }

      addressAutocompleteLog.info('accepted prediction', {
        description: prediction.description,
        localidad: address.localidad,
        stage: 'confirmed',
      })

      setInputValue(address.direccion_texto)
      setSelected(address)
      onInputChange?.(address.direccion_texto)
      onAddressSelect?.(address)
      resetSession()
    } catch (selectError) {
      addressAutocompleteLog.error('place details failed', {
        message: selectError?.message ?? String(selectError),
      })
      setLocalError(
        selectError?.message === 'OUTSIDE_ZONA_NORTE'
          ? 'Esa dirección está fuera de Zona Norte. Elegí una calle de San Fernando, Tigre, San Isidro, Vicente López o municipios cercanos.'
          : 'No pudimos confirmar esa dirección. Probá otra sugerencia.',
      )
      setSelected(null)
      onAddressSelect?.(null)
    } finally {
      setResolving(false)
    }
  }

  const configured = isGooglePlacesConfigured()
  const showSuggestions = open && configured && ready && predictions.length > 0

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2">
      {label && (
        <label htmlFor={listId} className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
          {required ? ' *' : ''}
        </label>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border bg-white transition-colors ${
          selected
            ? 'border-progress shadow-[0_0_0_1px_rgba(34,197,94,0.35)]'
            : 'border-border focus-within:border-ink'
        }`}
      >
        <FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id={listId}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled || resolving}
          autoComplete="street-address"
          className="w-full bg-transparent py-4 pl-11 pr-4 text-base text-ink outline-none placeholder:text-gray-300"
        />
      </div>

      {!configured && (
        <p className="text-xs text-amber-700">
          Autocomplete no configurado. Agregá VITE_GOOGLE_MAPS_API_KEY al entorno.
        </p>
      )}

      {(helperText || selected?.localidad) && (
        <p className="text-xs leading-5 text-muted">
          {selected?.localidad
            ? `Confirmada: ${selected.localidad}${selected.provincia ? `, ${selected.provincia}` : ''}`
            : helperText}
        </p>
      )}

      {(localError || error) && (
        <p className="text-xs font-medium text-red-600">{localError ?? error}</p>
      )}

      {showSuggestions && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%-0.25rem)] z-30 mt-2 max-h-64 overflow-auto rounded-2xl border border-border bg-white p-2 shadow-xl"
        >
          {predictions.map((prediction) => (
            <li key={prediction.place_id}>
              <button
                type="button"
                role="option"
                onClick={() => handleSelectPrediction(prediction)}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <FaLocationDot className="mt-0.5 shrink-0 text-progress" />
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    {prediction.structured_formatting?.main_text ?? prediction.description}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {prediction.structured_formatting?.secondary_text ?? prediction.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {(loading || resolving) && (
        <p className="text-xs text-muted">
          {resolving ? 'Confirmando dirección…' : 'Buscando en Zona Norte…'}
        </p>
      )}

      {open && configured && ready && !loading && inputValue.trim().length >= 3 && predictions.length === 0 && (
        <p className="text-xs text-muted">
          No encontramos direcciones en Zona Norte para esa búsqueda.
        </p>
      )}
    </div>
  )
}
