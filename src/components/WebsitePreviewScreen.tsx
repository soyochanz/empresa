import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Instagram, MapPin, MessageCircle, Phone, Star, TrendingUp } from 'lucide-react';
import { ClientContact } from '../types';
import { db } from '../supabaseClient';

export type DemoWebsiteTemplate = 'peluqueria' | 'restaurante' | 'mantenimiento';

export interface DemoWebsiteConfig {
  template: DemoWebsiteTemplate;
  businessName: string;
  brandColor: string;
  logoUrl: string;
  bannerUrl: string;
  address: string;
  phone: string;
  headline: string;
  subtitle: string;
}

export const TEMPLATE_DEFAULTS: Record<DemoWebsiteTemplate, Omit<DemoWebsiteConfig, 'businessName' | 'brandColor' | 'logoUrl' | 'bannerUrl' | 'address' | 'phone'>> = {
  peluqueria: {
    template: 'peluqueria',
    headline: 'Belleza, estilo y agenda llena desde el primer vistazo',
    subtitle: 'Una web premium para mostrar trabajos reales, capturar reservas y convertir visitantes en clientas recurrentes.'
  },
  restaurante: {
    template: 'restaurante',
    headline: 'Una experiencia digital que abre el apetito y llena mesas',
    subtitle: 'Carta visual, reservas fluidas, reseñas destacadas y una presencia online preparada para vender cada servicio.'
  },
  mantenimiento: {
    template: 'mantenimiento',
    headline: 'Confianza inmediata para reparaciones, urgencias y mantenimientos',
    subtitle: 'Una web clara, rapida y profesional para generar llamadas, presupuestos y solicitudes desde cualquier dispositivo.'
  }
};

export const TEMPLATE_BANNERS: Record<DemoWebsiteTemplate, string> = {
  peluqueria: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=88',
  restaurante: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=88',
  mantenimiento: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=88'
};

const TEMPLATE_GALLERY: Record<DemoWebsiteTemplate, string[]> = {
  peluqueria: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=700&q=82'
  ],
  restaurante: [
    'https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=82'
  ],
  mantenimiento: [
    'https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=700&q=82',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=700&q=82'
  ]
};

const TEMPLATE_SERVICES: Record<DemoWebsiteTemplate, string[]> = {
  peluqueria: ['Reserva online 24/7', 'Portfolio de color y peinado', 'Promos y bonos recurrentes'],
  restaurante: ['Reservas y eventos', 'Carta visual editable', 'Pedidos y experiencias privadas'],
  mantenimiento: ['Urgencias con llamada directa', 'Presupuestos online', 'Seguimiento de servicios']
};

export const parseDemoWebsiteConfig = (contact: ClientContact | null): DemoWebsiteConfig => {
  const fallbackTemplate: DemoWebsiteTemplate = 'peluqueria';
  const fallbackBusinessName = contact?.company || contact?.name || 'Empresa local';
  const base: DemoWebsiteConfig = {
    ...TEMPLATE_DEFAULTS[fallbackTemplate],
    businessName: fallbackBusinessName,
    brandColor: contact?.color === 'emerald' ? '#10b981' : contact?.color === 'amber' ? '#f59e0b' : contact?.color === 'rose' ? '#f43f5e' : '#8b5cf6',
    logoUrl: contact?.avatarUrl || '',
    bannerUrl: TEMPLATE_BANNERS[fallbackTemplate],
    address: contact?.location || 'Direccion pendiente',
    phone: contact?.phone || ''
  };

  if (!contact?.devWebsiteConfig) return base;

  try {
    return { ...base, ...JSON.parse(contact.devWebsiteConfig) };
  } catch {
    return base;
  }
};

interface WebsitePreviewScreenProps {
  contactId: string;
  contacts?: ClientContact[];
  onBack?: () => void;
}

export default function WebsitePreviewScreen({ contactId, contacts = [], onBack }: WebsitePreviewScreenProps) {
  const [loadedContact, setLoadedContact] = useState<ClientContact | null>(contacts.find(c => c.id === contactId) || null);
  const [loading, setLoading] = useState(!loadedContact);

  useEffect(() => {
    const existing = contacts.find(c => c.id === contactId);
    if (existing) {
      setLoadedContact(existing);
      setLoading(false);
      return;
    }

    let mounted = true;
    db.getContacts()
      .then(list => {
        if (mounted) setLoadedContact(list.find(c => c.id === contactId) || null);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [contactId, contacts]);

  const config = useMemo(() => parseDemoWebsiteConfig(loadedContact), [loadedContact]);
  const services = TEMPLATE_SERVICES[config.template];
  const gallery = TEMPLATE_GALLERY[config.template];
  const accentStyle = { '--accent': config.brandColor } as React.CSSProperties;

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center text-sm">Cargando demo...</div>;
  }

  if (!loadedContact) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Demo no encontrada</h1>
        <p className="text-slate-400 text-sm max-w-md">El enlace no coincide con ningun cliente disponible.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white overflow-hidden" style={accentStyle}>
      <style>{`
        @keyframes floatIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .demo-reveal { animation: floatIn .75s ease both; }
      `}</style>

      <section
        className="min-h-[92vh] flex flex-col bg-cover bg-center relative"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.86), rgba(0,0,0,.50), rgba(0,0,0,.12)), url(${config.bannerUrl})` }}
      >
        <nav className="relative z-10 flex items-center justify-between px-5 sm:px-10 py-5 border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white text-neutral-950 flex items-center justify-center overflow-hidden font-black shrink-0 shadow-xl">
              {config.logoUrl ? <img src={config.logoUrl} alt={config.businessName} className="w-full h-full object-cover" /> : config.businessName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-black text-lg truncate block">{config.businessName}</span>
              <span className="text-[11px] text-white/60">Demo premium preparada por Althera</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-5 text-xs font-bold text-white/80">
            <a href="#galeria">Galeria</a>
            <a href="#reviews">Reviews</a>
            <a href="#gestion">Gestion</a>
          </div>
          {onBack && (
            <button onClick={onBack} className="hidden sm:flex items-center gap-2 text-xs bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          )}
        </nav>

        <div className="relative z-10 flex-1 grid lg:grid-cols-[1.1fr_.9fr] gap-8 items-center px-5 sm:px-10 py-12">
          <div className="max-w-3xl space-y-7 demo-reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
              <Star className="w-4 h-4" style={{ color: config.brandColor }} />
              Demo personalizada para {loadedContact.name}
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black leading-[0.94] tracking-tight">{config.headline}</h1>
              <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">{config.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={config.phone ? `tel:${config.phone}` : '#'} className="px-5 py-3 rounded-xl text-sm font-black text-neutral-950 shadow-xl" style={{ backgroundColor: config.brandColor }}>
                Llamar ahora
              </a>
              <a href="#contacto" className="px-5 py-3 rounded-xl text-sm font-bold bg-white/10 border border-white/15 hover:bg-white/15">
                Pedir presupuesto
              </a>
            </div>
          </div>

          <div className="demo-reveal hidden lg:block" style={{ animationDelay: '.15s' }}>
            <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-4 shadow-2xl rotate-1">
              <div className="grid grid-cols-2 gap-3">
                {gallery.map((img, index) => (
                  <img key={img} src={img} alt="" className={`w-full object-cover rounded-2xl ${index === 0 ? 'h-56' : 'h-40'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-10 bg-white text-neutral-950">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-4">
          {[
            ['4.9/5', 'Valoracion media en Google'],
            ['24/7', 'Reservas o solicitudes activas'],
            ['+38%', 'Mas conversion desde movil']
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-neutral-200 p-5 bg-neutral-50">
              <p className="text-3xl font-black" style={{ color: config.brandColor }}>{value}</p>
              <p className="text-sm text-neutral-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="galeria" className="px-5 sm:px-10 py-16 bg-neutral-950">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black">Grid estilo Instagram</h2>
              <p className="text-slate-400 text-sm mt-2">Contenido visual preparado para enseñar trabajos, platos, proyectos o resultados reales.</p>
            </div>
            <Instagram className="w-7 h-7" style={{ color: config.brandColor }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gallery.concat(gallery.slice(0, 2)).map((img, index) => (
              <img key={`${img}-${index}`} src={img} alt="" className="aspect-square rounded-2xl object-cover border border-white/10 hover:scale-[1.02] transition-transform duration-300" />
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-16 bg-white text-neutral-950">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
          {services.map((service, index) => (
            <article key={service} className="border border-neutral-200 rounded-2xl p-6 bg-white shadow-sm demo-reveal" style={{ animationDelay: `${index * 90}ms` }}>
              <CheckCircle2 className="w-6 h-6 mb-5" style={{ color: config.brandColor }} />
              <h2 className="font-black text-xl">{service}</h2>
              <p className="text-sm text-neutral-600 mt-3">Seccion editable con fotos, texto comercial, CTA y medicion preparada para captar clientes.</p>
            </article>
          ))}
        </div>
      </section>

      <section id="reviews" className="px-5 sm:px-10 py-16 bg-neutral-100 text-neutral-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black mb-6">Reviews de Google destacadas</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {['Servicio impecable y rapido.', 'Reservar fue facilisimo desde el movil.', 'La web transmite muchisima confianza.'].map((text, i) => (
              <article key={text} className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-sm">
                <div className="flex gap-1 mb-3">{Array.from({ length: 5 }).map((_, n) => <Star key={n} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-neutral-700">"{text}"</p>
                <p className="text-xs font-black mt-4">Cliente verificado #{i + 1}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gestion" className="px-5 sm:px-10 py-16 bg-[#070707]">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black">Panel de gestion incluido</h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">La demo no es solo una pagina bonita: muestra como el negocio puede recibir solicitudes, revisar reservas, medir conversiones y controlar mensajes desde un panel privado.</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              {['Reservas', 'Mensajes', 'Analytics', 'Promociones'].map(item => (
                <div key={item} className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-sm font-bold">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-950 border border-white/10 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <span className="font-black text-sm">Panel {config.businessName}</span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Online</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                ['18', 'Reservas'],
                ['7', 'Leads hoy'],
                ['92%', 'Respuesta']
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <p className="text-xl font-black" style={{ color: config.brandColor }}>{value}</p>
                  <p className="text-[10px] text-slate-400">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {['Nueva solicitud desde Google', 'Reserva confirmada por WhatsApp', 'Review 5 estrellas recibida'].map(item => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-3 text-xs">
                  <TrendingUp className="w-4 h-4" style={{ color: config.brandColor }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" className="px-5 sm:px-10 py-14 bg-white text-neutral-950">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-black">Contacto directo</h2>
            <p className="text-neutral-600 text-sm mt-3">Lista para pasar a dominio, conectar formularios, reservas, WhatsApp, analitica y panel interno.</p>
          </div>
          <div className="bg-neutral-950 text-white border border-neutral-800 rounded-2xl p-5 space-y-4">
            <p className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4" style={{ color: config.brandColor }} /> {config.address}</p>
            <p className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4" style={{ color: config.brandColor }} /> {config.phone || loadedContact.phone || 'Telefono pendiente'}</p>
            <p className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4" style={{ color: config.brandColor }} /> Disponible para agenda y reservas online</p>
            <p className="flex items-center gap-3 text-sm"><MessageCircle className="w-4 h-4" style={{ color: config.brandColor }} /> WhatsApp y formularios conectables</p>
          </div>
        </div>
      </section>
    </main>
  );
}
