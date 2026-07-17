import React from 'react';
import { CalendarClock, Globe2, Megaphone, PackageOpen, QrCode, Share2, Sparkles, type LucideIcon } from 'lucide-react';

interface ProductNeedsSummaryProps {
 products?: string[];
 otherDetail?: string;
 compact?: boolean;
 className?: string;
}

const productVisuals: Array<{ match: string[]; label: string; Icon: LucideIcon; style: string }> = [
 { match: ['website', 'web'], label: 'Website', Icon: Globe2, style: 'border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-100' },
 { match: ['sistema de reservas', 'reservas'], label: 'Sistema de reservas', Icon: CalendarClock, style: 'border-violet-300/20 bg-violet-400/[0.08] text-violet-100' },
 { match: ['menú inteligente', 'menu inteligente', 'menú'], label: 'Menú Inteligente', Icon: QrCode, style: 'border-amber-300/20 bg-amber-400/[0.08] text-amber-100' },
 { match: ['gestión de redes', 'gestion de redes', 'redes'], label: 'Gestión de redes', Icon: Share2, style: 'border-fuchsia-300/20 bg-fuchsia-400/[0.08] text-fuchsia-100' },
 { match: ['meta ads', 'ads'], label: 'Meta Ads', Icon: Megaphone, style: 'border-rose-300/20 bg-rose-400/[0.08] text-rose-100' },
 { match: ['otro'], label: 'Otro', Icon: PackageOpen, style: 'border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-100' },
];

const resolveProductVisual = (product: string) => {
 const normalized = product.trim().toLocaleLowerCase('es-ES');
 return productVisuals.find(item => item.match.some(match => normalized === match || normalized.includes(match))) || {
  label: product,
  Icon: PackageOpen,
  style: 'border-white/10 bg-white/[0.04] text-slate-200',
 };
};

export default function ProductNeedsSummary({ products = [], otherDetail, compact = false, className = '' }: ProductNeedsSummaryProps) {
 const uniqueProducts = Array.from(new Set(products.map(product => product.trim()).filter(Boolean)));
 if (otherDetail?.trim() && !uniqueProducts.some(product => product.toLocaleLowerCase('es-ES') === 'otro')) uniqueProducts.push('Otro');
 if (!uniqueProducts.length && !otherDetail?.trim()) return null;

 return (
  <section className={`rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.07] via-violet-400/[0.04] to-transparent ${compact ? 'p-3' : 'p-4'} ${className}`}>
   <div className="flex items-start gap-2.5">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"><Sparkles className="h-4 w-4" /></span>
    <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">Qué necesita este lead</p><p className="mt-0.5 text-[9px] leading-4 text-slate-500">Productos e intereses indicados por el comercial.</p></div>
   </div>
   <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
    {uniqueProducts.map(product => {
     const visual = resolveProductVisual(product);
     const isOther = visual.label === 'Otro';
     return <div key={product} className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 ${compact ? 'min-h-10 py-2' : 'min-h-12 py-2.5'} ${visual.style}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-black/15"><visual.Icon className="h-3.5 w-3.5" /></span><span className="min-w-0"><strong className="block text-[9px] leading-3">{visual.label || product}</strong>{isOther && otherDetail?.trim() && <span className="mt-0.5 block break-words text-[8px] leading-3 opacity-75">{otherDetail.trim()}</span>}</span></div>;
    })}
   </div>
  </section>
 );
}
