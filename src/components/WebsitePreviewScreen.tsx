import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Calendar, CheckCircle2, Copy, Edit3, Image as ImageIcon, Instagram, LayoutDashboard, MapPin, MessageCircle, Phone, Save, ShieldCheck, Sparkles, Star, TrendingUp, Users, X } from 'lucide-react';
import { ClientContact } from '../types';
import { db } from '../supabaseClient';

export type DemoWebsiteTemplate = 'peluqueria' | 'restaurante' | 'mantenimiento';
export type DemoWebsiteVariant = 'luxury' | 'bold' | 'minimal';

export interface DemoWebsiteConfig {
  template: DemoWebsiteTemplate;
  variant: DemoWebsiteVariant;
  businessName: string;
  brandColor: string;
  logoUrl: string;
  bannerUrl: string;
  address: string;
  phone: string;
  headline: string;
  subtitle: string;
  services: string[];
  featuredOffer: string;
  bookingLabel: string;
}

const CONFIG_VERSION_DEFAULTS = {
  variant: 'luxury' as DemoWebsiteVariant,
  services: [] as string[],
  featuredOffer: '',
  bookingLabel: 'Reservar ahora'
};

export const TEMPLATE_VARIANTS: { key: DemoWebsiteVariant; label: string; description: string }[] = [
  { key: 'luxury', label: 'Luxury editorial', description: 'Visual premium, elegante, aspiracional.' },
  { key: 'bold', label: 'Impacto urbano', description: 'Bloques grandes, contraste fuerte, venta directa.' },
  { key: 'minimal', label: 'Minimal claro', description: 'Limpio, corporativo y muy legible.' }
];

export const TEMPLATE_DEFAULTS: Record<DemoWebsiteTemplate, Omit<DemoWebsiteConfig, 'businessName' | 'brandColor' | 'logoUrl' | 'bannerUrl' | 'address' | 'phone'>> = {
  peluqueria: {
    template: 'peluqueria',
    variant: 'luxury',
    headline: 'Belleza, estilo y agenda llena desde el primer vistazo',
    subtitle: 'Una web premium para mostrar trabajos reales, capturar reservas y convertir visitantes en clientas recurrentes.',
    services: ['Corte y styling premium', 'Color, balayage y tratamientos', 'Reservas online 24/7', 'Bonos de mantenimiento'],
    featuredOffer: 'Diagnóstico capilar + propuesta de look personalizada',
    bookingLabel: 'Reservar cita'
  },
  restaurante: {
    template: 'restaurante',
    variant: 'bold',
    headline: 'Una experiencia digital que abre el apetito y llena mesas',
    subtitle: 'Carta visual, reservas fluidas, eventos privados, reseñas destacadas y una presencia online preparada para vender cada servicio.',
    services: ['Carta digital editable', 'Reservas y eventos privados', 'Menú degustación destacado', 'Pedidos y WhatsApp conectable'],
    featuredOffer: 'Menú especial de temporada con reserva prioritaria',
    bookingLabel: 'Reservar mesa'
  },
  mantenimiento: {
    template: 'mantenimiento',
    variant: 'minimal',
    headline: 'Confianza inmediata para reparaciones, urgencias y mantenimientos',
    subtitle: 'Una web clara, rápida y profesional para generar llamadas, presupuestos y solicitudes desde cualquier dispositivo.',
    services: ['Urgencias con llamada directa', 'Presupuestos online', 'Seguimiento de trabajos', 'Contratos de mantenimiento'],
    featuredOffer: 'Revisión inicial y presupuesto en menos de 24h',
    bookingLabel: 'Pedir presupuesto'
  }
};

export const TEMPLATE_BANNERS: Record<DemoWebsiteTemplate, string> = {
  peluqueria: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=88',
  restaurante: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=88',
  mantenimiento: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=88'
};

const TEMPLATE_GALLERY: Record<DemoWebsiteTemplate, string[]> = {
  peluqueria: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=82'
  ],
  restaurante: [
    'https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=82'
  ],
  mantenimiento: [
    'https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=82',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=900&q=82'
  ]
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
    address: contact?.location || 'Dirección pendiente',
    phone: contact?.phone || ''
  };

  if (!contact?.devWebsiteConfig) return base;

  try {
    const parsed = JSON.parse(contact.devWebsiteConfig);
    const template = (parsed.template || fallbackTemplate) as DemoWebsiteTemplate;
    return {
      ...base,
      ...TEMPLATE_DEFAULTS[template],
      ...CONFIG_VERSION_DEFAULTS,
      ...parsed,
      services: Array.isArray(parsed.services) && parsed.services.length ? parsed.services : TEMPLATE_DEFAULTS[template].services
    };
  } catch {
    return base;
  }
};

interface WebsitePreviewScreenProps {
  contactId: string;
  contacts?: ClientContact[];
  onBack?: () => void;
}

const variantShell: Record<DemoWebsiteVariant, string> = {
  luxury: 'bg-[#070707] text-white',
  bold: 'bg-[#101014] text-white',
  minimal: 'bg-slate-50 text-slate-950'
};

export default function WebsitePreviewScreen({ contactId, contacts = [], onBack }: WebsitePreviewScreenProps) {
  const [loadedContact, setLoadedContact] = useState<ClientContact | null>(contacts.find(c => c.id === contactId) || null);
  const [loading, setLoading] = useState(!loadedContact);
  const [draft, setDraft] = useState<DemoWebsiteConfig | null>(null);
  const [isEditing, setIsEditing] = useState(new URLSearchParams(window.location.search).get('edit') === '1');
  const [saving, setSaving] = useState(false);
  const [savedLink, setSavedLink] = useState('');

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

  const savedConfig = useMemo(() => parseDemoWebsiteConfig(loadedContact), [loadedContact]);
  const config = draft || savedConfig;
  const gallery = TEMPLATE_GALLERY[config.template];
  const shareUrl = `${window.location.origin}/web/${encodeURIComponent(contactId)}`;
  const editUrl = `${shareUrl}?edit=1`;
  const accentStyle = { '--accent': config.brandColor } as React.CSSProperties;

  useEffect(() => {
    setDraft(savedConfig);
  }, [savedConfig]);

  const patchDraft = (patch: Partial<DemoWebsiteConfig>) => setDraft(prev => ({ ...(prev || savedConfig), ...patch }));
  const setService = (index: number, value: string) => {
    const next = [...config.services];
    next[index] = value;
    patchDraft({ services: next });
  };

  const saveDemo = async () => {
    if (!loadedContact) return;
    setSaving(true);
    const nextContact = {
      ...loadedContact,
      website: shareUrl,
      devWebsiteConfig: JSON.stringify(config)
    };
    try {
      await db.updateContact(nextContact);
      setLoadedContact(nextContact);
      setSavedLink(shareUrl);
      window.history.replaceState(null, '', `/web/${encodeURIComponent(contactId)}`);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center text-sm">Cargando demo...</div>;

  if (!loadedContact) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Demo no encontrada</h1>
        <p className="text-slate-400 text-sm max-w-md">El enlace no coincide con ningún cliente disponible.</p>
      </div>
    );
  }

  return (
    <main className={`min-h-screen overflow-hidden ${variantShell[config.variant]}`} style={accentStyle}>
      <style>{`
        @keyframes floatIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .demo-reveal { animation: floatIn .75s ease both; }
        .accent-bg { background: var(--accent); }
        .accent-text { color: var(--accent); }
        .accent-border { border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
      `}</style>

      <nav className="sticky top-0 z-50 flex items-center justify-between px-5 sm:px-10 py-4 border-b border-white/10 bg-black/72 text-white backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white text-neutral-950 flex items-center justify-center overflow-hidden font-black shrink-0 shadow-xl">
            {config.logoUrl ? <img src={config.logoUrl} alt={config.businessName} className="w-full h-full object-cover" /> : config.businessName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="font-black text-base truncate block">{config.businessName}</span>
            <span className="text-[11px] text-white/55">Demo editable preparada por Althera</span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-6 text-xs font-bold text-white/80">
          <a href="#servicios">Servicios</a>
          <a href="#galeria">Galería</a>
          <a href="#panel">Panel cliente</a>
          <a href="#contacto">Contacto</a>
        </div>
        <div className="flex items-center gap-2">
          {onBack && <button onClick={onBack} className="hidden sm:flex items-center gap-2 text-xs bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 rounded-xl"><ArrowLeft className="w-4 h-4" />Volver</button>}
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 rounded-xl"><Edit3 className="w-4 h-4" />Editar</button>
        </div>
      </nav>

      {isEditing && (
        <aside className="fixed right-4 top-20 bottom-4 z-[60] w-[min(410px,calc(100vw-32px))] overflow-y-auto rounded-3xl border border-emerald-400/20 bg-[#050807]/95 text-white shadow-2xl backdrop-blur-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-black text-emerald-300 flex items-center gap-2"><Sparkles className="w-4 h-4" />Editor en tiempo real</p>
              <p className="text-[11px] text-slate-400 mt-1">Cambia textos, servicios, diseño, logo y banner. Al guardar se genera el enlace final para el cliente.</p>
            </div>
            <button onClick={() => setIsEditing(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {(['peluqueria', 'restaurante', 'mantenimiento'] as DemoWebsiteTemplate[]).map(template => (
              <button key={template} onClick={() => patchDraft({ ...TEMPLATE_DEFAULTS[template], template, bannerUrl: TEMPLATE_BANNERS[template] })} className={`py-2 rounded-xl text-[9px] font-black border ${config.template === template ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                {template}
              </button>
            ))}
          </div>

          <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono">Diseño visual</label>
          <div className="grid gap-2 mt-2 mb-4">
            {TEMPLATE_VARIANTS.map(variant => (
              <button key={variant.key} onClick={() => patchDraft({ variant: variant.key })} className={`text-left p-3 rounded-2xl border ${config.variant === variant.key ? 'bg-white/10 border-emerald-500/40' : 'bg-white/[0.03] border-white/10'}`}>
                <span className="block text-xs font-black">{variant.label}</span>
                <span className="block text-[10px] text-slate-400 mt-1">{variant.description}</span>
              </button>
            ))}
          </div>

          {[
            ['Nombre web', 'businessName'],
            ['Teléfono', 'phone'],
            ['Dirección', 'address'],
            ['Título principal', 'headline'],
            ['Subtítulo', 'subtitle'],
            ['Oferta destacada', 'featuredOffer'],
            ['Texto botón', 'bookingLabel'],
            ['URL logo', 'logoUrl'],
            ['URL banner', 'bannerUrl']
          ].map(([label, key]) => (
            <div key={key} className="space-y-1.5 mb-3">
              <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono">{label}</label>
              {key === 'headline' || key === 'subtitle' ? (
                <textarea value={(config as any)[key]} onChange={(e) => patchDraft({ [key]: e.target.value } as any)} rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-emerald-500" />
              ) : (
                <input value={(config as any)[key]} onChange={(e) => patchDraft({ [key]: e.target.value } as any)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-emerald-500" />
              )}
            </div>
          ))}

          <div className="space-y-2 mb-4">
            <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono">Servicios editables</label>
            {config.services.map((service, index) => (
              <input key={index} value={service} onChange={(e) => setService(index, e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-emerald-500" />
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono">Color de marca</label>
            <input type="color" value={config.brandColor} onChange={(e) => patchDraft({ brandColor: e.target.value })} className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-2 py-1 cursor-pointer" />
          </div>

          <button onClick={saveDemo} disabled={saving} className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl accent-bg text-black font-black text-sm py-3 disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar y generar link'}
          </button>
          <div className="mt-3 flex gap-2">
            <input value={savedLink || shareUrl} readOnly className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-slate-400 font-mono" />
            <button onClick={() => navigator.clipboard.writeText(savedLink || shareUrl)} className="px-3 rounded-xl bg-white/10 border border-white/10"><Copy className="w-4 h-4" /></button>
          </div>
        </aside>
      )}

      <section className="min-h-[88vh] grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-center px-5 sm:px-10 py-14 bg-cover bg-center relative" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.88), rgba(0,0,0,.58), rgba(0,0,0,.18)), url(${config.bannerUrl})` }}>
        <div className="relative z-10 max-w-4xl space-y-7 demo-reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white">
            <Star className="w-4 h-4 accent-text" />
            Demo personalizada para {loadedContact.name}
          </div>
          <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black leading-[0.92] tracking-tight text-white">{config.headline}</h1>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">{config.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <a href={config.phone ? `tel:${config.phone}` : '#contacto'} className="px-5 py-3 rounded-2xl text-sm font-black text-black shadow-xl accent-bg">{config.bookingLabel}</a>
            <a href="#panel" className="px-5 py-3 rounded-2xl text-sm font-bold bg-white/10 border border-white/15 hover:bg-white/15 text-white">Ver panel incluido</a>
          </div>
        </div>
        <div className="relative z-10 demo-reveal hidden lg:block">
          <div className="rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/15 p-4 shadow-2xl">
            <div className="grid grid-cols-2 gap-3">
              {gallery.map((img, index) => <img key={img} src={img} alt="" className={`w-full object-cover rounded-3xl ${index === 0 ? 'h-64 col-span-2' : 'h-36'}`} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-10 bg-white text-neutral-950">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-4 gap-4">
          {[
            ['4.9/5', 'Valoración media'],
            ['24/7', 'Captación activa'],
            ['+38%', 'Más conversión móvil'],
            ['< 2 min', 'Contacto por WhatsApp']
          ].map(([value, label]) => <div key={label} className="rounded-3xl border border-neutral-200 p-5 bg-neutral-50"><p className="text-3xl font-black accent-text">{value}</p><p className="text-sm text-neutral-600 mt-1">{label}</p></div>)}
        </div>
      </section>

      <section id="servicios" className="px-5 sm:px-10 py-16 bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] accent-text">Servicios</p>
            <h2 className="text-3xl sm:text-5xl font-black mt-3">Una web completa, no una landing vacía</h2>
            <p className="text-slate-400 text-sm mt-3">Incluye bloques comerciales, prueba social, formularios, zona visual, CTA y una simulación del panel administrativo del cliente.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {config.services.map((service, index) => (
              <article key={`${service}-${index}`} className="rounded-3xl bg-white/[0.04] border border-white/10 p-5">
                <CheckCircle2 className="w-6 h-6 mb-5 accent-text" />
                <h3 className="font-black text-lg">{service}</h3>
                <p className="text-sm text-slate-400 mt-3">Bloque editable con texto comercial, llamadas a la acción y medición preparada para convertir visitas en clientes.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="galeria" className="px-5 sm:px-10 py-16 bg-white text-neutral-950">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-4 mb-7">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] accent-text">Galería</p>
              <h2 className="text-3xl sm:text-5xl font-black mt-3">Visual como las webs de referencia</h2>
            </div>
            <Instagram className="w-8 h-8 accent-text" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gallery.concat(gallery).map((img, index) => <img key={`${img}-${index}`} src={img} alt="" className={`rounded-3xl object-cover border border-neutral-200 ${index % 5 === 0 ? 'md:row-span-2 aspect-[1/1.55]' : 'aspect-square'}`} />)}
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-16 bg-neutral-100 text-neutral-950">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[.85fr_1.15fr] gap-6 items-stretch">
          <div className="rounded-[2rem] bg-neutral-950 text-white p-7 flex flex-col justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] accent-text">Oferta destacada</p>
              <h2 className="text-3xl font-black mt-4">{config.featuredOffer}</h2>
              <p className="text-slate-400 text-sm mt-4">Este bloque sirve para campañas, promociones, menús, bonos o servicios estrella.</p>
            </div>
            <a href="#contacto" className="mt-8 inline-flex w-fit rounded-2xl accent-bg text-black px-5 py-3 font-black text-sm">{config.bookingLabel}</a>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {['Servicio impecable y rápido.', 'Reservar fue facilísimo desde el móvil.', 'La web transmite muchísima confianza.'].map((text, i) => (
              <article key={text} className="rounded-[2rem] bg-white border border-neutral-200 p-5 shadow-sm">
                <div className="flex gap-1 mb-4">{Array.from({ length: 5 }).map((_, n) => <Star key={n} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-neutral-700">“{text}”</p>
                <p className="text-xs font-black mt-5">Cliente verificado #{i + 1}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="panel" className="px-5 sm:px-10 py-16 bg-[#070707] text-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] accent-text">Panel administrativo</p>
            <h2 className="text-3xl sm:text-5xl font-black mt-3">El cliente ve que podrá gestionar su negocio</h2>
            <p className="text-slate-400 text-sm mt-4 leading-relaxed">La demo incluye un panel de administración simulado donde el negocio puede imaginar cambios reales: logo, banner, servicios, solicitudes, reservas, métricas y mensajes.</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              {['Cambiar logo', 'Editar servicios', 'Ver reservas', 'Medir conversiones'].map(item => <div key={item} className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4 accent-text" />{item}</div>)}
            </div>
          </div>
          <div className="rounded-[2rem] bg-slate-950 border border-white/10 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <span className="font-black text-sm flex items-center gap-2"><LayoutDashboard className="w-4 h-4 accent-text" />Admin {config.businessName}</span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Online</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[['18', 'Reservas'], ['7', 'Leads hoy'], ['92%', 'Respuesta']].map(([value, label]) => <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/10 p-3"><p className="text-xl font-black accent-text">{value}</p><p className="text-[10px] text-slate-400">{label}</p></div>)}
            </div>
            <div className="space-y-2">
              {[
                [Users, 'Nueva solicitud desde Google'],
                [MessageCircle, 'Reserva confirmada por WhatsApp'],
                [BarChart3, 'Campaña con +38% conversión'],
                [ImageIcon, 'Banner actualizado por el cliente']
              ].map(([Icon, item]: any) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/10 p-3 text-xs"><Icon className="w-4 h-4 accent-text" />{item}<TrendingUp className="w-4 h-4 ml-auto text-emerald-400" /></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" className="px-5 sm:px-10 py-14 bg-white text-neutral-950">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-black">Contacto directo</h2>
            <p className="text-neutral-600 text-sm mt-3">Lista para pasar a dominio, conectar formularios, reservas, WhatsApp, analítica y panel interno.</p>
          </div>
          <div className="bg-neutral-950 text-white border border-neutral-800 rounded-3xl p-5 space-y-4">
            <p className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 accent-text" /> {config.address}</p>
            <p className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 accent-text" /> {config.phone || loadedContact.phone || 'Teléfono pendiente'}</p>
            <p className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 accent-text" /> Disponible para agenda y reservas online</p>
            <p className="flex items-center gap-3 text-sm"><MessageCircle className="w-4 h-4 accent-text" /> WhatsApp y formularios conectables</p>
          </div>
        </div>
      </section>
    </main>
  );
}
