import React, { useState } from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import { TransactionRecord } from '../types';

interface JournalModalProps {
  open: boolean;
  onClose: () => void;
  transactions: TransactionRecord[];
  tables: { id: string; nom: string }[];
}

export function JournalModal({ open, onClose, transactions, tables }: JournalModalProps) {
  const [activePrintTx, setActivePrintTx] = useState<TransactionRecord | null>(null);
  const [isPrintingJournal, setIsPrintingJournal] = useState(false);

  if (!open) return null;

  // Helper to find table name
  const getTableName = (tableId: string | undefined) => {
    if (!tableId) return 'Sans Table';
    const t = tables.find((tab) => tab.id === tableId);
    if (t) return t.nom;
    // Fallback: extract number or capitalize
    return tableId.replace('table_', 'Table ').toUpperCase();
  };

  // Helper to extract Payment Mode from transaction status
  const getPaymentMode = (status: string) => {
    const norm = status.toLowerCase();
    if (norm.includes('especes') || norm.includes('espèces')) return 'Espèces / Cash';
    if (norm.includes('carte')) return 'Carte Bancaire / TND';
    if (norm.includes('mobile')) return 'Mobile / QR';
    return 'Espèces';
  };

  // Helper to format timestamps to readable french hours
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Trigger browser print for a single transaction ticket
  const triggerPrintTicket = (tx: TransactionRecord) => {
    setIsPrintingJournal(false);
    setActivePrintTx(tx);
    // Let state flush to DOM before calling print
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Trigger browser print for the full financial journal summary
  const triggerPrintJournal = () => {
    setIsPrintingJournal(true);
    setActivePrintTx(null);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Compute total cashier intake for the day
  const totalIntake = transactions.reduce((sum, tx) => sum + tx.total, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans">
      
      {/* ⚠️ EMBEDDED INLINE CSS RULES FOR PHYSICAL 80MM THERMAL TICKET PRINTING */}
      <style>{`
        @media screen {
          .only-print {
            display: none !important;
          }
        }
        @media print {
          /* Hide all application components */
          body * {
            visibility: hidden !important;
          }
          /* Show and format only the thermal paper layout */
          .only-print, .only-print * {
            visibility: visible !important;
            display: block !important;
          }
          .only-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 4mm 2mm 10mm 2mm !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            box-sizing: border-box !important;
            text-align: left !important;
          }
          .only-print h2, .only-print h3 {
            text-align: center !important;
            font-weight: bold !important;
            margin: 2px 0 !important;
          }
          .only-print hr {
            border: none !important;
            border-top: 1px dashed black !important;
            margin: 6px 0 !important;
          }
          .only-print .center {
            text-align: center !important;
          }
          .only-print .flex-row {
            display: flex !important;
            justify-content: space-between !important;
          }
          .only-print .right {
            text-align: right !important;
          }
        }
      `}</style>

      {/* ── CONTAINER PRINCIPAL DE LA MODALE ── */}
      <div 
        className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#070f1e] text-slate-100 overflow-hidden shadow-2xl relative flex flex-col h-[85vh]"
        style={{ boxShadow: '0 0 35px rgba(0, 245, 212, 0.08)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <span className="text-cyan-400 text-sm font-bold">🧾</span>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Journal Financier</h3>
              <p className="text-[10px] text-slate-400">Suivi et impression de l'historique de caisse du jour</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerPrintJournal}
              className="px-4 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 font-bold hover:bg-cyan-950/40 text-xs flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer Journal (80mm)</span>
            </button>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dashboard Quick Stats */}
        <div className="p-4 bg-[#0a1528]/40 border-b border-slate-800/50 flex flex-wrap gap-4 items-center justify-between shrink-0">
          <div className="flex gap-4">
            <div className="bg-[#0b1627]/80 rounded-xl px-4 py-2 border border-slate-800/60">
              <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Volume Total Vendu</div>
              <div className="text-lg font-mono font-extrabold text-emerald-400">{totalIntake.toFixed(3)} DT</div>
            </div>
            <div className="bg-[#0b1627]/80 rounded-xl px-4 py-2 border border-slate-800/60">
              <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Nombre de Ventes</div>
              <div className="text-lg font-mono font-extrabold text-cyan-400">{transactions.length} tickets</div>
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            MAAZIM FINANCIAL SYSTEM v3.00
          </div>
        </div>

        {/* Main interactive Table list */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-sans">
              <Receipt className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
              <div className="text-sm font-bold uppercase tracking-wider text-slate-500">Aucune vente enregistrée aujourd'hui</div>
              <div className="text-xs text-slate-600 mt-1">Les ventes de la caisse s'afficheront ici en temps réel.</div>
            </div>
          ) : (
            <div className="w-full border border-slate-800/60 rounded-xl overflow-hidden bg-[#0a1425]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0e1c31] border-b border-slate-850 text-slate-400 text-[10px] font-sans font-extrabold tracking-widest uppercase">
                    <th className="px-4 py-3">Heure</th>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Articles Vendus</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-center">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {[...transactions].sort((a,b) => b.timestamp - a.timestamp).map((tx) => (
                    <tr 
                      key={tx.id}
                      className="hover:bg-slate-805/45 transition duration-150 text-[11px] font-medium text-slate-200"
                    >
                      <td className="px-4 py-3.5 font-mono text-slate-400 font-bold whitespace-nowrap">
                        {formatTime(tx.timestamp)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded bg-[#01f5d4]/10 border border-[#01f5d4]/20 text-[#01f5d4] font-bold text-[9px] uppercase tracking-wider">
                          {getTableName(tx.items && tx.items[0] ? (tx as any).table_id || 'table_04' : 'table_04')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5 max-w-md">
                          {tx.items?.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono text-center px-1.5 py-0.5 rounded font-extrabold">
                                x{it.quantite}
                              </span>
                              <span className="text-slate-200 font-sans tracking-wide">{it.product_nom}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-sans whitespace-nowrap text-slate-300 font-bold">
                        {getPaymentMode(tx.status || '')}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400 text-xs whitespace-nowrap">
                        {tx.total.toFixed(3)} DT
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => triggerPrintTicket(tx)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-sans font-extrabold text-[10px] tracking-wide inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                          title="Imprimer le ticket thermique"
                        >
                          <Printer className="w-3" />
                          <span>Imprimer Ticket</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/60 bg-[#050b16] shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-705 text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer font-sans"
          >
            Fermer l'historique
          </button>
        </div>
      </div>

      {/* ── TICKET IMPRIMABLE CACHÉ (UNIQUEMENT POUR WINDOW.PRINT() / THERMIQUE 80MM) ── */}
      <div className="only-print">
        {isPrintingJournal ? (
          <div>
            {/* Template dynamic summary journal */}
            <div className="center">
              <h2>JOURNAL FINANCIER</h2>
              <h3>CAFÉ MAAZIM</h3>
              <p>SALON DE THÉ TECHNO</p>
              <p>Date : {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <hr />
            <div className="flex-row font-bold">
              <span>Heure / Table</span>
              <span className="right">Total</span>
            </div>
            <hr />
            {transactions.map((t) => (
              <div key={t.id} className="flex-row" style={{ margin: '3px 0' }}>
                <span>{formatTime(t.timestamp)} | {getTableName((t as any).table_id || 'table_04')}</span>
                <span className="right">{t.total.toFixed(3)} DT</span>
              </div>
            ))}
            <hr />
            <div className="flex-row font-bold" style={{ fontSize: '13px', margin: '6px 0' }}>
              <span>TOTAL DU JOUR :</span>
              <span className="right">{totalIntake.toFixed(3)} DT</span>
            </div>
            <div className="center" style={{ marginTop: '20px' }}>
              <p>Nombre de tickets : {transactions.length}</p>
              <p>Imprimé via MAAZIM SECURE POS</p>
            </div>
          </div>
        ) : activePrintTx ? (
          <div>
            {/* Template dynamic single transaction ticket */}
            <div className="center">
              <h2>CAFÉ MAAZIM</h2>
              <p>SALON DE THÉ TECHNO</p>
              <p>Ariana, Tunis, Tunisie</p>
              <p>Tél : +216 71 000 000</p>
              <h3>** COMPTE DU CLIENT **</h3>
            </div>
            <hr />
            <div className="flex-row">
              <span>Date: {new Date(activePrintTx.timestamp).toLocaleDateString('fr-FR')}</span>
              <span className="right">Heure: {formatTime(activePrintTx.timestamp)}</span>
            </div>
            <div className="flex-row">
              <span>Opérateur: {activePrintTx.user_nom || 'Maazim Admin'}</span>
              <span className="right">Table: {getTableName((activePrintTx as any).table_id || 'table_04')}</span>
            </div>
            <div className="center">ID: {activePrintTx.id}</div>
            <hr />
            <div className="flex-row font-bold">
              <span>Article xQté</span>
              <span className="right">Montant</span>
            </div>
            <hr />
            {activePrintTx.items?.map((it, idx) => (
              <div key={idx} className="flex-row" style={{ margin: '3px 0' }}>
                <span>{it.product_nom} x{it.quantite}</span>
                <span className="right">{(it.prix_unitaire * it.quantite).toFixed(3)} DT</span>
              </div>
            ))}
            <hr />
            <div className="flex-row font-bold" style={{ fontSize: '14px', margin: '6px 0' }}>
              <span>A PAYER :</span>
              <span className="right">{activePrintTx.total.toFixed(3)} DT</span>
            </div>
            <div className="flex-row font-bold">
              <span>Mode :</span>
              <span className="right">{getPaymentMode(activePrintTx.status || '')}</span>
            </div>
            <hr />
            <div className="center font-bold" style={{ marginTop: '15px' }}>
              <p>Merci de votre visite !</p>
              <p>A bientôt au Café Maazim</p>
            </div>
          </div>
        ) : null}
      </div>

    </div>
  );
}
