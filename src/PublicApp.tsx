import { useEffect, useState } from 'react';
import LandingScreen from './components/LandingScreen';
import type { PartnerCompany } from './types';

export default function PublicApp() {
  const [partners, setPartners] = useState<PartnerCompany[]>([]);
  useEffect(() => {
    // Optional partner logos must never delay the public page or initialize
    // the CRM. Fetch them only when the visitor approaches the portfolio.
    const portfolio = document.getElementById('proyectos');
    if (!portfolio) return;
    let active = true;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      import('./supabaseClient').then(({ db }) => db.getPartners())
        .then(items => { if (active) setPartners(items); })
        .catch(() => { /* Optional logos do not block the landing. */ });
    }, { rootMargin: '300px' });
    observer.observe(portfolio);
    return () => { active = false; observer.disconnect(); };
  }, []);
  return <LandingScreen partners={partners} onNavigate={() => window.location.assign('/portal')} />;
}
