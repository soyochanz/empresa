import { CSSProperties, Key, ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './LogoLoop.css';

export type LogoLoopItem =
  | { src: string; alt?: string; title?: string; href?: string; width?: number; height?: number }
  | { node: ReactNode; title?: string; ariaLabel?: string; href?: string };

interface LogoLoopProps {
  logos: LogoLoopItem[];
  speed?: number;
  direction?: 'left' | 'right';
  width?: number | string;
  logoHeight?: number;
  gap?: number;
  hoverSpeed?: number;
  fadeOut?: boolean;
  fadeOutColor?: string;
  scaleOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const CONFIG = { smoothTau: 0.25, minCopies: 2, headroom: 2 };
const cssLength = (value?: number | string) => typeof value === 'number' ? `${value}px` : value;

const LogoLoop = memo(({ logos, speed = 72, direction = 'left', width = '100%', logoHeight = 48, gap = 72, hoverSpeed = 16, fadeOut = true, fadeOutColor, scaleOnHover = true, ariaLabel = 'Empresas que han trabajado con Althera', className, style }: LogoLoopProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLUListElement>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const [sequenceWidth, setSequenceWidth] = useState(0);
  const [copyCount, setCopyCount] = useState(CONFIG.minCopies);
  const [hovered, setHovered] = useState(false);

  const updateDimensions = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const measuredWidth = Math.ceil(sequenceRef.current?.getBoundingClientRect().width ?? 0);
    if (!measuredWidth) return;
    setSequenceWidth(measuredWidth);
    setCopyCount(Math.max(CONFIG.minCopies, Math.ceil(containerWidth / measuredWidth) + CONFIG.headroom));
  }, []);

  useEffect(() => {
    updateDimensions();
    if (!window.ResizeObserver) {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    if (sequenceRef.current) observer.observe(sequenceRef.current);
    return () => observer.disconnect();
  }, [logos, logoHeight, gap, updateDimensions]);

  useEffect(() => {
    const images = sequenceRef.current?.querySelectorAll('img') ?? [];
    images.forEach(image => {
      image.addEventListener('load', updateDimensions, { once: true });
      image.addEventListener('error', updateDimensions, { once: true });
    });
    return () => images.forEach(image => {
      image.removeEventListener('load', updateDimensions);
      image.removeEventListener('error', updateDimensions);
    });
  }, [logos, updateDimensions]);

  useEffect(() => {
    if (!sequenceWidth || !trackRef.current) return;
    let frame = 0;
    let previous: number | null = null;
    const directionMultiplier = direction === 'left' ? 1 : -1;
    const animate = (timestamp: number) => {
      if (previous === null) previous = timestamp;
      const delta = Math.max(0, timestamp - previous) / 1000;
      previous = timestamp;
      const target = (hovered ? hoverSpeed : speed) * directionMultiplier;
      velocityRef.current += (target - velocityRef.current) * (1 - Math.exp(-delta / CONFIG.smoothTau));
      offsetRef.current = ((offsetRef.current + velocityRef.current * delta) % sequenceWidth + sequenceWidth) % sequenceWidth;
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [direction, hoverSpeed, hovered, sequenceWidth, speed]);

  const renderItem = useCallback((item: LogoLoopItem, key: Key) => {
    const content = 'node' in item
      ? <span className="logoloop__node">{item.node}</span>
      : <img src={item.src} alt={item.alt ?? item.title ?? ''} title={item.title} loading="lazy" decoding="async" draggable={false} />;
    const label = 'node' in item ? item.ariaLabel ?? item.title : item.alt ?? item.title;
    return <li className="logoloop__item" key={key}>{item.href ? <a className="logoloop__link" href={item.href} target="_blank" rel="noreferrer noopener" aria-label={label}>{content}</a> : content}</li>;
  }, []);

  const lists = useMemo(() => Array.from({ length: copyCount }, (_, copyIndex) => (
    <ul className="logoloop__list" key={copyIndex} aria-hidden={copyIndex > 0} ref={copyIndex === 0 ? sequenceRef : undefined}>
      {logos.map((item, index) => renderItem(item, `${copyIndex}-${index}`))}
    </ul>
  )), [copyCount, logos, renderItem]);

  const variables = { '--logoloop-gap': `${gap}px`, '--logoloop-logoHeight': `${logoHeight}px`, ...(fadeOutColor ? { '--logoloop-fadeColor': fadeOutColor } : {}), width: cssLength(width), ...style } as CSSProperties;
  return <div ref={containerRef} role="region" aria-label={ariaLabel} style={variables} className={['logoloop', fadeOut && 'logoloop--fade', scaleOnHover && 'logoloop--scale-hover', className].filter(Boolean).join(' ')}>
    <div ref={trackRef} className="logoloop__track" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>{lists}</div>
  </div>;
});

LogoLoop.displayName = 'LogoLoop';
export default LogoLoop;
