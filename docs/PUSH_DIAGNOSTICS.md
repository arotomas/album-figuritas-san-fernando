# Push — Diagnóstico deploy 5ae7609+

## Checklist rápido

| # | Qué verificar | Cómo |
|---|---------------|------|
| 1 | Suscripción renovada tras reactivar | `last_seen_at` / `updated_at` recientes en lookup admin |
| 2 | Endpoint no viejo | Comparar `endpoint_tail` antes/después de reactivar |
| 3 | `send-push-test` usa endpoint activo | Panel admin → deliveries con mismo `endpoint_tail` que lookup |
| 4 | webpush sin error | deliveries muestran HTTP 201; logs Edge Function |
| 5 | SW recibe push cerrado | `chrome://inspect` → `[PUSH_SW] push event received` |
| 6 | OK backend pero SW silencioso | HTTP 201 + sin log SW → problema cliente/SW, no backend |

## 1–2. Suscripción en Supabase

Tras reactivar en el celular (**Opciones → desactivar → activar**):

```sql
-- Reemplazar USER_ID
select
  id,
  right(endpoint, 40) as endpoint_tail,
  platform,
  is_active,
  last_seen_at,
  updated_at,
  created_at
from public.push_subscriptions
where user_id = 'USER_ID'
order by last_seen_at desc;
```

**Esperado tras reactivar (5ae7609+):**
- `is_active = true`
- `last_seen_at` y `updated_at` dentro de los últimos minutos
- Si `endpoint_tail` cambió → suscripción nueva (ideal tras fix SW)
- Si no cambió pero `updated_at` sí → mismo endpoint FCM, keys refrescadas (válido)

**Señal de endpoint viejo:** `last_seen_at` de hace días y el usuario dice que reactivó hoy → no corrió `upsert_push_subscription`.

## 3–4. send-push-test + webpush

1. Aplicar migración `023_push_lookup_device_details.sql`
2. Redeploy: `supabase functions deploy send-push-test`
3. Admin → **Buscar** celular → ver bloque **Suscripciones en Supabase**
4. **Enviar prueba** → bloque **Resultado webpush (diagnóstico)**

Interpretación:

| deliveries | Significado |
|------------|-------------|
| HTTP 201, status `sent` | FCM/APNs aceptó el mensaje para ese endpoint |
| HTTP 410/404 | Suscripción expirada → se desactiva en Supabase automáticamente |
| HTTP 401/403 | VAPID mal configurado |
| Varios devices, mix sent/failed | Quedan endpoints viejos activos; reactivar o limpiar |

Logs en Supabase Dashboard → Edge Functions → `send-push-test`:

```
[send-push-test] sending { user_id, device_count, endpoints }
[send-push-test] webpush OK { subscription_id, endpoint_tail, http_status: 201 }
[send-push-test] webpush FAILED { ..., http_status, error, deactivated: true }
```

## 5. Service worker con app cerrada

Solo observable en el dispositivo:

**Android**
1. Celular por USB, depuración USB activa
2. PC: Chrome → `chrome://inspect/#devices`
3. Abrir la PWA una vez (instala SW `5ae7609+`)
4. Cerrar la PWA por completo
5. Enviar prueba desde admin
6. En inspect → **Service Workers** → inspeccionar → Console

Logs esperados:
```
[PUSH_SW] push event received { hasData: true }
[PUSH_SW] showNotification called { title, tag }
```

**iOS:** no hay remote debug del SW; verificar notificación en pantalla de bloqueo.

## 6. Backend OK pero SW no recibe

Si `deliveries` = HTTP 201 y no hay `[PUSH_SW] push event received`:

| Causa probable | Acción |
|----------------|--------|
| SW viejo (pre-5ae7609) | Actualizar PWA (ver abajo) |
| PWA abierta en browser tab, no standalone | Probar desde ícono instalado |
| Suscripción de otro dispositivo/navegador | Comparar `endpoint_tail` lookup vs celular actual |
| Battery saver mata SW | Enviar con app en background (no foreground) |

Confirmar SW en producción:
```bash
curl -sS 'https://album-figuritas-san-fernando.vercel.app/sw.js' | head -c 200
# Debe empezar con push handlers + [PUSH_SW], no define(["./workbox
```

## Actualizar PWA instalada (post 5ae7609)

1. Abrir PWA desde ícono → esperar 10 s (auto-update SW)
2. **Opciones → Notificaciones → desactivar → activar**
3. Verificar en admin (Buscar) que `last_seen_at` sea reciente
4. Cerrar PWA → enviar prueba

## Limpieza manual de suscripciones muertas

```sql
update public.push_subscriptions
set is_active = false, updated_at = now()
where is_active = true
  and last_seen_at < now() - interval '30 days';
```
