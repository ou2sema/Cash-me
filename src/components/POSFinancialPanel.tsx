import { useState, type ReactNode } from 'react';
import { CartItem, TransactionRecord } from '../types';

interface POSFinancialPanelProps {
  cartItems: CartItem[];
  total: number;
  numpadBuffer: string;
  onNumpad: (key: string) => void;
  onRemoveItem: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  articlesVendus: number;
  transactions: TransactionRecord[];
  activeTableNo?: string | null;
  tables: { id: string; nom: string; isVIP?: boolean; hasFlame?: boolean }[];
  activeTableId: string;
  onSelectTable: (id: string) => void;
  getTableTotal: (id: string) => number;
}

const NUMPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '×', '0', '⌫'];

const STAT_ROWS = [
  { label: 'Articles Vendus', key: 'articles', icon: '📦' },
  { label: 'Tickets du Jour', key: 'tickets', icon: '🧾' },
  { label: 'Table Sélectionnée', key: 'tables', icon: '🪑' },
  { label: 'Temps Moyen Service', key: 'temps', icon: '⏱' },
  { label: 'Optimisation IA', key: 'ia', icon: '🤖' },
];

export function POSFinancialPanel({
  cartItems,
  total,
  numpadBuffer,
  onNumpad,
  onRemoveItem,
  onClear,
  onCheckout,
  articlesVendus,
  transactions,
  activeTableNo,
  tables,
  activeTableId,
  onSelectTable,
  getTableTotal
}: POSFinancialPanelProps) {
  const [showTableSelect, setShowTableSelect] = useState(false);
  const ticketsJour = transactions.length;

  const stats: Record<string, ReactNode> = {
    articles: <span style={{ color: 'var(--pos-cyan)', fontFamily: 'var(--font-mono)' }}>{articlesVendus}</span>,
    tickets: <span style={{ color: 'var(--pos-amber)', fontFamily: 'var(--font-mono)' }}>{ticketsJour}</span>,
    tables: (
      <button 
        onClick={() => setShowTableSelect(true)}
        className="text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition active:scale-95 text-ellipsis overflow-hidden max-w-[120px]"
        style={{ 
          color: activeTableNo ? 'var(--pos-purple)' : 'var(--pos-text-dim)', 
          background: activeTableNo ? 'var(--pos-purple-dim)' : 'var(--pos-surface-3)',
          border: `1px solid ${activeTableNo ? 'var(--pos-purple-border)' : 'var(--pos-border)'}`,
          fontFamily: 'var(--font-mono)' 
        }}
      >
        {activeTableNo ? `TABLE ${activeTableNo.toUpperCase()}` : 'AUCUNE'}
      </button>
    ),
    temps: <span style={{ color: 'var(--pos-text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>00:24:12</span>,
    ia: (
      <div className="flex items-center gap-2">
        <div
          className="rounded-full animate-pulse"
          style={{ width: '6px', height: '6px', background: 'var(--pos-green)', boxShadow: '0 0 8px var(--pos-green)' }}
        />
        <span style={{ color: 'var(--pos-green)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>ACTIF</span>
      </div>
    ),
  };

  return (
    <aside
      className="flex flex-col h-full shrink-0 select-none relative overflow-hidden"
      style={{
        width: '320px',
        background: 'var(--pos-surface)',
        borderLeft: '1px solid var(--pos-border)',
      }}
    >
      {/* ── IN-PLACE TABLE SELECTOR OVERLAY ── */}
      {showTableSelect && (
        <div className="absolute inset-0 z-30 flex flex-col p-4 animate-in fade-in duration-100" style={{ background: 'var(--pos-bg)' }}>
          <div className="flex items-center justify-between pb-2 mb-3 border-b" style={{ borderColor: 'var(--pos-border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--pos-purple)' }}>
              🪑 SÉLECTION DE TABLE
            </span>
            <button 
              onClick={() => setShowTableSelect(false)}
              className="text-slate-400 hover:text-white font-bold text-base px-2 py-1 cursor-pointer transition active:scale-90"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2.5 max-h-[460px] pr-1 py-1 scrollbar-thin">
            {tables.map((table) => {
              const tableTotal = getTableTotal(table.id);
              const isOccupied = tableTotal > 0;
              const isSelected = table.id === activeTableId;

              return (
                <button
                  key={table.id}
                  onClick={() => {
                    onSelectTable(table.id);
                    setShowTableSelect(false);
                  }}
                  className="rounded-xl flex flex-col items-center justify-center p-3 transition duration-100 active:scale-95 text-center cursor-pointer relative"
                  style={{
                    background: isSelected 
                      ? 'var(--pos-purple-dim)' 
                      : isOccupied 
                        ? 'var(--pos-amber-dim)' 
                        : 'var(--pos-surface-2)',
                    border: `1px solid ${
                      isSelected 
                        ? 'var(--pos-purple)' 
                        : isOccupied 
                          ? 'var(--pos-amber-border)' 
                          : 'var(--pos-border)'
                    }`,
                    minHeight: '86px'
                  }}
                >
                  <span className="font-extrabold text-xs tracking-wider font-sans" style={{ color: isSelected ? 'var(--pos-purple)' : 'var(--pos-text)' }}>
                    {table.nom.toUpperCase()}
                  </span>

                  <div className="flex items-center gap-1.5 mt-1.5 justify-center">
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ 
                        background: isOccupied ? 'var(--pos-amber)' : 'var(--pos-green)',
                        boxShadow: isOccupied ? '0 0 6px var(--pos-amber)' : '0 0 6px var(--pos-green)'
                      }} 
                    />
                    <span className="font-sans font-medium uppercase" style={{ fontSize: '8px', color: 'var(--pos-text-dim)' }}>
                      {isOccupied ? 'Occupée' : 'Libre'}
                    </span>
                  </div>

                  {isOccupied && (
                    <span className="font-mono mt-1" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--pos-cyan)' }}>
                      {tableTotal.toFixed(3)}
                      <span className="text-[7.5px] ml-0.5" style={{ color: 'var(--pos-text-dim)' }}>DT</span>
                    </span>
                  )}
                  {table.isVIP && (
                    <span className="absolute top-1 right-1 text-[8px] px-1 rounded-sm font-extrabold" style={{ background: '#eab308', color: '#000' }}>
                      VIP
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowTableSelect(false)}
            className="w-full mt-auto py-2.5 rounded-xl border font-sans text-[10px] font-bold tracking-wider cursor-pointer text-center uppercase hover:bg-white/5 active:scale-95 shrink-0 transition"
            style={{ 
              borderColor: 'var(--pos-border)', 
              color: 'var(--pos-text-muted)' 
            }}
          >
            Fermer sans changer
          </button>
        </div>
      )}
      {/* ── MONTANT TOTAL ── */}
      <div
        className="px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--pos-border)' }}
      >
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--pos-text-muted)', marginBottom: '4px' }}>
          MONTANT TOTAL
        </div>
        <div
          className="font-mono flex items-baseline"
          style={{
            fontSize: '38px',
            fontWeight: 700,
            color: 'var(--pos-cyan)',
            letterSpacing: '0.05em',
            lineHeight: 1.1,
            textShadow: 'var(--pos-cyan-glow)',
          }}
        >
          {total.toFixed(3)}
          <span
            style={{
              fontSize: '18px',
              fontWeight: 400,
              color: 'var(--pos-text-dim)',
              marginLeft: '8px',
              letterSpacing: '0.1em',
            }}
          >
            DT
          </span>
        </div>
        {numpadBuffer && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--pos-amber)',
              fontFamily: 'var(--font-mono)',
              marginTop: '4px',
            }}
          >
            ×{numpadBuffer} prochaine sélection
          </div>
        )}
      </div>

      {/* ── PANIER ── */}
      <div
        className="px-4 py-3 flex-1 overflow-y-auto min-h-[120px] max-h-[220px] scrollbar-thin"
        style={{ borderBottom: '1px solid var(--pos-border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'var(--pos-text-muted)' }}>
            COMMANDE EN COURS
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={onClear}
              style={{ fontSize: '10px', color: 'var(--pos-red)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 650 }}
            >
              VIDER
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--pos-text-muted)', textAlign: 'center', padding: '16px 0' }} className="font-sans">
            Aucun article
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 pr-1">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-0.5 border-b border-slate-900/30">
                <div
                  className="rounded-full shrink-0"
                  style={{
                    width: '6px',
                    height: '6px',
                    background: item.accent === 'cyan' ? 'var(--pos-cyan)'
                      : item.accent === 'amber' ? 'var(--pos-amber)'
                      : item.accent === 'green' ? 'var(--pos-green)'
                      : 'var(--pos-purple)',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--pos-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="font-sans font-medium">
                  {item.name}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--pos-text-dim)', fontWeight: 600 }}>
                  ×{item.quantity}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--pos-cyan)', minWidth: '55px', textAlign: 'right', fontWeight: 650 }}>
                  {(item.price * item.quantity).toFixed(3)}
                </span>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  style={{ color: 'var(--pos-red)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '15px', fontWeight: 700 }}
                  className="active:scale-90"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RÉSUMÉ DU JOUR ── */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--pos-border)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'var(--pos-text-muted)', marginBottom: '8px' }}>
          RÉSUMÉ DU SERVICE
        </div>
        <div className="flex flex-col gap-1.5">
          {STAT_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '12px' }}>{row.icon}</span>
                <span style={{ fontSize: '11px', color: 'var(--pos-text-dim)' }} className="font-sans">{row.label}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>{stats[row.key]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PAVÉ NUMÉRIQUE ── */}
      <div className="px-4 py-3 shrink-0">
        <div style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'var(--pos-text-muted)', marginBottom: '6px' }}>
          PAVÉ NUMÉRIQUE MULTI-QUANTITÉ
        </div>
        <div
          className="grid grid-cols-3"
          style={{ gap: '6px' }}
        >
          {NUMPAD_KEYS.map((key) => {
            const isAction = key === '×' || key === '⌫';
            return (
              <button
                key={key}
                id={`numpad-btn-${key === '⌫' ? 'del' : key === '×' ? 'clear' : key}`}
                onClick={() => onNumpad(key)}
                className="flex items-center justify-center rounded-xl transition-all duration-100 active:scale-90"
                style={{
                  height: '46px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: key === '⌫' ? '16px' : '18px',
                  fontWeight: 650,
                  background: isAction ? 'var(--pos-red-dim)' : 'var(--pos-surface-2)',
                  border: `1px solid ${isAction ? 'rgba(239,68,68,0.3)' : 'var(--pos-border)'}`,
                  color: isAction ? 'var(--pos-red)' : 'var(--pos-text)',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = isAction ? 'rgba(239, 68, 68, 0.2)' : 'var(--pos-cyan-dim)';
                  el.style.borderColor = isAction ? 'rgba(239, 68, 68, 0.6)' : 'var(--pos-cyan-border)';
                  if (!isAction) el.style.color = 'var(--pos-cyan)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = isAction ? 'var(--pos-red-dim)' : 'var(--pos-surface-2)';
                  el.style.borderColor = isAction ? 'rgba(239, 68, 68, 0.3)' : 'var(--pos-border)';
                  el.style.color = isAction ? 'var(--pos-red)' : 'var(--pos-text)';
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ENCAISSEMENT ── */}
      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={onCheckout}
          id="checkout-trigger-btn"
          disabled={cartItems.length === 0}
          className="w-full rounded-xl flex items-center justify-center gap-3 transition-all duration-150 active:scale-98"
          style={{
            height: '56px',
            background: cartItems.length > 0
              ? 'linear-gradient(135deg, var(--pos-cyan) 0%, #0090cc 100%)'
              : 'var(--pos-surface-2)',
            border: `1px solid ${cartItems.length > 0 ? 'var(--pos-cyan)' : 'var(--pos-border)'}`,
            color: cartItems.length > 0 ? 'var(--pos-bg)' : 'var(--pos-text-muted)',
            fontFamily: 'var(--font-pos)',
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            cursor: cartItems.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: cartItems.length > 0 ? 'var(--pos-cyan-glow)' : 'none',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor" stroke="none" />
          </svg>
          ENCAISSEMENT
        </button>

        {cartItems.length > 0 && (
          <div
            className="text-center mt-2 font-mono"
            style={{ fontSize: '10px', color: 'var(--pos-text-muted)' }}
          >
            {cartItems.length} article{cartItems.length > 1 ? 's' : ''} · {total.toFixed(3)} DT
          </div>
        )}
      </div>
    </aside>
  );
}
