import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, MapPin, Phone, Star } from 'lucide-react';
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
    headline: 'Belleza, estilo y cuidado en cada cita',
    subtitle: 'Cortes, coloracion y tratamientos pensados para que cada cliente salga con una imagen impecable.'
  },
  restaurante: {
    template: 'restaurante',
    headline: 'Una experiencia para reservar y repetir',
    subtitle: 'Carta cuidada, reservas faciles y una presencia online preparada para convertir visitas en mesas ocupadas.'
  },
  mantenimiento: {
    template: 'mantenimiento',
    headline: 'Soluciones rapidas para hogares y empresas',
    subtitle: 'Servicios de mantenimiento, reparaciones y urgencias con contacto directo desde la web.'
  }
};

export const TEMPLATE_BANNERS: Record<DemoWebsiteTemplate, string> = {
  peluqueria: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=85',
  restaurante: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=85',
  mantenimiento: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=85'
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
  const services = {
    peluqueria: ['Corte y peinado', 'Coloracion profesional', 'Tratamientos capilares'],
    restaurante: ['Reservas online', 'Menu destacado', 'Eventos privados'],
    mantenimiento: ['Reparaciones urgentes', 'Mantenimiento preventivo', 'Presupuestos rapidos']
  }[config.template];

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
    <main className="min-h-screen bg-[#080808] text-white">
      <section
        className="min-h-[92vh] flex flex-col bg-cover bg-center relative"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.78), rgba(0,0,0,.34)), url(${config.bannerUrl})` }}
      >
        <nav className="relative z-10 flex items-center justify-between px-5 sm:px-10 py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-white text-neutral-950 flex items-center justify-center overflow-hidden font-black shrink-0">
              {config.logoUrl ? <img src={config.logoUrl} alt={config.businessName} className="w-full h-full object-cover" /> : config.businessName.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-black text-lg truncate">{config.businessName}</span>
          </div>
          {onBack && (
            <button onClick={onBack} className="hidden sm:flex items-center gap-2 text-xs bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-2 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          )}
        </nav>

        <div className="relative z-10 flex-1 flex items-center px-5 sm:px-10 pb-12">
          <div className="max-w-3xl space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-bold">
              <Star className="w-4 h-4" style={{ color: config.brandColor }} />
              Demo personalizada para {loadedContact.name}
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black leading-none">{config.headline}</h1>
              <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">{config.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={config.phone ? `tel:${config.phone}` : '#'} className="px-5 py-3 rounded-lg text-sm font-black text-neutral-950" style={{ backgroundColor: config.brandColor }}>
                Llamar ahora
              </a>
              <a href="#contacto" className="px-5 py-3 rounded-lg text-sm font-bold bg-white/10 border border-white/15 hover:bg-white/15">
                Pedir presupuesto
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-12 bg-white text-neutral-950">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
          {services.map(service => (
            <article key={service} className="border border-neutral-200 rounded-lg p-5">
              <CheckCircle2 className="w-5 h-5 mb-4" style={{ color: config.brandColor }} />
              <h2 className="font-black text-lg">{service}</h2>
              <p className="text-sm text-neutral-600 mt-2">Seccion editable preparada para adaptar textos, fotos y llamadas a la accion al negocio.</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contacto" className="px-5 sm:px-10 py-12 bg-neutral-950">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-black">Contacto directo</h2>
            <p className="text-slate-400 text-sm mt-3">Esta demo puede convertirse en una web final con dominio, formulario, reservas y analitica.</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-lg p-5 space-y-4">
            <p className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4" style={{ color: config.brandColor }} /> {config.address}</p>
            <p className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4" style={{ color: config.brandColor }} /> {config.phone || loadedContact.phone || 'Telefono pendiente'}</p>
            <p className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4" style={{ color: config.brandColor }} /> Disponible para agenda y reservas online</p>
          </div>
        </div>
      </section>
    </main>
  );
}
