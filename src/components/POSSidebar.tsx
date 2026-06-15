import type { ReactNode } from 'react';
import { TeaRoomUser } from '../types';

interface POSSidebarProps {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  currentTime: Date;
  currentUser: TeaRoomUser | null;
  onSelectUserTrigger?: () => void;
  onLock?: () => void;
  categories: { id: string; nom: string }[];
  onOpenCatalog?: () => void;
  onOpenJournal?: () => void;
}

const getCategoryIcon = (categoryNom: string) => {
  const norm = categoryNom.toLowerCase();
  
  if (norm.includes('thé') || norm.includes('the') || norm.includes('café') || norm.includes('chaud')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M4 6h12a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6H8a4 4 0 0 1-4-4V6z" />
        <path d="M18 8h2a2 2 0 0 1 0 4h-2" />
        <path d="M8 6V4" />
        <path d="M12 6V4" />
      </svg>
    );
  }
  
  if (norm.includes('cristal') || norm.includes('glace') || norm.includes('frais') || norm.includes('jus') || norm.includes('froid') || norm.includes('soda') || norm.includes('eau')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  
  if (norm.includes('narg') || norm.includes('chich') || norm.includes('hookah') || norm.includes('shisha') || norm.includes('smoke')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M12 3c0 0-3 3-3 7s3 5 3 5" />
        <path d="M12 15v6" />
        <path d="M9 21h6" />
        <ellipse cx="14" cy="8" rx="4" ry="3" />
        <path d="M18 8c2 0 3 1 3 2s-1 2-3 2" />
      </svg>
    );
  }
  
  if (norm.includes('patiss') || norm.includes('gourmand') || norm.includes('manger') || norm.includes('sucr') || norm.includes('gâteau') || norm.includes('dessert') || norm.includes('gaufre') || norm.includes('crepe') || norm.includes('choc')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" />
    </svg>
  );
};

export function POSSidebar({
  activeCategory,
  onCategoryChange,
  currentTime,
  currentUser,
  onSelectUserTrigger,
  onLock,
  categories,
  onOpenCatalog,
  onOpenJournal,
}: POSSidebarProps) {
  const timeStr = currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <aside
      className="flex flex-col h-full shrink-0 select-none pb-2"
      style={{
        width: '200px',
        background: 'var(--pos-surface)',
        borderRight: '1px solid var(--pos-border)',
      }}
    >
      {/* Clock */}
      <div
        className="px-4 pt-4 pb-2 text-center font-mono"
        style={{
          fontSize: '22px',
          color: 'var(--pos-cyan)',
          letterSpacing: '0.1em',
          textShadow: 'var(--pos-cyan-glow)',
        }}
      >
        {timeStr}
      </div>

      {/* User Profile */}
      {currentUser ? (
        <div
          className="mx-3 mb-4 rounded-xl p-3 flex items-center gap-3 transition-opacity active:opacity-80 cursor-pointer"
          onClick={onSelectUserTrigger}
          style={{ background: 'var(--pos-cyan-dim)', border: '1px solid var(--pos-cyan-border)' }}
        >
          <div
            className="rounded-full flex items-center justify-center shrink-0"
            style={{
              width: '36px',
              height: '36px',
              background: 'var(--pos-cyan)',
              color: 'var(--pos-bg)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: '10px', color: 'var(--pos-text-dim)', fontWeight: 650 }}>{currentUser.role.toUpperCase()}</div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--pos-cyan)',
                fontWeight: 700,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser.nom.toUpperCase()}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="mx-3 mb-4 rounded-xl p-3 flex items-center gap-3 transition-opacity active:opacity-80 cursor-pointer"
          onClick={onSelectUserTrigger}
          style={{ background: 'var(--pos-surface-2)', border: '1px solid var(--pos-border)' }}
        >
          <div
            className="rounded-full flex items-center justify-center shrink-0"
            style={{
              width: '36px',
              height: '36px',
              background: 'var(--pos-text-dim)',
              color: 'var(--pos-bg)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-800">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: '10px', color: 'var(--pos-text-dim)' }}>SANS PROFIL</div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--pos-text-dim)',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              SE CONNECTER
            </div>
          </div>
        </div>
      )}

      {/* Brand */}
      <div className="px-4 pb-5 text-center">
        <div
          className="flex justify-center mb-2"
          style={{ color: 'var(--pos-cyan)' }}
        >
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
            <path d="M10 16h20a2 2 0 0 1 2 2v8a10 10 0 0 1-10 10H18a8 8 0 0 1-8-8V16z" strokeWidth="2" />
            <path d="M32 20h4a4 4 0 0 1 0 8h-4" strokeWidth="2" />
            <path d="M17 16V12M23 16V12" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 38v4" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 42h16" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: 'var(--pos-text)',
          }}
        >
          CAFÉ MAAZIM
        </div>
        <div
          style={{
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: 'var(--pos-cyan)',
            marginTop: '2px',
          }}
        >
          SALON DE THÉ TECHNO
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--pos-border)', margin: '0 12px 16px' }} />

      {/* Menu label */}
      <div
        className="px-4 mb-3"
        style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--pos-text-muted)' }}
      >
        MENU CATÉGORIES
      </div>

      {/* Categories */}
      <nav className="flex flex-col gap-2 px-3 flex-1 overflow-y-auto">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`cat-btn-${cat.id}`}
              onClick={() => onCategoryChange(cat.id)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 w-full text-left transition-all duration-200 active:scale-95"
              style={{
                background: isActive ? 'var(--pos-cyan-dim)' : 'transparent',
                border: isActive ? '1px solid var(--pos-cyan-border)' : '1px solid transparent',
                color: isActive ? 'var(--pos-cyan)' : 'var(--pos-text-dim)',
                boxShadow: isActive ? 'var(--pos-cyan-glow)' : 'none',
                touchAction: 'manipulation',
                minHeight: '48px',
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.5 }}>{getCategoryIcon(cat.nom)}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>
                {cat.nom}
              </span>
              {isActive && (
                <div
                  className="ml-auto rounded-full"
                  style={{ width: '6px', height: '6px', background: 'var(--pos-cyan)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="px-3 pt-2">
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: 'var(--pos-surface-2)', border: '1px solid var(--pos-border)' }}
        >
          <div style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'var(--pos-text-muted)', marginBottom: '4px' }}>
            SYSTÈME
          </div>
          <div className="flex items-center justify-center gap-2">
            <div
              className="rounded-full"
              style={{
                width: '6px',
                height: '6px',
                background: 'var(--pos-green)',
                boxShadow: '0 0 8px var(--pos-green)',
              }}
            />
            <span style={{ fontSize: '10px', color: 'var(--pos-green)', fontWeight: 600 }}>EN LIGNE</span>
          </div>
        </div>
      </div>

      {/* Admin Action Buttons */}
      <div className="px-3 pt-1.5 flex flex-col gap-1 flex-shrink-0">
        {currentUser?.role === "serveur" ? (
          <button
            disabled
            className="w-full py-2 px-3 rounded-xl border border-dotted border-slate-800 bg-slate-950/40 text-slate-500 font-mono text-[9px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1 opacity-60 cursor-not-allowed"
            style={{ transitionProperty: 'all' }}
            title="Accès restreint - Admin/Gérant requis"
          >
            🔒 Menu [SERV]
          </button>
        ) : (
          <button
            onClick={() => { if (onOpenCatalog) onOpenCatalog(); }}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-805 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/40 font-mono text-[9px] font-bold uppercase tracking-wider text-center transition cursor-pointer active:scale-95"
            style={{ transitionProperty: 'all' }}
          >
            📂 Menu
          </button>
        )}

        {currentUser?.role === "serveur" ? (
          <button
            disabled
            className="w-full py-2 px-3 rounded-xl border border-dotted border-slate-800 bg-slate-950/40 text-slate-500 font-mono text-[9px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1 opacity-60 cursor-not-allowed"
            style={{ transitionProperty: 'all' }}
            title="Accès restreint - Admin/Gérant requis"
          >
            🔒 Journal Financier
          </button>
        ) : (
          <button
            onClick={() => { if (onOpenJournal) onOpenJournal(); }}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-cyan-805 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/40 font-mono text-[9px] font-bold uppercase tracking-wider text-center transition cursor-pointer active:scale-95"
            style={{ transitionProperty: 'all' }}
          >
            🧾 Journal Financier
          </button>
        )}
      </div>

      {/* Return to Plan & Lock buttons */}
      <div className="px-3 py-2 flex flex-col gap-1.5 shrink-0 mt-2">
        <button
          onClick={onLock}
          className="w-full py-2.5 px-3 rounded-xl border border-dashed border-amber-905 bg-amber-950/20 text-amber-500 hover:bg-amber-950/40 font-mono text-[9px] font-bold uppercase tracking-wider text-center transition cursor-pointer active:scale-95"
          style={{ transitionProperty: 'all' }}
        >
          🔒 SÉCURISER TOUCHE
        </button>
      </div>

    </aside>
  );
}
