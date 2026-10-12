import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight, ArrowRight, Check, Globe2, Menu, X, Search, Target, Code2, Sparkles, Instagram } from 'lucide-react';
import { InquiryMessage, PartnerCompany, Screen } from '../types';
import { db } from '../supabaseClient';
import { trackWebsiteEvent } from '../utils/webAnalytics';
import { CONSENT_EVENT, getWebsiteConsent } from '../utils/websiteConsent';
import { landingCopy } from './landing/content';
import { company, legalContent, legalPageIds, LegalPageId } from './landing/legalContent';
import { saveLanguagePreference, usePublicLanguage } from './landing/usePublicLanguage';
import CookiePreferences, { OPEN_COOKIE_PREFERENCES } from './landing/CookiePreferences';
import './LandingScreen.css';

interface LandingScreenProps {
  onNavigate: (target: Screen, transition: 'none' | 'push' | 'push_back') => void;
  projects?: any[];
  partners?: PartnerCompany[];
}
const serviceIcons = [Globe2, Search, Target, Instagram, Code2, Sparkles];
function safeUrl(value?: string) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.startsWith('/') || /^https?:\/\//i.test(value) ? value : `https://${value}`, window.location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}
function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string; key?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .08 }} transition={{ duration: .65, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}
function Brand() {
  return <><img src="/althera-logo-transparent.png" width="44" height="48" alt="" /><span>althera<small>SOLUTIONS</small></span></>;
}
export default function LandingScreen({ onNavigate, projects = [], partners = [] }: LandingScreenProps) {
  const language = usePublicLanguage();
  const t = landingCopy[language];
  const lastSegment = window.location.pathname.replace(/\/$/, '').split('/').pop() as LegalPageId;
  const legalPage = legalPageIds.includes(lastSegment) ? lastSegment : null;
  const home = `/${language}`;
  const section = (id: string) => legalPage ? `${home}#${id}` : `#${id}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [interest, setInterest] = useState(0);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  // The page scroll source also exists on legal routes, where there is no hero.
  const { scrollY } = useScroll();
  const parallax = useTransform(scrollY, [0, 900], [0, 95]);
  const pageTracked = useRef(false);
  useEffect(() => {
    const track = () => {
      if (!getWebsiteConsent()?.analytics) { pageTracked.current = false; trackWebsiteEvent('page_view'); return; }
      if (!pageTracked.current) { trackWebsiteEvent('page_view'); pageTracked.current = true; }
    };
    track(); window.addEventListener(CONSENT_EVENT, track);
    return () => window.removeEventListener(CONSENT_EVENT, track);
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  useEffect(() => {
    if (legalPage) document.title = `${t.legal[legalPageIds.indexOf(legalPage)]} — Althera Solutions`;
  }, [legalPage, language, t]);
  const submitInquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim() || !privacyAccepted || sending) return;
    setSending(true); setError(false);
    const timestamp = new Date().toISOString();
    const inquiry: InquiryMessage = {
      id: `inq_${crypto.randomUUID()}`, name: name.trim(), email: email.trim(),
      message: `[${t.interests[interest]}] ${message.trim()}\n\n[Privacy consent: 2026-10-12; accepted: ${timestamp}; language: ${language}]`,
      archived: false, created_at: timestamp,
    };
    try {
      await db.insertInquiry(inquiry);
      trackWebsiteEvent('contact_intent');
      setSent(true); setName(''); setEmail(''); setMessage(''); setPrivacyAccepted(false);
    } catch { setError(true); }
    finally { setSending(false); }
  };
  const openPreferences = () => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES));
  return <div className="althera-landing landing-v3">
    <a className="lp-skip" href="#contenido">{t.skip}</a>
    <header className="lp-header"><div className="lp-container lp-header-inner">
      <a className="lp-brand" href={legalPage ? home : '#inicio'} aria-label="Althera Solutions"><Brand /></a>
      <nav className="lp-nav" aria-label={language === 'es' ? 'Navegación principal' : 'Main navigation'}>
        {['servicios', 'proyectos', 'nosotros'].map((id, index) => <a key={id} href={section(id)}>{t.nav[index]}</a>)}
      </nav>
      <div className="lp-language" aria-label={t.language}>{(['es', 'en'] as const).map(lang => <a key={lang} href={`/${lang}${legalPage ? `/${legalPage}` : ''}`} onClick={() => saveLanguagePreference(lang)} lang={lang} aria-label={lang === 'es' ? 'Español' : 'English'} aria-current={language === lang ? 'true' : undefined}>{lang.toUpperCase()}</a>)}</div>
      <a className="lp-button lp-header-cta" href={section('contacto')}>{t.talk}<ArrowUpRight size={16} /></a>
      <button className="lp-menu-toggle" aria-label={menuOpen ? t.close : t.menu} aria-expanded={menuOpen} aria-controls="lp-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </div>{menuOpen && <nav id="lp-mobile-nav" className="lp-mobile-nav" aria-label={t.menu}>{['servicios', 'proyectos', 'nosotros', 'contacto'].map((id, index) => <a key={id} href={section(id)} onClick={() => setMenuOpen(false)}>{[...t.nav, t.talk][index]}<ArrowUpRight size={18} /></a>)}</nav>}</header>

    {legalPage ? <main id="contenido" className="lp-legal lp-container">
      <a className="lp-text-link" href={home}>← {t.back}</a>
      <p className="lp-eyebrow">ALTHERA SOLUTIONS - F.Z.C</p>
      <h1>{t.legal[legalPageIds.indexOf(legalPage)]}</h1><p className="lp-muted">{t.updated}</p>
      <nav className="lp-legal-nav" aria-label={language === 'es' ? 'Páginas legales' : 'Legal pages'}>{legalPageIds.map((id, index) => <a key={id} href={`/${language}/${id}`} aria-current={id === legalPage ? 'page' : undefined}>{t.legal[index]}</a>)}</nav>
      {legalContent[language][legalPage].map(item => <section key={item.title}><h2>{item.title}</h2><p>{item.text}</p></section>)}
      {legalPage === 'cookies' && <button className="lp-button" onClick={openPreferences}>{t.preferences}</button>}
    </main> : <main id="contenido">
      <section id="inicio" ref={hero} className="lp-hero lp-container">
        <Reveal className="lp-hero-copy"><p className="lp-eyebrow">{t.eyebrow}</p><h1>{t.hero[0]}<br />{t.hero[1]}<br /><em>{t.hero[2]}</em></h1><p className="lp-intro">{t.intro}</p><div className="lp-actions"><a className="lp-button" href="#contacto">{t.cta}<ArrowUpRight size={18} /></a><a className="lp-text-link" href="#proyectos">{t.explore}<ArrowRight size={16} /></a></div></Reveal>
        <motion.div className="lp-hero-visual" style={{ y: reduced ? 0 : parallax }}><img src="/landing/generated/growth-hero.webp" alt="" width="1374" height="1145" fetchPriority="high" /></motion.div>
      </section>
      <section className="lp-ecosystem"><div className="lp-container"><p className="lp-eyebrow">{t.ecosystem}</p><div className="lp-brand-strip"><a href="#bites"><img src="/bites-logo.png" alt="Bites" width="100" height="64" /></a><a href="https://instaremoveai.com/" target="_blank" rel="noopener noreferrer">InstaRemove<span>AI</span><ArrowUpRight size={16} /></a><a href="https://apps.apple.com/es/app/kapsely/id6759984193" target="_blank" rel="noopener noreferrer">Kapsely<ArrowUpRight size={16} /></a><a href="#althera-os">Althera OS<ArrowUpRight size={16} /></a></div></div></section>
      <section id="nosotros" className="lp-section lp-container lp-about">
        <Reveal className="lp-about-visual"><img src="/landing/generated/web-showcase.webp" alt={language === 'es' ? 'Mockup de web mediterránea en portátil y móvil' : 'Mediterranean website concept on a laptop and phone'} width="1484" height="1060" loading="lazy" /><span className="lp-image-caption">{t.concept}</span></Reveal>
        <Reveal><p className="lp-eyebrow">{t.aboutLabel}</p><h2>{t.aboutTitle[0]}<br /><em>{t.aboutTitle[1]}</em></h2><p className="lp-intro">{t.aboutText}</p><ul className="lp-about-points">{t.aboutPoints.map(point => <li key={point}><Check size={16} />{point}</li>)}</ul><a className="lp-text-link" href="#contacto">{t.talk}<ArrowUpRight size={18} /></a></Reveal>
      </section>
      <section id="servicios" className="lp-section lp-services-section"><div className="lp-container"><Reveal className="lp-heading-centered"><p className="lp-eyebrow">{t.servicesLabel}</p><h2>{t.servicesTitle[0]}<br /><em>{t.servicesTitle[1]}</em></h2></Reveal><div className="lp-services-grid">{t.services.map(([title, text], index) => { const Icon = serviceIcons[index]; return <Reveal key={title}><article className={`lp-service${index === 2 ? ' lp-service-featured' : ''}`}><span className="lp-service-icon"><Icon size={29} strokeWidth={1.3} /></span><h3>{title}</h3><p>{text}</p><a href="#contacto" onClick={() => setInterest(Math.min(index, 4))} aria-label={`${t.serviceLink}: ${title}`}>{t.serviceLink}<ArrowRight size={15} /></a></article></Reveal>; })}</div></div></section>
      <section id="proyectos" className="lp-section lp-container">
        <Reveal className="lp-heading-row"><div><p className="lp-eyebrow">{t.workLabel}</p><h2>{t.workTitle[0]}<br /><em>{t.workTitle[1]}</em></h2></div><a className="lp-text-link" href="#contacto">{t.cta}<ArrowUpRight size={18} /></a></Reveal>
        <div className="lp-products"><Reveal><article id="bites" className="lp-product"><div className="lp-product-image"><img src="/landing/generated/bites-mockup.webp" alt={language === 'es' ? 'Presentación de carta digital en dos móviles' : 'Digital menu presentation on two phones'} width="1296" height="864" loading="lazy" /><img className="lp-bites-logo" src="/bites-logo.png" alt="Bites" width="96" height="64" /></div><div className="lp-product-info"><span className="lp-image-caption">{t.mockup}</span><h3>Bites</h3><p>{t.bites}</p><a href="#contacto" onClick={() => setInterest(5)} className="lp-text-link">{t.bitesLink}<ArrowUpRight size={18} /></a></div></article></Reveal>
        <Reveal><article className="lp-product"><div className="lp-product-image"><img src="/landing/generated/instaremove-mockup.webp" alt={language === 'es' ? 'InstaRemoveAI presentado en un monitor' : 'InstaRemoveAI presented on a desktop monitor'} width="1536" height="1024" loading="lazy" /></div><div className="lp-product-info"><span className="lp-image-caption">{t.productPresentation}</span><h3>InstaRemoveAI</h3><p>{t.insta}</p><a href="https://instaremoveai.com/" target="_blank" rel="noopener noreferrer" className="lp-text-link">{t.instaLink}<ArrowUpRight size={18} /></a></div></article></Reveal></div>
        <div className="lp-small-projects"><Reveal><article><h3>Kapsely</h3><p>{t.kapsely}</p><a className="lp-text-link" href="https://apps.apple.com/es/app/kapsely/id6759984193" target="_blank" rel="noopener noreferrer">App Store<ArrowUpRight size={17} /></a></article></Reveal><Reveal><article id="althera-os"><h3>Althera OS</h3><p>{t.os}</p><a className="lp-text-link" href="#contacto">{t.talk}<ArrowUpRight size={17} /></a></article></Reveal></div>
        {projects.filter(project => project.showOnLanding !== false).length > 0 && <div className="lp-real-projects"><h3>{t.moreWork}</h3><div className="lp-products">{projects.filter(project => project.showOnLanding !== false).slice(0, 6).map(project => <Reveal key={project.id}><article className="lp-product">{project.image && <img className="lp-client-image" src={project.image} alt={project.title} width="800" height="500" loading="lazy" />}<div className="lp-product-info"><h3>{project.title}</h3><p>{language === 'en' ? project.descriptionEn || 'Bespoke design and development by Althera.' : project.description || project.detailText}</p>{safeUrl(project.url) && <a href={safeUrl(project.url)} target="_blank" rel="noopener noreferrer" className="lp-text-link">{t.seeProject}<ArrowUpRight size={18} /></a>}</div></article></Reveal>)}</div></div>}
        {partners.length > 0 && <div className="lp-partners">{partners.map(partner => <img key={partner.id} src={partner.logoUrl} alt={partner.name} width="120" height="60" loading="lazy" />)}</div>}
      </section>
      <section id="contacto" className="lp-contact lp-section"><div className="lp-container lp-contact-grid"><Reveal><p className="lp-eyebrow">{t.contactLabel}</p><h2>{t.contactTitle[0]}<br /><em>{t.contactTitle[1]}</em></h2><p className="lp-intro">{t.contactText}</p><a className="lp-contact-email" href={`mailto:${company.email}`}>{company.email}<ArrowUpRight size={18} /></a></Reveal><Reveal>{sent ? <div className="lp-success" role="status"><Check size={32} /><h3>{t.success}</h3><p>{t.successText}</p><button className="lp-text-link" onClick={() => setSent(false)}>{t.again}<ArrowRight size={18} /></button></div> : <form className="lp-form" onSubmit={submitInquiry}><div className="lp-form-row"><label>{t.name}<input required maxLength={150} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label><label>{t.email}<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label></div><label>{t.interest}<select value={interest} onChange={event => setInterest(Number(event.target.value))}>{t.interests.map((item, index) => <option value={index} key={item}>{item}</option>)}</select></label><label>{t.message}<textarea required rows={3} maxLength={5000} value={message} onChange={event => setMessage(event.target.value)} placeholder={t.messagePlaceholder} /></label><label className="lp-privacy-check"><input required type="checkbox" checked={privacyAccepted} onChange={event => setPrivacyAccepted(event.target.checked)} /><span>{t.privacyAccept} <a href={`/${language}/privacy`} target="_blank" rel="noopener noreferrer">{t.privacyLink}</a></span></label>{error && <p className="lp-form-error" role="alert">{t.error}</p>}<button className="lp-button" disabled={sending}>{sending ? t.sending : t.submit}<ArrowUpRight size={18} /></button></form>}</Reveal></div></section>
    </main>}
    <footer className="lp-footer"><div className="lp-container"><div className="lp-footer-top"><div><a className="lp-brand" href={legalPage ? home : '#inicio'} aria-label="Althera Solutions"><Brand /></a><p>{t.footerLine}</p></div><nav aria-label={language === 'es' ? 'Información legal' : 'Legal information'}>{legalPageIds.map((id, index) => <a key={id} href={`/${language}/${id}`}>{t.legal[index]}</a>)}<button onClick={openPreferences}>{t.preferences}</button></nav></div><div className="lp-footer-bottom"><p>© {new Date().getFullYear()} {company.name}<br />{language === 'es' ? 'Licencia y registro' : 'Licence & registration'} {company.license}<br />{company.address}</p><div><a href={`mailto:${company.email}`}>{company.email}</a><button onClick={() => onNavigate('portal', 'push')}>{t.private}<ArrowUpRight size={15} /></button></div></div></div></footer>
    <CookiePreferences t={t} language={language} />
  </div>;
}
