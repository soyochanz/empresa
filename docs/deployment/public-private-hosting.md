# Landing en Hostinger y backend en Render

La entrada pública monta PublicApp; PrivateApp se importa para administración, portal y callbacks de pagos/autenticación. Render conserva `npm start` → `dist/server.cjs`, sus secretos, tareas y webhooks.

## Gateway público

Hostinger usa el preajuste Other (Express no ejecuta build en este panel), Node 22, raíz `./`, build `npm run build`, entrada `dist/gateway.cjs`.

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

Estado verificado el 13/10/2026: gateway desplegado en Hostinger, commit ed57317, entrada dist/gateway.cjs, salida dist. Runtime: «Althera public gateway ready». Vista previa HTTPS: https://green-crow-344589.hostingersite.com. Landing, /admin y /api/health responden con X-Althera-Gateway: public-v1; /server.cjs da 404. Acceso al portal renderizado correctamente. Prueba de webhook sin firma devuelve rechazo, sin generar eventos financieros.

DNS de producción SIN cambiar: raíz resuelve 216.24.57.18 y 216.24.57.16; www es CNAME althera.onrender.com. Hostinger indica IP 147.79.103.56. Su certificado para altherasolutions.com está caducado; renovación solicitada y pendiente. No activar DNS hasta validar HTTPS y las rutas privadas en ese dominio.

## Respuesta final de soporte (13/10/2026, 12:41 Asia/Dubai)

Nadya confirma que, para este Node.js gestionado, Hostinger requiere que el dominio apunte a Hostinger antes de instalar el certificado (también para el procedimiento de importación de certificados externos). No ofrece preaprovisionamiento para este caso. Su propuesta es cambiar DNS y esperar SSL automático. No se ejecuta: implica un posible intervalo sin HTTPS para panel/pagos/webhooks. Producción permanece en Render. El seguimiento automático del chat se desactiva al recibir esta respuesta. Para continuar sin ese intervalo se necesita otra ruta de alojamiento/TLS validada previamente; no se ha contratado ni modificado infraestructura adicional.

## Migración autorizada y activada (19/10/2026)

El usuario autoriza explícitamente una interrupción temporal de horas para completar la separación. Hostinger tiene desplegado d79aee88 con el gateway; Render conserva su servicio y configuración.

Cambios DNS aplicados: sustituido ALIAS `@ → althera.onrender.com` (TTL 14400) por A `@ → 147.79.103.56` (TTL 300); CNAME `www → altherasolutions.com` (TTL 300), antes `althera.onrender.com` (TTL 14400). Nameservers horizon/orbit y registros de correo intactos. Para rollback restaurar esos dos destinos anteriores; no retirar dominios de Render.

Verificado a las 09:05 UTC: HTTPS válido en raíz y `/en`, cabecera `X-Althera-Gateway: public-v1`; landing 200 en ~0,45 s. `/admin` carga el dashboard con la sesión existente. `/api/health` devuelve 200 desde Render; `/api/analytics/summary` sin sesión devuelve 401. Enlace existente `/p/8ebc75a1` devuelve 302 a Checkout Stripe. POST vacío sin firma a `/api/stripe/webhook` devuelve 400, sin evento financiero. `/server.cjs` devuelve 404. Tests locales de gateway, bytes firmados y clasificación de rutas pasan. No se efectuó un cobro real ni se modificaron endpoints/secretos Stripe.

Pendiente a las 09:06 UTC: el certificado nuevo cubre solo `altherasolutions.com`; `www` falla validación de nombre. Solicitado a soporte Hostinger en el chat existente emitir cobertura para www manteniendo raíz activa. No considerar la migración completamente cerrada hasta verificar también www con validación TLS normal. Puede persistir caché DNS del destino anterior durante su TTL previo.

09:11 UTC: Hostinger Agente confirma www como alias reservado y que necesita reemisión del certificado principal con ambos SAN. Intento de alta como subdominio rechazado, sin cambios. Escalado a revisión humana y enviada nota técnica. Reactivado seguimiento `seguir-soporte-hostinger-ssl` cada 5 minutos para completar y verificar www; desactivarlo al resolver. Raíz/panel/backend permanecen funcionales. No hay cargos de prueba.

09:23 UTC: Shelvi respondió con recomendaciones de caché porque la web abre desde soporte. Se verificó de nuevo www contra 147.79.103.56 usando curl --resolve y SNI: sigue error 60; SAN únicamente raíz. Enviada evidencia reproducible al chat y petición de verificar www específicamente y reemitir. Seguimiento permanece activo; sin cambios de configuración.

10:10 UTC: Augustinas (soporte humano, respuesta 10:04 UTC) acusa recibo y revisa asociación SSL del alias. Revalidación: raíz HTTPS 200 con gateway public-v1; www sigue error TLS 60. Enviada comprobación actual y reiterada corrección de SSL/vhost sin modificar aplicación, Render, correo ni DNS. Pendiente resolución técnica; seguimiento activo.

## Migración cerrada (19/10/2026, 10:27 UTC)

HTTPS de raíz y www verificado con validación TLS normal, tanto por DNS como contra 147.79.103.56 con SNI. Certificado ahora incluye SAN DNS:altherasolutions.com y DNS:www.altherasolutions.com. Ambos devuelven 200. Panel /admin y /api/health 200; health en www 200; enlace existente /p/8ebc75a1 devuelve 302; webhook sin firma rechaza con 400. Sin cargos ni eventos financieros reales. Confirmada resolución a Augustinas y pausado el seguimiento automático. Render, secretos, correo y endpoints Stripe intactos.
