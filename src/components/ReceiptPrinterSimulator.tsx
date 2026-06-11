import React, { useRef, useState } from "react";
import { Printer, Check, Copy, X, RotateCcw, ShieldAlert, Lock, UserCheck } from "lucide-react";
import { TransactionRecord, TeaRoomUser } from "../types";

interface ReceiptPrinterSimulatorProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
  isOffline: boolean;
  currentUser: TeaRoomUser | null;
  allStaff: TeaRoomUser[];
  onCancelTransaction: (tx: TransactionRecord, authorizedBy: TeaRoomUser) => Promise<void>;
}

export default function ReceiptPrinterSimulator({
  transaction,
  onClose,
  isOffline,
  currentUser,
  allStaff,
  onCancelTransaction
}: ReceiptPrinterSimulatorProps) {
  const [copied, setCopied] = useState(false);
  const [showManagerApproval, setShowManagerApproval] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [authorizationError, setAuthorizationError] = useState("");
  const [selectedApproverUid, setSelectedApproverUid] = useState("");
  const [processingCancel, setProcessingCancel] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const handlePrint = () => {
    // Elegant system print or window layout simulation
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket Thermique - #${transaction.id}</title>
            <style>
              body { 
                font-family: monospace; 
                padding: 20px; 
                max-width: 320px; 
                margin: 0 auto; 
                color: #000;
                background: #fff;
              }
              hr { border: 1px dashed #000; }
              table { width: 100%; border-collapse: collapse; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      // fallback alert or console
      alert("Impression lancée avec succès vers l'imprimante réseau (Simulé).");
    }
  };

  const copyDuplicateLink = () => {
    const duplicateText = `
=== DUPLICATA NUMERIQUE ===
Salon de Thé: L'Heure du Thé
Ticket ID: ${transaction.id}
Date: ${new Date(transaction.timestamp).toLocaleString("fr-FR")}
Vendeur: ${transaction.user_nom} (Badge: ${transaction.rfid_token})
Total: ${transaction.total.toFixed(3)} DT
==========================`;
    navigator.clipboard.writeText(duplicateText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCancelRequest = () => {
    setAuthorizationError("");
    if (currentUser && (currentUser.role === "admin" || currentUser.role === "gerant")) {
      setConfirmCancel(true);
    } else {
      const managers = allStaff.filter(u => u.role === "admin" || u.role === "gerant");
      if (managers.length > 0) {
        setSelectedApproverUid(managers[0].uid);
      }
      setShowManagerApproval(true);
    }
  };

  const handleExecuteCancel = async (approver: TeaRoomUser) => {
    setProcessingCancel(true);
    setAuthorizationError("");
    try {
      await onCancelTransaction(transaction, approver);
      setConfirmCancel(false);
      setShowManagerApproval(false);
    } catch (err: any) {
      setAuthorizationError("Erreur lors de l'annulation: " + (err.message || err));
    } finally {
      setProcessingCancel(false);
    }
  };

  return (
    <div id="receipt-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="receipt-modal-container"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm flex flex-col max-h-[90vh] shadow-xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-800"
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#8BA888]" />
            <h3 className="font-display font-bold text-sm text-[#2D3A30]">
              Imprimante Thermique (ESC/POS)
            </h3>
          </div>
          <button 
            id="close-receipt-btn"
            onClick={onClose} 
            className="text-slate-400 hover:text-[#2D3A30] p-1 rounded-lg hover:bg-[#F1F3EE] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F1F3EE]/40 flex flex-col items-center">
          
          {/* Simulated Paper Roll */}
          <div 
            ref={printRef}
            id="thermal-receipt-paper"
            className="w-full max-w-[280px] bg-white border border-slate-200 text-slate-900 p-5 shadow-xs font-mono text-[11px] leading-relaxed relative rounded-sm"
            style={{ backgroundImage: "linear-gradient(#ffffff 97%, #f1f3ee 3%)", backgroundSize: "100% 20px" }}
          >
            {/* Rigid jagged thermal cutting edges at top and bottom */}
            <div className="absolute -top-1.5 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#8BA888]/20 to-transparent flex overflow-hidden">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="w-2 h-2 bg-white rotate-45 shrink-0 -mt-1 border-b border-r border-[#8BA888]/10"></div>
              ))}
            </div>

            {/* Receipt Logo and Brand details */}
            <div className="text-center font-bold text-xs tracking-wider mt-2 text-[#2D3A30]">
              L'HEURE DU THÉ
            </div>
            <div className="text-center text-[9px] text-[#2D3A30]/80 mb-2">
              Salon de Thé Moderne (Tablette)
            </div>
            <div className="text-center text-[9px] text-slate-500 mb-3">
              12 Rue de la Porcelaine, Paris<br />
              Tél: 01 45 45 45 45
            </div>

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* Meta details */}
            <div className="text-[10px] text-slate-650 space-y-0.5">
              ID: <span className="font-bold text-[#2D3A30]">{transaction.id}</span><br />
              DATE: {new Date(transaction.timestamp).toLocaleString("fr-FR")}<br />
              VENDEUR: {transaction.user_nom}<br />
              BADGE: <span className="font-mono bg-slate-50 px-1 py-0.5 rounded text-[9px]">{transaction.rfid_token}</span>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* Checkout Items Table */}
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-dashed border-slate-400 font-bold text-[#2D3A30]">
                  <th className="text-left font-mono py-1">Item</th>
                  <th className="text-center font-mono py-1">Qté</th>
                  <th className="text-right font-mono py-1">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-200">
                {transaction.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-1 text-slate-700">{it.product_nom}</td>
                    <td className="text-center py-1 text-slate-750 font-bold">{it.quantite}</td>
                    <td className="text-right py-1 text-slate-800 font-semibold">{(it.prix_unitaire * it.quantite).toFixed(3)} DT</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* Total Block */}
            <div className="flex justify-between text-xs font-bold my-1 text-[#2D3A30]">
              <span>TOTAL NET PAYÉ:</span>
              <span>{transaction.total.toFixed(3)} DT</span>
            </div>
            <div className="text-[8px] text-slate-400 text-right leading-none mt-1">
              TVA Incluse (Taux Standard Tunisie)
            </div>

            {transaction.status === "annulé" && (
              <div className="my-3 text-center border-2 border-rose-500 text-rose-600 font-extrabold px-2 py-3 rounded-xl uppercase tracking-widest text-[#D32F2F] bg-rose-50 animate-pulse rotate-[-2deg] shadow-xs">
                ⚠️ TICKET ANNULÉ ⚠️
                <span className="block text-[8.5px] font-mono mt-1 normal-case font-bold text-rose-700">
                  Annulé & Stocks Re-crédités
                </span>
              </div>
            )}

            <div className="border-t border-dashed border-slate-400 my-2"></div>

            {/* QR CODE REPRESENTATION */}
            <div className="text-center my-4 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs flex items-center justify-center mx-auto">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://ais-pre-v6wkre4unqu4zj5fq4zkfw-561933394534.europe-west2.run.app/receipt/${transaction.id}`)}`} 
                  alt="Receipt QR Code"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-[8px] text-slate-500 mt-1.5 font-mono tracking-widest uppercase">
                ID : #{transaction.id.toUpperCase()}
              </div>
            </div>

            {/* Offline notification duplicate */}
            <div className="text-center text-[9px] rounded p-1 mb-1">
              {isOffline ? (
                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 block">TICKET STOCKÉ HORS-LIGNE (SYNC EN ATTENTE)</span>
              ) : (
                <span className="text-[#2D3A30] font-bold bg-[#F1F3EE] px-2 py-1 rounded border border-[#8BA888]/15 block">• DUPLICATA NUMÉRIQUE CLOUD REÇU</span>
              )}
            </div>

            <div className="text-center text-[9px] text-[#2D3A30] font-bold italic mt-3">
              Merci de votre visite à bientôt !
            </div>

            <div className="absolute -bottom-1.5 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#8BA888]/20 to-transparent flex overflow-hidden">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="w-2 h-2 bg-white rotate-45 shrink-0 mt-0.5 border-t border-l border-[#8BA888]/10"></div>
              ))}
            </div>
          </div>

        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F1F3EE]/35 flex flex-col gap-2 rounded-b-2xl">
          <div className="flex gap-2">
            <button
              id="print-ticket-trigger"
              onClick={handlePrint}
              className="flex-1 bg-[#2D3A30] hover:bg-[#19221c] text-white font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0 text-white" />
              Imprimer (ESC/POS)
            </button>
            
            <button
              id="copy-duplicate-btn"
              onClick={copyDuplicateLink}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
              title="Copier le duplicata texte"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span>{copied ? "Copié !" : "Copier"}</span>
            </button>
          </div>

          {transaction.status !== "annulé" && (
            <button
              id="cancel-ticket-trigger"
              onClick={handleCancelRequest}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer border border-rose-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Annuler la Caisse (Gérant / Admin)</span>
            </button>
          )}
        </div>

        {/* Confirm cancellation overlay */}
        {confirmCancel && (
          <div id="cancel-pos-confirm-overlay" className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl w-full max-w-xs text-center text-slate-800">
              <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h4 className="font-display font-black text-sm text-slate-900">Confirmer l'annulation ?</h4>
              <p className="text-[10px] text-slate-500 mt-1">Vous allez annuler le ticket de caisse et re-créditer les articles en stock.</p>
              
              {authorizationError && (
                <p className="mt-2 text-[9px] font-semibold text-rose-600 bg-rose-50 p-1.5 rounded">{authorizationError}</p>
              )}

              <div className="mt-4.5 flex gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  disabled={processingCancel}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-650 border border-slate-200 text-xs py-2 rounded-lg font-bold transition cursor-pointer"
                >
                  Non
                </button>
                <button
                  onClick={() => {
                    if (currentUser) handleExecuteCancel(currentUser);
                  }}
                  disabled={processingCancel}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs py-2 rounded-lg font-bold transition cursor-pointer shadow-md shadow-rose-900/10"
                >
                  {processingCancel ? "Traitement..." : "Oui, Annuler"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manager verification overlay */}
        {showManagerApproval && (
          <div id="cancel-pos-auth-overlay" className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl w-full max-w-xs text-slate-855">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <h4 className="font-display font-bold text-xs text-slate-900 font-black">Autorisation Requise</h4>
              </div>
              
              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed font-sans">
                Le rôle <span className="font-extrabold text-[#2D3A30]">Serveur</span> n'est pas autorisé à annuler les tickets imprimés. Veuillez faire valider par un responsable :
              </p>

              {authorizationError && (
                <p className="mb-3 text-[9px] font-semibold text-rose-600 bg-rose-50 p-1.5 rounded text-center">{authorizationError}</p>
              )}

              <div className="space-y-2">
                <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Sélectionner un Manager</label>
                <select
                  value={selectedApproverUid}
                  onChange={(e) => setSelectedApproverUid(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#8BA888]"
                >
                  {allStaff
                    .filter(u => u.role === "admin" || u.role === "gerant")
                    .map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.nom} ({u.role === "admin" ? "Directrice" : "Gérant"})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="mt-4.5 flex gap-2">
                <button
                  onClick={() => setShowManagerApproval(false)}
                  disabled={processingCancel}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs py-2 rounded-lg font-semibold transition cursor-pointer text-center"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    const approver = allStaff.find(u => u.uid === selectedApproverUid);
                    if (approver) handleExecuteCancel(approver);
                  }}
                  disabled={processingCancel}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-md shadow-amber-900/10"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{processingCancel ? "Validation..." : "Autoriser"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
