# Avisos de cobros en el móvil

En Próximos cobros → Avisos de cobros en tu móvil, activar «Pagos y enlaces de Stripe» y guardar. En iPhone se hace desde la app añadida a pantalla de inicio (iOS 16.4+). El permiso del dispositivo requiere un toque del usuario. Se puede enviar una prueba sin generar cobros.

Preferencias por dispositivo y administrador: agenda matinal y cambios de pagos son independientes. Se notifica desde la activación, no se importa el historial. Solo se admiten eventos firmados/verificados de Stripe pertenecientes a Althera por metadata CRM/webOffer, no traspasos ni productos ajenos.

Eventos: checkout.session.completed (solo paid), async_payment_succeeded, async_payment_failed, expired; invoice.paid/payment_succeeded/payment_failed; payment_intent.payment_failed para Checkout de tarjeta de un solo pago. Los intentos de suscripción se notifican desde invoice.payment_failed. Se excluyen enlaces eliminados/reemplazados intencionadamente.

Cola privada payment_push_deliveries: clave por pago/factura y dispositivo, claims atómicos con lease de 2 minutos y reintentos durante 7 días. Las notificaciones usan un tag estable por aviso; como cualquier transporte push, no garantiza entrega exactamente una vez si el proceso cae tras enviar y antes de confirmar. Baja/retirada del permiso admin comprobadas antes del envío; endpoints 404/410 se retiran. Sin datos financieros offline.

Aplicado docs/payment-push.sql en Althera czyrolmczcwtexxgxzrg. Cron autenticado cada minuto al backend Render; latencia depende de arranque del servidor y dispositivo. RLS activa y permisos anon/auth revocados. Webhook we_1U8eqURoCyq5J2NtFSlHaHTR mantiene URL y API 2024-04-10, ampliado de 6 a 10 eventos. Ningún cargo real usado en pruebas.

Pruebas: scripts/test-payment-alerts.ts cubre estado confirmado, claves compartidas factura/Checkout, exclusión de sustituciones, opt-in temporal, opt-out y productos ajenos. También verifica codificación JSONB del filtro de facturas; arrays JS en contains se serializan como array PostgreSQL y provocaban «invalid input syntax for type json».
