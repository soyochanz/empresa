import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ModernBackgroundPathsProps = {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

function FlowPattern() {
  return <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 620" preserveAspectRatio="xMidYMid slice">
    {Array.from({ length: 14 }, (_, index) => <motion.path key={index} d={`M-120 ${100 + index * 42} Q 170 ${25 + index * 48} 450 ${110 + index * 38} T 1020 ${85 + index * 44}`} fill="none" stroke="currentColor" strokeWidth={.7 + index * .08} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, .8, 0], opacity: [0, .12 + index * .014, .08, 0] }} transition={{ duration: 12, delay: index * .36, repeat: Infinity, ease: 'easeInOut' }} />)}
  </svg>;
}

const rotatingBenefits = ['herramientas', 'soluciones', 'clientes', 'ingresos', 'conversiones', 'resultados'];

export default function ModernBackgroundPaths({ title, subtitle, primaryLabel, secondaryLabel, onPrimary, onSecondary }: ModernBackgroundPathsProps) {
  const [activeBenefit, setActiveBenefit] = useState(0);
  useEffect(() => { const interval = window.setInterval(() => setActiveBenefit((current) => (current + 1) % rotatingBenefits.length), 2800); return () => window.clearInterval(interval); }, []);
  const words = title.split(' ');

  return <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center sm:px-10 lg:px-16" style={{ backgroundColor: '#050608' }}>
    <div className="absolute inset-0 text-[#d6b96f]/60"><FlowPattern /></div>
    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 45%, rgba(41,184,219,.11), transparent 30%), radial-gradient(circle at 50% 55%, rgba(214,185,111,.10), transparent 42%), linear-gradient(to bottom, rgba(5,6,8,.3), rgba(5,6,8,.82))' }} />
    <div className="absolute inset-0 opacity-30 althera-grid" />

    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="relative z-10 mx-auto max-w-[1280px]">
      <h1 className="overflow-visible py-[.08em] text-[clamp(3.8rem,8.5vw,9rem)] font-semibold leading-[.96] tracking-[-.075em] [perspective:900px]">
        {words.map((word, wordIndex) => <span key={word} className="mr-[.32em] inline-block overflow-visible py-[.06em] last:mr-0">{word.split('').map((letter, letterIndex) => <motion.span key={`${wordIndex}-${letterIndex}`} initial={{ y: 90, opacity: 0, rotateX: -80 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ delay: wordIndex * .12 + letterIndex * .035, type: 'spring', stiffness: 105, damping: 18 }} whileHover={{ y: -5, scale: 1.035 }} className="inline-block overflow-visible py-[.04em] cursor-default bg-gradient-to-br from-white via-white to-[#9ea2aa] bg-clip-text text-transparent transition-colors hover:from-[#f1d995] hover:to-[#76def7]">{letter}</motion.span>)}</span>)}
        <span className="mt-1 grid min-h-[1.2em] grid-cols-[auto_11.5ch] items-center justify-center gap-[.2em] text-[clamp(2.15rem,6.2vw,6.6rem)] leading-[1.08] tracking-[-.065em] sm:mt-2">
          <span className="bg-gradient-to-br from-white to-[#a7aab1] bg-clip-text text-transparent">mejores</span>
          <span className="relative block h-[1.2em] overflow-hidden text-left">
            <AnimatePresence initial={false}>
              <motion.span
                key={rotatingBenefits[activeBenefit]}
                initial={{ y: '90%', opacity: 0, filter: 'blur(10px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: '-90%', opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: .55, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 top-[.06em] inline-block whitespace-nowrap bg-gradient-to-r from-[#f1d995] to-[#63d5f2] bg-clip-text pb-[.14em] pr-[.06em] text-transparent"
              >
                {rotatingBenefits[activeBenefit]}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      </h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9, duration: .8 }} className="mx-auto mt-9 max-w-2xl text-base font-light leading-7 text-white/48 sm:text-xl">{subtitle}</motion.p>
      <motion.div initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, type: 'spring', stiffness: 100 }} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <div className="rounded-2xl bg-gradient-to-r from-[#d6b96f] via-[#f0dda5] to-[#63d5f2] p-[1px]"><Button size="lg" onClick={onPrimary} className="group rounded-[15px] bg-[#090a0d] px-9 text-white hover:bg-[#11131a]">{primaryLabel}<ArrowDownRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1 group-hover:translate-y-1" /></Button></div>
        <Button size="lg" variant="ghost" onClick={onSecondary} className="rounded-2xl px-9">{secondaryLabel}</Button>
      </motion.div>
    </motion.div>
  </section>;
}
