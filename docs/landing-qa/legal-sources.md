# Legal implementation scope — 12 October 2026

Company identity from the user-supplied trade licence (not copied into public assets): Althera Solutions - F.Z.C; licence/registration 58295; Office C1 1F SF3035, Ajman Free Zone C1 Building. Business email confirmed by owner. No personal passport/shareholder information published.

Official sources consulted:
- UAE Federal Decree Law 45/2021, personal data protection: https://uaelegislation.gov.ae/en/legislations/1972 . The official page was blocked to the research tool; its published UAE Legislation text was readable at https://littdb.sfo2.cdn.digitaloceanspaces.com/litt/AE/UAELegislation/telecommunication__technology_and_space/federal_decree_law/1972.html . Relevant subjects: transparency, consent/withdrawal, rights, processing purpose, security and cross-border transfers.
- UAE Federal Decree Law 14/2023, modern technology-based trade: https://uaelegislation.gov.ae/en/legislations/2150 . Published text: https://littdb.sfo2.cdn.digitaloceanspaces.com/litt/AE/UAELegislation/economy_and_business/federal_decree_law/2150.html . Relevant subjects: trader identity, contract/service information, consumer rights.
- UAE government overview: https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws

Implemented bilingual operator information, privacy, storage/cookies, service terms, unchecked enquiry consent with timestamp/version in the saved message, optional analytics blocked by default, equally available reject/accept, reopening and withdrawal. No assertion that a particular banner design or four exact page titles are universally mandated by UAE law. The landing is an enquiry site, not a checkout. Service prices, taxes, milestones, delivery and cancellation/refund details belong in each accepted proposal before purchase.

Limits: this is an implementation based on observed site behaviour, not a legal compliance certification. Provider contracts, actual transfer safeguards, retention operations, and obligations from selling into other jurisdictions require company/legal review. No blanket refund exclusion or invented VAT number. Cookies text covers local/session storage actually used, and notes private-area authentication separately. Self-hosted fonts remove the previous automatic Google Fonts request.

Country selection: same-origin /api/locale uses the hosting platform's country header, not GPS or a third-party geolocation request. Vercel header documentation: https://vercel.com/docs/headers/request-headers#x-vercel-ip-country . Explicit language URL then saved preference take precedence over country; browser language is only a fallback when country is absent. Country accuracy depends on host header/VPN; no precise geolocation guarantee.
