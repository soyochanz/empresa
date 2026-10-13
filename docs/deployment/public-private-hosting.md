# Landing en Hostinger y backend en Render

La entrada pública monta PublicApp; PrivateApp se importa para administración, portal y callbacks de pagos/autenticación. Render conserva `npm start` → `dist/server.cjs`, sus secretos, tareas y webhooks.

## Gateway público

Hostinger usa Express, Node 22, raíz `./`, build `npm run build`, entrada `dist/gateway.cjs`.

- `/`, `/es`, `/en` y páginas legales: HTML y assets locales, sin esperar a Render.
- `/api/locale`: respuesta local con país si el proveedor suministra `cf-ipcountry`; sin esa cabecera se aplica el fallback de idioma del cliente.
- `/admin`, `/portal`, resto de rutas privadas, `/api/*`, `/p/*`, `/pago-confirmado` y callbacks Stripe: proxy HTTPS al servicio existente `https://althera.onrender.com`.
- Conserva método, ruta, query, autorización, cookies, status y redirecciones. Los cuerpos se transmiten sin parsear para preservar firmas Stripe. Las respuestas privadas no se cachean.
- No inicia tareas financieras ni necesita secretos de Stripe/Supabase en Hostinger.
- Bloquea bundles de servidor y sourcemaps.

El dominio público y los enlaces existentes permanecen iguales. No retirar los dominios de Render durante la migración. No cambiar endpoints de Stripe ni generar cobros de prueba en producción.

## Validación

`pnpm exec tsx scripts/test-public-gateway.ts` verifica contra un servidor local: landing con backend caído, proxy de rutas privadas y callbacks, cookies múltiples, autorización, redirects de enlaces y webhook firmado con Stripe usando un secreto local de prueba. `pnpm exec tsx scripts/test-public-entry.ts` comprueba clasificación de rutas. Ejecutar también `pnpm lint` y `pnpm build`.

## Activación y recuperación

Antes de cambiar DNS: desplegar Hostinger, comprobar entrada gateway, HTTPS y proxy por el destino de prueba disponible. Guardar registros DNS anteriores. Después, verificar el dominio público y las rutas privadas sin generar transacciones.

Si falla la validación, mantener/restaurar los registros DNS originales hacia Render. La aplicación Render sigue intacta; el nuevo bundle gateway no cambia su comando de arranque.

Estado de infraestructura: pendiente de validación del despliegue Hostinger y cambio DNS.
