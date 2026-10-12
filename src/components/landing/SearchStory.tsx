import { useRef, useState } from 'react';
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ArrowDown, ArrowUpRight, Search } from 'lucide-react';

export default function SearchStory({ language }: { language: 'es' | 'en' }) {
  const section = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const query = language === 'es' ? 'Necesito más clientes' : 'I need more customers';
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', value => setProgress(Math.round(value * 1000) / 1000));
  const phase = (start: number, end: number) => Math.max(0, Math.min(1, (progress - start) / (end - start)));
  const letters = Math.round(phase(.04, .44) * query.length);
  const ready = progress >= .82;
  const solution = reduced ? 1 : phase(.47, .6);
  const brand = reduced ? 1 : phase(.66, .84);
  return <section ref={section} id="la-solucion" className={`lp-search-story${reduced ? ' is-reduced' : ''}`} aria-label={language === 'es' ? 'Necesito más clientes. La solución: Althera Solutions.' : 'I need more customers. The solution: Althera Solutions.'}>
    <div className="lp-search-stage">
      <div className="lp-search-aura" aria-hidden="true" style={{ opacity: reduced ? .65 : .1 + phase(.4, .95) * .55 }} />
      <div className="lp-search-composition">
        <p className="lp-search-label">{language === 'es' ? 'La búsqueda.' : 'The search.'}</p>
        <div className="lp-search-input" aria-hidden="true"><Search strokeWidth={1.5} /><span>{reduced ? query : query.slice(0, letters)}<i className="lp-typing-cursor" /></span><ArrowUpRight className="lp-search-arrow" /></div>
        <div className="lp-solution-label" aria-hidden="true" style={{ opacity: solution, transform: `translateY(${(1 - solution) * 28}px)` }}>{language === 'es' ? 'La solución.' : 'The solution.'}</div>
        <div className="lp-search-answer" aria-hidden="true" style={{ opacity: brand, transform: `translateY(${(1 - brand) * 36}px) scale(${.88 + brand * .12})`, filter: `blur(${(1 - brand) * 14}px)` }}>
          <img src="/althera-logo-transparent.png" alt="" width="92" height="104" /><span>althera<small>SOLUTIONS</small></span>
        </div>
        <div className="lp-search-cta">{(ready || reduced) && <a href="#contacto" className="lp-text-link">{language === 'es' ? 'Empecemos por tu negocio' : 'Let’s start with your business'}<ArrowUpRight size={18} /></a>}</div>
      </div>
      {!reduced && <div className="lp-search-scroll" aria-hidden="true"><span>{language === 'es' ? 'Sigue bajando' : 'Keep scrolling'}</span><ArrowDown size={16} /></div>}
    </div>
  </section>;
}
