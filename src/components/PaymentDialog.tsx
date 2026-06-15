import { useState, type CSSProperties } from 'react';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (method: string) => void;
}

const METHODS = [
  { id: 'especes', label: 'ESPÈCES', icon: '💵' },
  { id: 'carte', label: 'CARTE / TND', icon: '💳' },
  { id: 'mobile', label: 'MOBILE PAY', icon: '📱' },
];

export function PaymentDialog({ open, onClose, total, onPaymentComplete }: PaymentDialogProps) {
  const [method, setMethod] = useState('especes');
  const [cashInput, setCashInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const cashVal = parseFloat(cashInput) || 0;
  const change = Math.max(0, cashVal - total);
  const canPay = method !== 'especes' || cashVal >= total;

  const handlePay = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 800));
    setProcessing(false);
    setSuccess(true);
    await new Promise((r) => setTimeout(r, 1100));
    setSuccess(false);
    setCashInput('');
    setMethod('especes');
    const label = METHODS.find((m) => m.id === method)?.label ?? method;
    onPaymentComplete(label);
  };

  const handleClose = () => {
    setCashInput('');
    setMethod('especes');
    setSuccess(false);
    onClose();
  };

  const dialogStyle: CSSProperties = {
    background: 'var(--pos-surface)',
    border: '1px solid var(--pos-cyan-border)',
    color: 'var(--pos-text)',
    fontFamily: 'var(--font-pos)',
    boxShadow: 'var(--pos-cyan-glow), 0 25px 60px rgba(0,0,0,0.8)',
    maxWidth: '440px',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div 
        style={dialogStyle} 
        className="relative rounded-2xl w-full p-6 overflow-hidden shadow-2xl flex flex-col scale-in animate-in zoom-in-95 duration-150 border"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-900/40">
          <h3 style={{ color: 'var(--pos-cyan)', letterSpacing: '0.15em', fontSize: '13px', fontWeight: 800 }}>
            ENCAISSEMENT TACTILE
          </h3>
          <button 
            onClick={handleClose} 
            className="text-slate-450 hover:text-slate-200 cursor-pointer text-lg font-bold p-1 active:scale-90"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <div
              className="rounded-full flex items-center justify-center animate-bounce"
              style={{
                width: '74px',
                height: '74px',
                background: 'var(--pos-green-dim)',
                border: '2px solid var(--pos-green)',
                boxShadow: '0 0 30px rgba(16,185,129,0.4)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '36px', height: '36px', color: 'var(--pos-green)' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--pos-green)', letterSpacing: '0.1em' }} className="font-sans">
              PAIEMENT VALIDÉ
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', color: 'var(--pos-cyan)' }}>
              {total.toFixed(3)} DT
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-left">
            {/* Total */}
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--pos-surface-2)', border: '1px solid var(--pos-border)' }}
            >
              <div style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--pos-text-muted)', marginBottom: '4px' }}>
                MONTANT À PERCEVOIR
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '34px',
                  fontWeight: 700,
                  color: 'var(--pos-cyan)',
                  textShadow: 'var(--pos-cyan-glow)',
                }}
              >
                {total.toFixed(3)}
                <span style={{ fontSize: '15px', color: 'var(--pos-text-dim)', marginLeft: '8px' }}>DT</span>
              </div>
            </div>

            {/* Method selector */}
            <div>
              <div style={{ fontSize: '10.5px', letterSpacing: '0.12em', color: 'var(--pos-text-muted)', marginBottom: '8px' }}>
                MODE DE RÈGLEMENT
              </div>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => {
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-all duration-150 active:scale-95"
                      style={{
                        background: active ? 'var(--pos-cyan-dim)' : 'var(--pos-surface-2)',
                        border: `1px solid ${active ? 'var(--pos-cyan)' : 'var(--pos-border)'}`,
                        color: active ? 'var(--pos-cyan)' : 'var(--pos-text-dim)',
                        boxShadow: active ? 'var(--pos-cyan-glow)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{m.icon}</span>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.05em' }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash input */}
            {method === 'especes' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                <div style={{ fontSize: '10px', letterSpacing: '0.12em', color: 'var(--pos-text-muted)', marginBottom: '6px' }}>
                  ESPÈCES REMISES EN DT (CAISSE)
                </div>
                <input
                  type="text"
                  placeholder={total.toFixed(3)}
                  value={cashInput}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                    setCashInput(cleaned);
                  }}
                  className="w-full rounded-xl px-4 outline-none text-left"
                  style={{
                    height: '46px',
                    background: 'var(--pos-surface-2)',
                    border: `1px solid ${cashVal >= total && cashInput ? 'var(--pos-green-border)' : 'var(--pos-border)'}`,
                    color: 'var(--pos-text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '18px',
                  }}
                />
                {cashInput && (
                  <div
                    className="mt-2 flex justify-between px-1"
                    style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                  >
                    {cashVal >= total ? (
                      <>
                        <span style={{ color: 'var(--pos-text-dim)' }}>Rendu monnaie:</span>
                        <span style={{ color: 'var(--pos-green)', fontWeight: 700 }}>
                          {change.toFixed(3)} DT
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: 'var(--pos-text-dim)' }}>Solde restant:</span>
                        <span style={{ color: 'var(--pos-red)', fontWeight: 700 }}>
                          {(total - cashVal).toFixed(3)} DT
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl transition-all duration-150 active:scale-95 text-xs"
                style={{
                  height: '46px',
                  background: 'var(--pos-surface-2)',
                  border: '1px solid var(--pos-border)',
                  color: 'var(--pos-text-dim)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                ANNULER
              </button>
              <button
                onClick={handlePay}
                disabled={!canPay || processing}
                className="flex-2 rounded-xl transition-all duration-150 active:scale-95"
                style={{
                  height: '46px',
                  flex: 2,
                  background: canPay
                    ? 'linear-gradient(135deg, var(--pos-cyan) 0%, #0090cc 100%)'
                    : 'var(--pos-surface-2)',
                  border: `1px solid ${canPay ? 'var(--pos-cyan)' : 'var(--pos-border)'}`,
                  color: canPay ? 'var(--pos-bg)' : 'var(--pos-text-muted)',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  cursor: canPay ? 'pointer' : 'not-allowed',
                  boxShadow: canPay ? 'var(--pos-cyan-glow)' : 'none',
                }}
              >
                {processing ? 'TRAITEMENT…' : `VALIDER PAIEMENT`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
