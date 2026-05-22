import { Search, Bell, Settings } from 'lucide-react';

interface HeaderProps {
  title: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  currentUser?: { name: string; email: string; id: string | null } | null;
}

export default function Header({ 
  title, 
  onSearchChange, 
  searchPlaceholder = "Search commands or files...",
  currentUser 
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex justify-between items-center px-10 h-20 w-full bg-white/5 backdrop-blur-md border-b border-white/10 shadow-sm text-slate-200">
      
      {/* Search Input Container */}
      <div className="flex items-center gap-6 w-1/3">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full bg-[#1e293b]/50 border border-white/10 rounded-full py-2 pl-11 pr-12 text-xs focus:outline-none focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-200 placeholder:text-slate-500"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-slate-400 select-none">
            ⌘K
          </span>
        </div>
      </div>

      {/* Title display on header center/right for spacing */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-sm border border-white/5">
          {title}
        </span>
      </div>

    </header>
  );
}
