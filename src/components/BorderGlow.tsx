import { CSSProperties, ReactNode, useCallback, useEffect, useRef } from 'react';
import './BorderGlow.css';

interface BorderGlowProps {
  children: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}

type GlowStyle = CSSProperties & Record<`--${string}`, string | number>;

const parseHsl = (value: string) => {
  const match = value.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  return match ? { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) } : { h: 40, s: 80, l: 80 };
};

const buildGlowVariables = (color: string, intensity: number) => {
  const { h, s, l } = parseHsl(color);
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  return Object.fromEntries(keys.map((key, index) => [`--glow-color${key}`, `hsl(${h}deg ${s}% ${l}% / ${Math.min(opacities[index] * intensity, 100)}%)`]));
};

const gradientPositions = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const gradientKeys = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const colorMap = [0, 1, 2, 0, 1, 2, 1];

const buildGradientVariables = (colors: string[]) => ({
  ...Object.fromEntries(gradientKeys.map((key, index) => [key, `radial-gradient(at ${gradientPositions[index]}, ${colors[Math.min(colorMap[index], colors.length - 1)]} 0px, transparent 50%)`])),
  '--gradient-base': `linear-gradient(${colors[0]} 0 100%)`
});

const animateValue = (start: number, end: number, duration: number, delay: number, update: (value: number) => void, done?: () => void) => {
  const timeout = window.setTimeout(() => {
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      update(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(tick); else done?.();
    };
    requestAnimationFrame(tick);
  }, delay);
  return () => window.clearTimeout(timeout);
};

export default function BorderGlow({ children, className = '', edgeSensitivity = 30, glowColor = '40 80 80', backgroundColor = '#120F17', borderRadius = 28, glowRadius = 40, glowIntensity = 1, coneSpread = 25, animated = false, colors = ['#c084fc', '#f472b6', '#38bdf8'], fillOpacity = .5 }: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
    const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
    const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!animated || !card) return;
    card.classList.add('sweep-active');
    card.style.setProperty('--cursor-angle', '110deg');
    const cleanups = [
      animateValue(0, 100, 500, 0, value => card.style.setProperty('--edge-proximity', `${value}`)),
      animateValue(110, 465, 3000, 200, value => card.style.setProperty('--cursor-angle', `${value}deg`)),
      animateValue(100, 0, 1200, 2400, value => card.style.setProperty('--edge-proximity', `${value}`), () => card.classList.remove('sweep-active'))
    ];
    return () => cleanups.forEach(cleanup => cleanup());
  }, [animated]);

  const style: GlowStyle = {
    '--card-bg': backgroundColor,
    '--edge-sensitivity': edgeSensitivity,
    '--border-radius': `${borderRadius}px`,
    '--glow-padding': `${glowRadius}px`,
    '--cone-spread': coneSpread,
    '--fill-opacity': fillOpacity,
    ...buildGlowVariables(glowColor, glowIntensity),
    ...buildGradientVariables(colors)
  };

  return <div ref={cardRef} onPointerMove={handlePointerMove} className={`border-glow-card ${className}`} style={style}>
    <span className="edge-light" aria-hidden="true" />
    <div className="border-glow-inner">{children}</div>
  </div>;
}
