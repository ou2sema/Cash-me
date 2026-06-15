import { Product, TeaRoomUser, CategoryItem } from '../types';

interface POSProductGridProps {
  products: Product[];
  activeCategory: string;
  numpadBuffer: string;
  onAddProduct: (product: Product) => void;
  currentUser?: TeaRoomUser | null;
  categories?: CategoryItem[];
  onOpenAddProduct?: () => void;
}

const ACCENT_TOKENS: Record<Product['accent'], { color: string; dim: string; border: string; glow: string }> = {
  cyan: {
    color: 'var(--pos-cyan)',
    dim: 'var(--pos-cyan-dim)',
    border: 'var(--pos-cyan-border)',
    glow: 'var(--pos-cyan-glow)',
  },
  amber: {
    color: 'var(--pos-amber)',
    dim: 'var(--pos-amber-dim)',
    border: 'var(--pos-amber-border)',
    glow: '0 0 18px rgba(245,158,11,0.35)',
  },
  green: {
    color: 'var(--pos-green)',
    dim: 'var(--pos-green-dim)',
    border: 'var(--pos-green-border)',
    glow: '0 0 18px rgba(16,185,129,0.35)',
  },
  purple: {
    color: 'var(--pos-purple)',
    dim: 'var(--pos-purple-dim)',
    border: 'var(--pos-purple-border)',
    glow: '0 0 18px rgba(168,85,247,0.35)',
  },
};

const CATEGORY_ICONS: Record<Product['accent'], string> = {
  cyan:   '🫖',
  amber:  '☕',
  green:  '🍵',
  purple: '💨',
};

const CATEGORY_LABELS: Record<string, string> = {
  theiere: 'Théière & Café',
  cristal: 'Cristal de Glace',
  narguile: 'Narguilé',
};

export function POSProductGrid({ 
  products, 
  activeCategory, 
  numpadBuffer, 
  onAddProduct,
  currentUser,
  categories = [],
  onOpenAddProduct
}: POSProductGridProps) {
  const filtered = products.filter((p) => p.category === activeCategory);

  // Dynamic category name lookup from db categories list or fallback
  const activeCatObj = categories.find(c => c.id === activeCategory);
  const activeCategoryTitle = activeCatObj 
    ? activeCatObj.nom 
    : (CATEGORY_LABELS[activeCategory] || activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1));

  return (
    <main
      className="flex-1 flex flex-col h-full overflow-hidden select-none"
      style={{ background: 'var(--pos-bg)' }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--pos-border)' }}
      >
        <div>
          <div
            className="font-sans"
            style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--pos-text-muted)', marginBottom: '2px' }}
          >
            CATÉGORIE ACTIVE
          </div>
          <div className="font-sans animate-pulse" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--pos-cyan)' }}>
            {activeCategoryTitle}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {numpadBuffer && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2 font-mono"
              style={{
                background: 'var(--pos-amber-dim)',
                border: '1px solid var(--pos-amber-border)',
                color: 'var(--pos-amber)',
                fontSize: '20px',
                fontWeight: 750,
                minWidth: '80px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--pos-text-dim)', fontWeight: 600 }}>QTÉ</span>
              <span>{numpadBuffer}</span>
            </div>
          )}

          {/* Contextual "+ Ajouter un article" button shown ONLY for admin or gerant. Hidden for serveur */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'gerant') && onOpenAddProduct && (
            <button
              onClick={onOpenAddProduct}
              className="rounded-xl px-4 py-2 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition duration-155 active:scale-95 cursor-pointer flex items-center gap-1 shadow-[0_0_12px_rgba(6,182,212,0.25)] select-none border border-cyan-400/20"
              title="Ajouter un produit directement dans cette catégorie"
            >
              <span>+ Ajouter un article</span>
            </button>
          )}

          <div
            className="rounded-xl px-4 py-2 text-xs"
            style={{
              background: 'var(--pos-surface)',
              border: '1px solid var(--pos-border)',
              color: 'var(--pos-text-dim)',
              fontWeight: 600,
            }}
          >
            {filtered.length} {filtered.length > 1 ? "articles" : "article"}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <span className="text-4xl">⚠️</span>
            <p className="mt-2 text-sm font-bold uppercase tracking-wider">Aucun produit dans cette catégorie</p>
            <p className="text-xs text-slate-400 mt-1 uppercase font-mono">Ajoutez-les depuis l'onglet Stocks</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            style={{
              gap: '12px',
            }}
          >
            {filtered.map((product) => {
              const tk = ACCENT_TOKENS[product.accent];
              const icon = CATEGORY_ICONS[product.accent];
              return (
                <button
                  key={product.id}
                  id={`prod-btn-${product.id}`}
                  onClick={() => onAddProduct(product)}
                  className="flex flex-col rounded-xl text-left transition-all duration-150 active:scale-95"
                  style={{
                    background: 'var(--pos-surface-2)',
                    border: `1px solid ${tk.border}`,
                    padding: '0',
                    overflow: 'hidden',
                    touchAction: 'manipulation',
                    cursor: 'pointer',
                    minHeight: '110px',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = tk.glow;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = tk.color;
                    (e.currentTarget as HTMLButtonElement).style.background = tk.dim;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = tk.border;
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--pos-surface-2)';
                  }}
                >
                  {/* Top accent strip */}
                  <div style={{ height: '3px', background: tk.color, width: '100%' }} />

                  <div className="flex flex-col flex-1 p-3 gap-2 w-full">
                    {/* Icon + name */}
                    <div className="flex items-start gap-2">
                      <span className="text-2xl" style={{ lineHeight: 1 }}>{icon}</span>
                      <span
                        className="font-sans"
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--pos-text)',
                          lineHeight: 1.3,
                          letterSpacing: '0.01em',
                          textTransform: 'uppercase',
                          flex: 1,
                        }}
                      >
                        {product.name}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="mt-auto flex items-baseline">
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: tk.color,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {product.price.toFixed(3)}
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '10px',
                          color: 'var(--pos-text-dim)',
                          marginLeft: '4px',
                        }}
                      >
                        DT
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
