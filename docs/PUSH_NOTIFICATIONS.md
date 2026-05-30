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

Migración adicional para búsqueda por celular:

```bash
# Dashboard → SQL Editor → supabase/migrations/022_push_test_phone_lookup.sql
```

Secrets requeridos (automáticos en Supabase): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Permisos

Solo `profiles.role = 'super_admin'` puede:

- Ver menú y ruta `/admin/push-notifications`
- Llamar `get_push_admin_stats` y `lookup_push_test_recipient`
- Invocar `send-push-broadcast` y `send-push-test`

## 5. Prueba

1. Completar título y mensaje en el panel.
2. En **Enviar prueba**, ingresar celular desde el código de área (ej. `11 3456 7890`).
3. Pulsar **Buscar** → se muestra nombre, email y dispositivos activos del usuario.
4. Pulsar **Enviar prueba** → llega por Web Push a sus dispositivos suscritos (no SMS/WhatsApp).
5. Broadcast global → queda en historial auditable. Las pruebas no se registran ahí.

## 6. iOS

Push web requiere PWA instalada en pantalla de inicio (iOS 16.4+).
