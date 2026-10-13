# Separación de landing y panel

Estado: código separado; alojamiento y DNS todavía SIN cambiar.

## Cambio aplicado

La entrada pública (`/`, `/es`, `/en` y las páginas legales) monta PublicApp directamente. No monta App, su sincronización de CRM, autenticación ni DatabaseMutationOverlay. PrivateApp se importa al entrar a las rutas privadas. Los callbacks de autenticación y Stripe conservan la entrada original.

El formulario importa el cliente de datos al enviar. Los logos de colaboradores se consultan al aproximarse al portfolio. No se han cambiado políticas de base de datos, triggers, webhooks ni tareas del servidor.

Build verificado: entrada JS 417.59 kB (134.39 kB gzip), antes aproximadamente 3386 kB. El HTML no precarga PrivateApp ni supabaseClient; ambas importaciones son dinámicas. CSS compartido permanece en el bundle público.

## Cambio de alojamiento pendiente

El dominio público responde actualmente con `x-render-origin-server: Render`. Mientras el HTML salga de ese servicio, la pantalla de arranque de Render puede aparecer antes de ejecutar JavaScript. La separación del bundle no resuelve ese arranque de infraestructura.

Destino propuesto:
- altherasolutions.com: archivos públicos servidos desde alojamiento estático en Hostinger.
- admin.altherasolutions.com: servicio Render existente, con panel, API, reconciliación y webhooks.

Antes del cambio DNS, comprobar en los paneles reales el alojamiento disponible, el nombre del servicio Render y la configuración de dominio/TLS. No se ha inventado una IP ni un destino onrender.com.

Orden de migración:
1. Añadir y verificar el subdominio de administración en Render y DNS, sin retirar el dominio actual.
2. Preparar alojamiento estático y fallback SPA para idiomas y páginas legales. Reemplazar __APP_ORIGIN__ en el HTML por el origen público, puesto que Express ya no lo interpolará.
3. Configurar el enlace de área privada y las rutas antiguas de administración/comerciales al nuevo origen.
4. Mantener un proxy para las rutas API y enlaces de pago existentes o migrar sus consumidores de forma coordinada. Los POST de Stripe necesitan un endpoint operativo, no una redirección HTML. Revisar URLs generadas, APP_URL y callbacks de autenticación antes de cambiar el origen.
5. Mantener /api/locale y /api/analytics/track operativos en el origen público (o configurar sus destinos). La detección por país requiere cabecera fiable del alojamiento; no basta con idioma del navegador.
6. Probar landing con Render sin disponibilidad; probar login, formulario, enlaces de pago existentes y entrega de webhooks sin generar cobros reales.
7. Cambiar DNS público y verificar HTTPS, rutas legales y recursos. Conservar la configuración anterior para rollback.

No publicar dist/server.cjs ni su sourcemap en el directorio público de Hostinger: solo archivos de frontend.
