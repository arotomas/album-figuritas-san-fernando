# Push Notifications — Setup

## 1. Migración SQL

Ejecutar en Supabase:

```bash
# Dashboard → SQL Editor → supabase/migrations/021_push_notifications.sql
```

## 2. VAPID keys

```bash
npm run vapid:generate
```

- **Pública** → `VITE_VAPID_PUBLIC_KEY` en Vercel / `.env.local`
- **Privada** → secret `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en Supabase Edge Functions
- **Subject** → `VAPID_SUBJECT=mailto:tu-email@dominio.com`

## 3. Edge Functions

```bash
supabase functions deploy send-push-broadcast
supabase functions deploy send-push-test
```

Secrets requeridos (automáticos en Supabase): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Permisos

Solo `profiles.role = 'super_admin'` puede:

- Ver menú y ruta `/admin/push-notifications`
- Llamar `get_push_admin_stats`
- Invocar `send-push-broadcast` y `send-push-test`

## 5. Prueba

1. Super admin activa notificaciones en la app (Opciones o banner).
2. Panel → **Enviar prueba a mi dispositivo**.
3. Broadcast global → queda en historial auditable.

## 6. iOS

Push web requiere PWA instalada en pantalla de inicio (iOS 16.4+).
