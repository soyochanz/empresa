import React from 'react';
import { X, Printer, Award, Shield, CheckCircle, Briefcase, FileText } from 'lucide-react';

interface DossierModalProps {
 isOpen: boolean;
 onClose: () => void;
}

export default function DossierModal({ isOpen, onClose }: DossierModalProps) {
 if (!isOpen) return null;

 const handlePrint = () => {
 window.print();
 };

 return (
 <div id="dossier-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
  {/* Self-contained Print Stylesheet */}
  <style>{`
  @media print {
   /* Hide everything else */
   body * {
   visibility: hidden;
   }
   /* Show only the printable container and its children */
   #printable-dossier, #printable-dossier * {
   visibility: visible;
   }
   #printable-dossier {
   position: absolute;
   left: 0;
   top: 0;
   width: 100%;
   padding: 0 !important;
   margin: 0 !important;
   background: white !important;
   color: #0f172a !important;
   font-size: 12pt;
   }
   /* Ensure good contrast on white paper */
   .print-dark-text {
   color: #0f172a !important;
   }
   .print-muted-text {
   color: #475569 !important;
   }
   .print-border {
   border: 1px solid #cbd5e1 !important;
   }
   .print-bg-header {
   background-color: #f1f5f9 !important;
   }
   .print-hidden {
   display: none !important;
   }
   /* Avoid page breaks in inappropriate elements */
   .print-no-break {
   page-break-inside: avoid;
   }
  }
  `}</style>

  <div className="relative w-full max-w-4xl bg-[#090d1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] print-hidden">
  {/* Modal Header */}
  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0b1329]/50">
   <div className="flex items-center gap-2">
   <FileText className="w-5 h-5 text-amber-400" />
   <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-widest">Dossier Oficial de Ventas y Comisiones</h3>
   </div>
   <div className="flex items-center gap-3">
   <button
    onClick={handlePrint}
    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 transition-colors font-sans text-xs font-bold text-black shadow-lg shadow-amber-500/10"
    id="print-dossier-btn"
   >
    <Printer className="w-4 h-4" />
    Imprimir / Guardar como PDF
   </button>
   <button
    onClick={onClose}
    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
    id="close-dossier-btn"
   >
    <X className="w-4 h-4" />
   </button>
   </div>
  </div>

  {/* Modal Body - Scrollable Onscreen */}
  <div className="p-8 overflow-y-auto space-y-8 text-left bg-gradient-to-b from-[#090d1a] to-[#04060d]">
   
   {/* Printable Container Start */}
   <div id="printable-dossier" className="p-8 bg-slate-900/30 border border-white/5 rounded-2xl space-y-8 font-sans text-slate-300">
   
   {/* Header / Brand block */}
   <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
    <h1 className="text-2xl font-black text-white tracking-tight print-dark-text">ALTHERA SOLUTIONS</h1>
    <p className="text-xs font-mono text-amber-400 uppercase tracking-widest mt-1">Sistemas de Información & Boutique Tecnológica</p>
    </div>
    <div className="text-right md:text-right font-mono text-[10px] text-slate-400 print-muted-text">
    <p>DOCUMENTO DE INCORPORACIÓN</p>
    <p>REFERENCIA: AS-DOSSIER-2026</p>
    <p>FECHA: Julio 2026</p>
    </div>
   </div>

   {/* Quiénes Somos */}
   <div className="space-y-3">
    <div className="flex items-center gap-2">
    <Shield className="w-4 h-4 text-amber-400 print-hidden" />
    <h2 className="text-lg font-bold text-white print-dark-text">1. ¿Quiénes Somos?</h2>
    </div>
    <p className="text-sm leading-relaxed text-slate-300 print-muted-text">
    En <strong>Althera Solutions</strong> somos un estudio de diseño y desarrollo de software de alta gama. 
    Nos especializamos en crear plataformas SaaS robustas, cuadros de mando analíticos exquisitos e integraciones 
    de inteligencia artificial personalizadas. Construimos soluciones de extremo a extremo utilizando metodologías 
    ágiles de alto rendimiento, código nativo en TypeScript y bases de datos seguras de nivel empresarial.
    </p>
    <p className="text-sm leading-relaxed text-slate-300 print-muted-text">
    Nuestros proyectos van dirigidos a medianas y grandes empresas que buscan automatizar sus flujos de trabajo, 
    optimizar su rendimiento comercial y ofrecer a sus usuarios finales una interfaz con un nivel de diseño 
    excepcional y máxima fluidez.
    </p>
   </div>

   {/* Qué Buscamos de los Comerciales */}
   <div className="space-y-3">
    <div className="flex items-center gap-2">
    <Briefcase className="w-4 h-4 text-amber-400 print-hidden" />
    <h2 className="text-lg font-bold text-white print-dark-text">2. ¿Qué Buscamos en Nuestros Comerciales?</h2>
    </div>
    <p className="text-sm leading-relaxed text-slate-300 print-muted-text">
    Buscamos profesionales de ventas con una gran elocuencia, mentalidad analítica y profunda integridad comercial. 
    Nuestros representantes de ventas (comerciales) no son meros vendedores telefónicos; son <strong>asesores tecnológicos</strong>. 
    Buscamos perfiles capaces de:
    </p>
    <ul className="list-disc pl-5 text-sm space-y-1.5 text-slate-300 print-muted-text">
    <li>Identificar leads y prospectos calificados en sectores clave de alto valor.</li>
    <li>Llevar a cabo llamadas de prospección (<em>cold calling</em>) con un tono consultivo, educado y profesional.</li>
    <li>Detectar las necesidades de automatización o software a medida de cada cliente.</li>
    <li>Explicar con claridad nuestra propuesta de valor sin recurrir a falsas promesas o exageraciones técnicas.</li>
    <li>Asentar y dar seguimiento a sus prospectos con diligencia utilizando nuestra consola CRM interna.</li>
    </ul>
   </div>

   {/* Tabla de Comisiones Escalonadas */}
   <div className="space-y-4 print-no-break">
    <div className="flex items-center gap-2">
    <Award className="w-4 h-4 text-amber-400 print-hidden" />
    <h2 className="text-lg font-bold text-white print-dark-text">3. Sistema de Comisiones Escalonadas y Automáticas</h2>
    </div>
    <p className="text-sm leading-relaxed text-slate-300 print-muted-text">
    Para recompensar la constancia y el volumen de cierre, en Althera Solutions aplicamos un modelo de 
    <strong> comisiones progresivas automáticas</strong>. Tu porcentaje de comisión mensual sobre la primera venta de cada 
    cliente nuevo se recalcula automáticamente en base al número de cierres conseguidos en el período de facturación:
    </p>

    {/* Tiers Table */}
    <div className="border border-white/10 rounded-xl overflow-hidden print-border bg-[#0b1329]/20">
    <table className="w-full text-xs text-left">
     <thead>
     <tr className="bg-[#0b1329]/60 border-b border-white/10 text-slate-400 print-bg-header print-border print-dark-text font-bold">
      <th className="p-3">ETAPA</th>
      <th className="p-3">CIERRES REALIZADOS (Mensual)</th>
      <th className="p-3 text-right">COMISIÓN S/ VENTA INICIAL</th>
     </tr>
     </thead>
     <tbody className="divide-y divide-white/5 print-border print-muted-text">
     <tr className="hover:bg-white/[0.01]">
      <td className="p-3 font-medium">Etapa 1</td>
      <td className="p-3">De 1 a 3 clientes cerrados</td>
      <td className="p-3 text-right font-mono font-bold text-amber-400 print-dark-text">10.0%</td>
     </tr>
     <tr className="hover:bg-white/[0.01]">
      <td className="p-3 font-medium">Etapa 2</td>
      <td className="p-3">De 4 a 6 clientes cerrados</td>
      <td className="p-3 text-right font-mono font-bold text-amber-400 print-dark-text">11.0%</td>
     </tr>
     <tr className="hover:bg-white/[0.01]">
      <td className="p-3 font-medium">Etapa 3</td>
      <td className="p-3">De 7 a 9 clientes cerrados</td>
      <td className="p-3 text-right font-mono font-bold text-amber-400 print-dark-text">12.0%</td>
     </tr>
     <tr className="hover:bg-white/[0.01]">
      <td className="p-3 font-medium">Etapa 4</td>
      <td className="p-3">De 10 a 12 clientes cerrados</td>
      <td className="p-3 text-right font-mono font-bold text-amber-400 print-dark-text">13.5%</td>
     </tr>
     <tr className="hover:bg-white/[0.01]">
      <td className="p-3 font-medium">Etapa 5</td>
      <td className="p-3">De 13 a 14 clientes cerrados</td>
      <td className="p-3 text-right font-mono font-bold text-amber-400 print-dark-text">15.0%</td>
     </tr>
     <tr className="hover:bg-white/[0.01]">
      <td className="p-3 font-medium">Etapa 6</td>
      <td className="p-3">De 15 a 16 clientes cerrados</td>
      <td className="p-3 text-right font-mono font-bold text-amber-400 print-dark-text">16.0%</td>
     </tr>
     <tr className="hover:bg-white/[0.01]">
      <td className="p-3 font-medium">Etapa 7</td>
      <td className="p-3">Exactamente 17 clientes cerrados</td>
      <td className="p-3 text-right font-mono font-bold text-amber-400 print-dark-text">17.0%</td>
     </tr>
     <tr className="hover:bg-white/[0.01]">
      <td className="p-3 font-medium">Etapa Elite</td>
      <td className="p-3">18 o más clientes cerrados</td>
      <td className="p-3 text-right font-mono font-bold text-amber-400 print-dark-text">18.0%</td>
     </tr>
     </tbody>
    </table>
    </div>

    <p className="text-[11px] text-slate-400 leading-relaxed print-muted-text italic">
    *Nota: El sistema evalúa el volumen de clientes de forma instantánea y aplica el escalón correspondiente de manera retroactiva al cierre de mes, garantizando transparencia total en tu compensación.
    </p>
   </div>

   {/* Transparencia y Herramientas */}
   <div className="space-y-3 print-no-break">
    <div className="flex items-center gap-2">
    <CheckCircle className="w-4 h-4 text-amber-400 print-hidden" />
    <h2 className="text-lg font-bold text-white print-dark-text">4. Transparencia Absoluta y Beneficios</h2>
    </div>
    <p className="text-sm leading-relaxed text-slate-300 print-muted-text">
    En Althera Solutions creemos que un comercial motivado y con herramientas de primer nivel multiplica sus resultados. 
    Por ello ponemos a tu disposición:
    </p>
    <ul className="list-disc pl-5 text-sm space-y-1.5 text-slate-300 print-muted-text">
    <li><strong>Consola de Representante en tiempo real:</strong> Para ver tus estadísticas, leads, tasas de conversión y comisiones acumuladas al instante.</li>
    <li><strong>Asociación Automática de Clientes:</strong> Tan pronto como tu lead se convierta en cliente y realice el primer abono en el software de finanzas, tu comisión se consolida automáticamente.</li>
    <li><strong>Soporte Directo del Equipo Técnico:</strong> Ofrecemos acompañamiento para resolver dudas técnicas complejas de tus prospectos durante las etapas avanzadas de la negociación.</li>
    </ul>
   </div>

   {/* Footer / Firmas */}
   <div className="pt-8 border-t border-white/10 flex justify-between text-xs font-mono text-slate-500 print-muted-text">
    <p>© 2026 Althera Solutions. Todos los derechos reservados.</p>
    <p>CONFIDENCIALIDAD NIVEL BAJO - PARA USO INTERNO</p>
   </div>

   </div>
   {/* Printable Container End */}

  </div>

  {/* Modal Footer */}
  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-[#0b1329]/50 print-hidden">
   <button
   onClick={onClose}
   className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-sans text-xs font-bold text-slate-300"
   >
   Cerrar Dossier
   </button>
  </div>
  </div>
 </div>
 );
}
