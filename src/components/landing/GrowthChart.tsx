import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';

export default function GrowthChart({ language, onBites }: { language: 'es' | 'en'; onBites: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 90%', 'center 55%'] });
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [increase, setIncrease] = useState(0);
  useMotionValueEvent(progress, 'change', value => setIncrease(Math.round(value * 30)));
  const es = language === 'es';
  return <section ref={ref} className="lp-growth lp-section lp-container" aria-labelledby="growth-title">
    <div className="lp-growth-copy"><img src="/bites-logo.png" width="90" height="60" alt="Bites" />
      <h2 id="growth-title">{es ? 'Cada mesa.' : 'Every table.'}<br /><em>{es ? 'Más posibilidades.' : 'More possibilities.'}</em></h2>
      <div className="lp-bites-trial"><div className="lp-trial-number">14<span>{es ? 'DÍAS' : 'DAYS'}</span></div><div className="lp-trial-details"><strong>{es ? 'Pruébalo gratis.' : 'Try it free.'}</strong><p>{es ? 'Todas las funciones de Bites. Durante 14 días.' : 'Every Bites feature. For 14 days.'}</p><a className="lp-button" href="#contacto" onClick={onBites}>{es ? 'Quiero mi prueba gratuita' : 'Request my free trial'}<ArrowUpRight size={18} /></a></div></div>
    </div>
    <div className="lp-growth-chart">
      <div className="lp-growth-stat"><strong>+{reduced ? 30 : increase}%</strong><span>{es ? 'Escenario de ticket medio' : 'Average spend scenario'}</span></div>
      <svg viewBox="0 0 560 280" role="img" aria-label={es ? 'Ejemplo ilustrativo: un ticket de 20 euros pasa a 26 euros, un aumento del 30 por ciento. No son resultados medidos.' : 'Illustrative example: a €20 order becomes €26, a 30 percent increase. Not measured results.'}>
        <defs><linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d6bd83" stopOpacity=".3" /><stop offset="100%" stopColor="#d6bd83" stopOpacity="0" /></linearGradient></defs>
        {[65, 130, 195, 255].map(y => <line key={y} x1="24" x2="535" y1={y} y2={y} stroke="#ffffff12" strokeDasharray="3 7" />)}
        <motion.path d="M24 235 C110 235 112 190 195 190 S290 130 365 130 S440 40 530 35 L530 255 L24 255Z" fill="url(#growth-fill)" style={{ opacity: reduced ? 1 : progress }} />
        <motion.path d="M24 235 C110 235 112 190 195 190 S290 130 365 130 S440 40 530 35" fill="none" stroke="#e7ce93" strokeWidth="5" strokeLinecap="round" style={{ pathLength: reduced ? 1 : progress }} />
        <circle cx="24" cy="235" r="6" fill="#d6bd83" /><motion.circle cx="530" cy="35" r="8" fill="#f4e7c9" style={{ opacity: reduced ? 1 : progress }} />
      </svg>
      <div className="lp-chart-axis"><span>20 €</span><span>26 €</span></div>
      <p className="lp-chart-note">{es ? 'Ejemplo ilustrativo de un aumento del 30 %. No representa resultados medidos ni garantiza un rendimiento. El impacto depende de cada negocio.' : 'Illustrative example of a 30% increase. Not measured results or a performance guarantee. Impact depends on each business.'}</p>
    </div>
  </section>;
}
