import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminErrorBanner, formatDate } from '../../components/admin/adminShared'
import { EmojiTextField } from '../../components/admin/EmojiTextField'
import {
  formatPushHistoryTitle,
  formatPushStatus,
  getDestinationLabel,
  PUSH_DESTINATIONS,
} from '../../config/pushNotificationIcons'
import {
  fetchPushAdminStats,
  fetchPushNotificationHistory,
  lookupPushTestRecipient,
  sendPushBroadcast,
  sendPushTest,
  deactivateAllPushSubscriptionsForUser,
} from '../../services/supabase/pushAdmin'
import { getArgentineMobileValidation } from '../../utils/argentinePhone'
import { isSuperAdminProfile } from '../../utils/roles'
import { useAppStore } from '../../store/useAppStore'

const DEFAULT_FORM = {
  title: '',
  body: '',
  destination: 'map',
}

function StatsCard({ label, value, loading }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black text-ink">{loading ? '…' : value.toLocaleString('es-AR')}</p>
    </div>
  )
}

function ConfirmModal({ open, title, message, confirmLabel, busy, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-progress px-4 py-2 text-sm font-bold text-ink disabled:opacity-60"
          >
            {busy ? 'Enviando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryDetailModal({ item, onClose }) {
  if (!item) return null

  const status = formatPushStatus(item.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-ink">{formatPushHistoryTitle(item)}</h3>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted">
            Cerrar
          </button>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="font-bold text-muted">Mensaje</dt>
            <dd className="mt-1 text-ink">{item.body}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Destino</dt>
            <dd className="mt-1 text-ink">{getDestinationLabel(item.destination)}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Enviado por</dt>
            <dd className="mt-1 text-ink">{item.sent_by_username || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Fecha</dt>
            <dd className="mt-1 text-ink">{formatDate(item.created_at)}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Destinatarios</dt>
            <dd className="mt-1 text-ink">{item.recipient_count}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Estado</dt>
            <dd className="mt-1 text-ink">
              {status.tone === 'success' && '🟢 '}
              {status.tone === 'warning' && '🟡 '}
              {status.tone === 'error' && '🔴 '}
              {status.label}
              {item.failure_count > 0 ? ` (${item.success_count} ok / ${item.failure_count} error)` : ''}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export function AdminPushNotificationsPage() {
  const supabaseProfile = useAppStore((state) => state.supabaseProfile)
  const isSuperAdmin = isSuperAdminProfile(supabaseProfile)

  const [form, setForm] = useState(DEFAULT_FORM)
  const [stats, setStats] = useState({
    registeredUsers: 0,
    subscribedUsers: 0,
    subscribedDevices: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [formMessage, setFormMessage] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [testPhone, setTestPhone] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupError, setLookupError] = useState(null)
  const [testSendMessage, setTestSendMessage] = useState(null)
  const [testSendError, setTestSendError] = useState(null)
  const [testDeliveries, setTestDeliveries] = useState(null)
  const [searching, setSearching] = useState(false)
  const [testing, setTesting] = useState(false)
  const [cleanupBusy, setCleanupBusy] = useState(false)
  const [cleanupMessage, setCleanupMessage] = useState(null)

  const previewTitle = useMemo(() => form.title.trim(), [form.title])
  const phoneValidation = useMemo(() => getArgentineMobileValidation(testPhone), [testPhone])
  const canSearchPhone = Boolean(phoneValidation?.valid)
  const canSendTest =
    Boolean(lookupResult?.ok) && Number(lookupResult?.active_devices ?? 0) > 0 && !searching && !testing

  const loadAll = useCallback(async () => {
    if (!isSuperAdmin) return
    setError(null)
    setStatsLoading(true)
    setHistoryLoading(true)
    try {
      const [nextStats, nextHistory] = await Promise.all([
        fetchPushAdminStats(),
        fetchPushNotificationHistory(),
      ])
      setStats(nextStats)
      setHistory(nextHistory)
    } catch (loadError) {
      setError(loadError?.message ?? 'No pudimos cargar el panel de push.')
    } finally {
      setStatsLoading(false)
      setHistoryLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const validateForm = () => {
    if (!form.title.trim()) return 'Ingresá un título.'
    if (!form.body.trim()) return 'Ingresá un mensaje.'
    return null
  }

  const buildPayload = () => ({
    title: form.title.trim(),
    body: form.body.trim(),
    destination: form.destination,
  })

  const resetTestLookup = () => {
    setLookupResult(null)
    setLookupError(null)
    setTestSendMessage(null)
    setTestSendError(null)
    setTestDeliveries(null)
  }

  const handleTestPhoneChange = (value) => {
    setTestPhone(value)
    resetTestLookup()
  }

  const handleSearchRecipient = async () => {
    if (!canSearchPhone) return

    setSearching(true)
    setLookupError(null)
    setLookupResult(null)
    setTestSendMessage(null)
    setTestSendError(null)
    setTestDeliveries(null)
    setCleanupMessage(null)

    try {
      const result = await lookupPushTestRecipient(testPhone)
      if (!result.ok && result.error === 'USER_NOT_FOUND') {
        setLookupError('No existe un usuario registrado con ese número.')
        return
      }
      if (!result.ok) {
        setLookupError('No pudimos buscar el número. Probá de nuevo.')
        return
      }
      setLookupResult(result)
      if (Number(result.active_devices ?? 0) === 0) {
        setLookupError('El usuario existe pero no tiene dispositivos suscritos.')
      }
    } catch (searchError) {
      setLookupError(searchError?.message ?? 'No pudimos buscar el número.')
    } finally {
      setSearching(false)
    }
  }

  const handleTestSend = async () => {
    const validationError = validateForm()
    if (validationError) {
      setTestSendError(validationError)
      return
    }
    if (!canSendTest) return

    setTesting(true)
    setTestSendError(null)
    setTestSendMessage(null)
    setTestDeliveries(null)
    try {
      const result = await sendPushTest({
        ...buildPayload(),
        local_phone: testPhone,
      })
      setTestDeliveries(result.deliveries ?? null)
      setTestSendMessage(
        result.message ??
          `Prueba enviada correctamente a ${result.device_count} dispositivo(s) (${result.success_count} ok).`,
      )
    } catch (testError) {
      setTestSendError(testError?.message ?? 'No pudimos enviar la prueba.')
    } finally {
      setTesting(false)
    }
  }

  const handleDeactivateAllSubscriptions = async () => {
    if (!lookupResult?.ok || !lookupResult.user_id) return

    setCleanupBusy(true)
    setCleanupMessage(null)
    setLookupError(null)
    try {
      const result = await deactivateAllPushSubscriptionsForUser(lookupResult.user_id)
      if (!result.ok) {
        setLookupError('No pudimos desactivar las suscripciones.')
        return
      }
      setCleanupMessage(
        `Desactivadas ${Number(result.deactivated_count ?? 0).toLocaleString('es-AR')} suscripción(es). El usuario debe renovar en el celular.`,
      )
      const refreshed = await lookupPushTestRecipient(testPhone)
      if (refreshed.ok) {
        setLookupResult(refreshed)
      }
      setTestDeliveries(null)
      setTestSendMessage(null)
    } catch (cleanupError) {
      setLookupError(cleanupError?.message ?? 'No pudimos desactivar las suscripciones.')
    } finally {
      setCleanupBusy(false)
    }
  }

  const handleConfirmBroadcast = async () => {
    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      setConfirmOpen(false)
      return
    }

    setSending(true)
    setFormError(null)
    setFormMessage(null)
    try {
      const result = await sendPushBroadcast(buildPayload())
      setConfirmOpen(false)
      setFormMessage(
        `Notificación enviada a ${result.recipient_count} dispositivos (${result.success_count} ok).`,
      )
      setForm(DEFAULT_FORM)
      await loadAll()
    } catch (sendError) {
      setFormError(sendError?.message ?? 'No pudimos enviar la notificación.')
      setConfirmOpen(false)
    } finally {
      setSending(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-ink">No tenés permisos</h1>
        <p className="mt-2 text-sm text-muted">
          Las notificaciones push están disponibles solo para Super Administradores.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Comunicación</p>
        <h1 className="mt-1 text-3xl font-black text-ink">📢 Notificaciones Push</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Envío manual global a todos los dispositivos suscritos. El historial queda registrado
          permanentemente como auditoría.
        </p>
      </div>

      {error && <AdminErrorBanner message={error} />}

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="Usuarios registrados" value={stats.registeredUsers} loading={statsLoading} />
        <StatsCard label="Usuarios suscritos" value={stats.subscribedUsers} loading={statsLoading} />
        <StatsCard label="Dispositivos suscritos" value={stats.subscribedDevices} loading={statsLoading} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          className="space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault()
            const validationError = validateForm()
            if (validationError) {
              setFormError(validationError)
              return
            }
            setConfirmOpen(true)
          }}
        >
          <EmojiTextField
            id="push-title"
            label="Título"
            value={form.title}
            onChange={(title) => setForm((current) => ({ ...current, title }))}
            maxLength={120}
            placeholder="📢 Comunicado importante"
            helperText="Usá el botón 😀 para insertar cualquier emoji en la posición del cursor."
          />

          <EmojiTextField
            id="push-body"
            label="Mensaje"
            value={form.body}
            onChange={(body) => setForm((current) => ({ ...current, body }))}
            maxLength={500}
            placeholder="🚲 Nueva figurita disponible en el mapa."
            multiline
            rows={4}
          />

          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-wide text-muted">Abrir al tocar</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {PUSH_DESTINATIONS.map((dest) => (
                <label key={dest.key} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="push-destination"
                    value={dest.key}
                    checked={form.destination === dest.key}
                    onChange={() => setForm((current) => ({ ...current, destination: dest.key }))}
                  />
                  {dest.label}
                </label>
              ))}
            </div>
          </fieldset>

          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}
          {formMessage && (
            <p className="text-sm text-emerald-700" role="status">
              {formMessage}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-progress px-5 py-2.5 text-sm font-black uppercase tracking-wide text-ink disabled:opacity-50"
            >
              Enviar notificación
            </button>
          </div>
        </form>

        <aside className="rounded-2xl border border-border bg-slate-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Vista previa</p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-ink">{previewTitle || '—'}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {form.body.trim() || 'El mensaje aparecerá aquí.'}
            </p>
            <p className="mt-4 text-xs font-semibold text-muted">
              Destino: {getDestinationLabel(form.destination)}
            </p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            La vista previa muestra el título y mensaje exactamente como los verá el usuario.
          </p>
        </aside>
      </div>

      <section className="space-y-5 rounded-2xl border border-border bg-slate-50 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-ink">Enviar prueba</h2>
          <p className="mt-1 text-sm text-muted">
            Buscá un usuario por celular y enviá una prueba a sus dispositivos. No se registra en el
            historial de campañas.
          </p>
        </div>

        <div>
          <label htmlFor="push-test-phone" className="text-xs font-bold uppercase tracking-wide text-muted">
            Número para prueba
          </label>
          <div className="mt-2 flex max-w-md">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-border bg-white px-4 py-3 text-sm font-semibold text-muted">
              +54 9
            </span>
            <input
              id="push-test-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={testPhone}
              onChange={(event) => handleTestPhoneChange(event.target.value)}
              className="w-full rounded-r-xl border border-border bg-white px-4 py-3 text-sm text-ink"
              placeholder="11 3456 7890"
            />
          </div>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-muted">
            Ingresá el número desde el código de área.
            <br />
            No escribas +54.
            <br />
            Ejemplo: 11 3456 7890
          </p>
          {phoneValidation && (
            <p
              className={`mt-2 text-sm font-medium ${phoneValidation.valid ? 'text-emerald-700' : 'text-red-600'}`}
              role="status"
            >
              {phoneValidation.valid ? '✅' : '❌'} {phoneValidation.message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSearchRecipient()}
            disabled={!canSearchPhone || searching || testing}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {lookupError && (
          <p className="text-sm text-red-600" role="alert">
            ❌ {lookupError}
          </p>
        )}

        {lookupResult?.ok && (
          <div className="max-w-md rounded-xl border border-border bg-white p-4 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Usuario encontrado</p>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="font-semibold text-muted">Nombre</dt>
                <dd className="text-ink">{lookupResult.full_name?.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">Email</dt>
                <dd className="text-ink">{lookupResult.email?.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">Dispositivos activos</dt>
                <dd className="text-ink">{Number(lookupResult.active_devices ?? 0).toLocaleString('es-AR')}</dd>
              </div>
            </dl>
            {Array.isArray(lookupResult.devices) && lookupResult.devices.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Suscripciones en Supabase</p>
                {lookupResult.devices.map((device) => (
                  <div key={device.id} className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed">
                    <p className="font-mono text-ink">…{device.endpoint_tail}</p>
                    <p className="mt-1 text-muted">
                      {device.platform || 'other'} · last_seen{' '}
                      {device.last_seen_at ? formatDate(device.last_seen_at) : '—'} · updated{' '}
                      {device.updated_at ? formatDate(device.updated_at) : '—'}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-muted">
                  Tras reactivar notificaciones en el celular, `last_seen_at` y `updated_at` deben ser recientes.
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => void handleDeactivateAllSubscriptions()}
                disabled={cleanupBusy || searching || testing}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 disabled:opacity-50"
              >
                {cleanupBusy ? 'Desactivando…' : 'Desactivar todas las suscripciones de este usuario'}
              </button>
            </div>
            {cleanupMessage && (
              <p className="mt-3 text-sm text-amber-800" role="status">
                {cleanupMessage}
              </p>
            )}
          </div>
        )}

        {testDeliveries?.length > 0 && (
          <div className="max-w-2xl rounded-xl border border-border bg-white p-4 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Resultado webpush (diagnóstico)</p>
            <ul className="mt-3 space-y-3">
              {testDeliveries.map((delivery) => (
                <li key={delivery.subscription_id} className="rounded-lg bg-slate-50 p-3 text-xs">
                  <p className="font-mono text-ink">{delivery.endpoint_tail}</p>
                  <p className="mt-1">
                    {delivery.status === 'sent' ? '🟢' : '🔴'} HTTP {delivery.http_status ?? '—'}
                    {delivery.deactivated ? ' · desactivada en Supabase' : ''}
                  </p>
                  {delivery.error && <p className="mt-1 text-red-700">{delivery.error}</p>}
                  <p className="mt-1 text-muted">
                    last_seen {delivery.last_seen_at ? formatDate(delivery.last_seen_at) : '—'}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Si HTTP es 201 pero el celular no muestra nada, inspeccioná el service worker (`[PUSH_SW] push event
              received`) con la app cerrada.
            </p>
          </div>
        )}

        {testSendError && (
          <p className="text-sm text-red-600" role="alert">
            ❌ {testSendError}
          </p>
        )}
        {testSendMessage && (
          <p className="text-sm text-emerald-700" role="status">
            ✅ {testSendMessage}
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={() => void handleTestSend()}
            disabled={!canSendTest}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {testing ? 'Enviando prueba…' : 'Enviar prueba'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-ink">📢 Historial de Notificaciones</h2>
        {historyLoading ? (
          <p className="mt-4 text-sm text-muted">Cargando historial…</p>
        ) : history.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Todavía no hay envíos registrados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Título</th>
                  <th className="px-3 py-2">Destino</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const status = formatPushStatus(item.status)
                  return (
                    <tr key={item.id} className="border-b border-border/70">
                      <td className="px-3 py-3 whitespace-nowrap">{formatDate(item.created_at)}</td>
                      <td className="px-3 py-3 font-medium text-ink">{formatPushHistoryTitle(item)}</td>
                      <td className="px-3 py-3">{getDestinationLabel(item.destination)}</td>
                      <td className="px-3 py-3">{item.sent_by_username || '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {status.tone === 'success' && '🟢 '}
                        {status.tone === 'warning' && '🟡 '}
                        {status.tone === 'error' && '🔴 '}
                        {status.label}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="text-sm font-semibold text-ink underline-offset-2 hover:underline"
                        >
                          👁 Ver detalle
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Confirmar envío"
        message={`¿Deseás enviar esta notificación a todos los usuarios? Se enviará a ${stats.subscribedDevices.toLocaleString('es-AR')} dispositivos suscritos.`}
        confirmLabel="Enviar"
        busy={sending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmBroadcast()}
      />

      <HistoryDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
    </div>
  )
}
