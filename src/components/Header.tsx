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
      
      {/* Spacer where search used to be */}
      <div className="w-1/3" />

      {/* Title display on header center/right for spacing */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-slate-500 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-sm border border-white/5">
          {title}
        </span>
      </div>

    </header>
  );
}
