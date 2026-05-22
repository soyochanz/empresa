import { useState, useRef } from 'react';
import { Database, Copy, Check, Terminal, Play, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { SQL_SETUP_SCRIPT, ConnectionStatus } from '../supabaseClient';

interface SupabaseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionStatus & { loading: boolean };
  onRefresh: () => void;
  onSeed: () => Promise<void>;
}

export default function SupabaseInfoModal({
  isOpen,
  onClose,
  status,
  onRefresh,
  onSeed
}: SupabaseInfoModalProps) {
  const [copied, setCopied] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSeedClick = async () => {
    setSeeding(true);
    try {
      await onSeed();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="supabase-modal-root">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md" 
        onClick={onClose}
      />
      
      {/* Central Modal Card */}
      <div className="relative bg-[#0f172a] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/80 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-slate-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-3.5 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/5">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Supabase Control Center</h3>
            <p className="text-xs text-slate-400">Database synchronization, schemas, and live diagnostic tools.</p>
          </div>
        </div>

        {/* Live Connectivity Diagnostics */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-6">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">CONEXIÓN Y SINCRO DIAGNOSTIC</h4>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {status.loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-t-white/30 border-blue-400 animate-spin" />
                  <span className="text-sm font-medium text-slate-400">Checking credentials...</span>
                </div>
              ) : status.connected && status.tablesExist ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">CONECTADO Y LISTO</span>
                </div>
              ) : status.connected && !status.tablesExist ? (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">TABLAS FALTANTES</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-400/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-xs font-bold font-mono text-rose-400 uppercase tracking-wider">ERROR DE CONFIGURACIÓN</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/5 text-slate-200 text-xs px-3.5 py-2 rounded-xl transition-all font-sans font-medium hover:scale-[1.02] active:scale-[0.98]"
                disabled={status.loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status.loading ? 'animate-spin' : ''}`} />
                Check connection
              </button>
            </div>
          </div>

          {/* Status Message */}
          {!status.loading && (
            <div className="mt-4 text-xs font-sans text-slate-400">
              {status.tablesExist ? (
                <p className="text-emerald-300">
                  All systems operating normally! The application is fully synchronized with your Supabase server (Project Ref: <code className="bg-white/10 px-1 py-0.5 rounded text-white text-[11px]">czyrolmczcwtexxgxzrg</code>). Any changes made to contacts, notes, calendar events, or activity logs will reside securely in the cloud.
                </p>
              ) : status.connected && !status.tablesExist ? (
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white mb-0.5">Tables are missing in your Supabase project.</p>
                    <p className="text-[11px] leading-relaxed">
                      Your connection keys are valid, but the tables <code className="text-white bg-slate-900 border border-white/5 px-1 rounded">contacts</code>, <code className="text-white bg-slate-900 border border-white/5 px-1 rounded">events</code>, <code className="text-white bg-slate-900 border border-white/5 px-1 rounded">notes</code>, and <code className="text-white bg-slate-900 border border-white/5 px-1 rounded">activities</code> need to be set up. Please copy the SQL script below, paste it into your Supabase dashboard's <strong>SQL Editor</strong>, and execute it!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
                  <div>
                    <p className="font-semibold text-white mb-0.5">Could not authenticate or reach Supabase server.</p>
                    <p className="text-[11px] leading-relaxed">
                      ErrorMessage: {status.error || 'Please verify network details or ensure environmental keys are filled.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step-by-Step Instructions */}
        <div className="mb-6 space-y-2">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">TABLA SETUP INSTRUCTIONS</h4>
          
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 leading-relaxed font-sans">
            <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Supabase Dashboard</a> and open the project.</li>
            <li>Click on the <strong>SQL Editor</strong> in the left sidebar menu.</li>
            <li>Click <strong>New query</strong> and paste the database creation script below.</li>
            <li>Click <strong>Run</strong> (or press cmd+Enter / ctrl+Enter) to execute.</li>
            <li>Once created, return here and click <strong>Check connection</strong>, then click <strong>Seed Templates</strong>!</li>
          </ol>
        </div>

        {/* SQL Script pre block */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 bg-slate-900/50 border border-white/5 px-2 py-1 rounded-lg">
              <Terminal className="w-3.5 h-3.5 text-blue-400" /> schema.sql
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded-xl border border-white/5 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Script
                </>
              )}
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/5 max-h-[180px] overflow-y-auto">
            <pre 
              ref={preRef} 
              className="p-4 text-[11px] text-slate-300 font-mono leading-relaxed"
            >
              {SQL_SETUP_SCRIPT}
            </pre>
          </div>
        </div>

        {/* Database Seeder Button Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-6 gap-4">
          <div className="text-left">
            <h5 className="text-xs font-bold text-white font-sans">Initialize Cloud Database Templates</h5>
            <p className="text-[11px] text-slate-400">Pre-populates the database tables with default agency contacts, notes, and metrics.</p>
          </div>

          <button
            onClick={handleSeedClick}
            disabled={seeding || !status.tablesExist}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-5 py-2.5 rounded-2xl text-slate-950 transition-all select-none hover:scale-[1.03] active:scale-[0.97] ${
              status.tablesExist 
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/15 cursor-pointer text-slate-950'
                : 'bg-slate-700/50 text-slate-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            {seeding ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-slate-950 animate-spin" />
                Seeding database...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Seed Templates
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
