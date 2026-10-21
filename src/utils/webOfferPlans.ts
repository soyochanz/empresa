export const webOfferPlans = [
  { id: 'essential', name: 'Essential', price: 49, tagline: 'Tu primera gran impresión.', pages: 'Landing de una página', features: ['Diseño adaptado a tu negocio', 'Perfecta en móvil y ordenador', 'Formulario de contacto', 'SEO básico el primer mes'], featured: false },
  { id: 'business', name: 'Business', price: 80, tagline: 'Más espacio para crecer.', pages: 'Web con varias páginas', features: ['Todo lo incluido en Essential', 'Varias páginas para tus servicios', 'Panel de administración', 'SEO básico durante toda la suscripción'], featured: true },
  { id: 'professional', name: 'Professional', price: 112, tagline: 'Una marca que destaca.', pages: 'Web profesional personalizada', features: ['Diseño con mayor nivel de detalle', 'Panel de administración profesional', 'Tus imágenes, servicios y precios', 'SEO avanzado durante toda la suscripción'], featured: false },
] as const;
export type WebOfferPlan = typeof webOfferPlans[number]['id'];
export const getWebOfferPlan = (id: string) => webOfferPlans.find(plan => plan.id === id);
export const webOfferStatuses: Record<string, string> = { requested: 'Solicitud recibida', designing: 'En diseño', review: 'Demo preparada', changes: 'Cambios solicitados', approved: 'Aprobada · pago pendiente', active: 'Suscripción activa', past_due: 'Pago pendiente', canceled: 'Suscripción cancelada' };
