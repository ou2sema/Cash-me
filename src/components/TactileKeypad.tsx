import React from "react";
import { 
  Coins, 
  CreditCard, 
  Plus, 
  Minus, 
  Trash2, 
  Users, 
  Settings, 
  TrendingUp, 
  FileSpreadsheet, 
  Percent, 
  HelpCircle, 
  Lock, 
  Sparkles,
  Smartphone
} from "lucide-react";
import { TeaRoomUser, BasketItem } from "../types";

interface TactileKeypadProps {
  basket: BasketItem[];
  totalCartValue: number;
  onPaymentCheckout: (paymentType: "ESPECES" | "CARTE" | "CHEQUE" | "TND_PAY") => Promise<void>;
  onIncrementQty: () => void;
  onDecrementQty: () => void;
  onApplyQuickDiscount: () => void;
  onClearCart: () => void;
  onSwitchTab: (tab: "caisse" | "ventes" | "stocks" | "stats") => void;
  onFocusVendeur: () => void;
  onLogout: () => void;
  currentUser: TeaRoomUser | null;
  currentDiscount: number;
}

export default function TactileKeypad({
  basket,
  totalCartValue,
  onPaymentCheckout,
  onIncrementQty,
  onDecrementQty,
  onApplyQuickDiscount,
  onClearCart,
  onSwitchTab,
  onFocusVendeur,
  onLogout,
  currentUser,
  currentDiscount
}: TactileKeypadProps) {
  
  // Audio tactile beep feedback
  const playTactileBeep = (freq: number = 550, dur: number = 0.06) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(dur, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + dur);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch {
      // safe fallback
    }
  };

  const handleAction = (callback: () => void, freq?: number) => {
    playTactileBeep(freq);
    callback();
  };

  const handlePayment = async (type: "ESPECES" | "CARTE" | "CHEQUE" | "TND_PAY") => {
    playTactileBeep(680, 0.1);
    await onPaymentCheckout(type);
  };

  const isBasketEmpty = basket.length === 0;

  return (
    <div id="tactile-terminal-keypad" className="bg-[#1E293B] border border-slate-700 rounded-3xl p-5 shadow-xl text-white select-none">
      
      {/* Small title header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
          <p className="text-[10px] font-sans font-black uppercase tracking-wider text-slate-400">
            Console Tactile Multipoints • POS 3000
          </p>
        </div>
        <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-350 px-2 py-0.5 rounded-lg font-mono font-bold">
          FAST-TOUCH
        </span>
      </div>

      {/* Button groups grid layout */}
      <div className="space-y-4">
        
        {/* Row 1: Modifier keys (Grey buttons) */}
        <div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1 mb-2 flex items-center justify-between">
            <span>Quantités & Remises (Sélection)</span>
            <span className="text-[9px] text-slate-400 font-mono font-medium lowercase">Target: 48px</span>
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            <button
              id="pad-btn-qty-plus"
              onClick={() => handleAction(onIncrementQty, 480)}
              disabled={isBasketEmpty}
              className="py-4 px-1 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs flex flex-col items-center justify-center gap-2 transition-all active:scale-90 border border-slate-500 shadow-md cursor-pointer select-none min-h-[50px]"
            >
              <Plus className="w-5.5 h-5.5 text-white stroke-[2.5]" />
              <span className="text-[9px] font-black tracking-wider uppercase text-slate-100">Qté +</span>
            </button>

            <button
              id="pad-btn-qty-minus"
              onClick={() => handleAction(onDecrementQty, 440)}
              disabled={isBasketEmpty}
              className="py-4 px-1 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs flex flex-col items-center justify-center gap-2 transition-all active:scale-90 border border-slate-500 shadow-md cursor-pointer select-none min-h-[50px]"
            >
              <Minus className="w-5.5 h-5.5 text-white stroke-[2.5]" />
              <span className="text-[9px] font-black tracking-wider uppercase text-slate-100">Qté -</span>
            </button>

            <button
              id="pad-btn-discount"
              onClick={() => handleAction(onApplyQuickDiscount, 500)}
              disabled={isBasketEmpty}
              className={`py-4 px-1 rounded-xl text-white font-black text-xs flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border shadow-md cursor-pointer select-none min-h-[50px] ${
                currentDiscount > 0 
                  ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-300 animate-pulse text-white" 
                  : "bg-slate-700 hover:bg-slate-600 border-slate-500 text-slate-100"
              }`}
              title="Appliquer une remise commerciale de 1.000 DT"
            >
              <Percent className="w-5.5 h-5.5 text-indigo-200 stroke-[2.5]" />
              <span className="text-[9px] font-black tracking-wider uppercase">
                {currentDiscount > 0 ? "-1.000 DT" : "Remise 1DT"}
              </span>
            </button>

            <button
              id="pad-btn-clear"
              onClick={() => handleAction(onClearCart, 300)}
              disabled={isBasketEmpty}
              className="py-4 px-1 rounded-xl bg-rose-800 hover:bg-rose-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs flex flex-col items-center justify-center gap-2 transition-all active:scale-90 border border-rose-500 shadow-md cursor-pointer select-none min-h-[50px]"
            >
              <Trash2 className="w-5.5 h-5.5 text-white stroke-[2]" />
              <span className="text-[9px] font-black tracking-wider uppercase">Vider</span>
            </button>
          </div>
        </div>

        {/* Row 2: Instant Payments (Green / Vibrant buttons) */}
        <div>
          <div className="flex justify-between items-center pl-1 mb-2">
            <p className="text-[10px] font-black text-[#10B981] uppercase tracking-widest flex items-center gap-1.5">
              <span>Encaissement Direct (TTC)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </p>
            {isBasketEmpty && (
              <span className="text-[8px] text-amber-300 font-bold uppercase font-mono">Panier vide</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="pad-btn-pay-especes"
              onClick={() => handlePayment("ESPECES")}
              disabled={isBasketEmpty || !currentUser}
              className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black transition-all active:scale-[0.96] border border-emerald-400 shadow-md cursor-pointer flex items-center gap-2 min-h-[56px]"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 text-amber-300 stroke-[2.5]" />
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-[11px] font-black tracking-normal leading-none truncate">ESPÈCES (CASH)</div>
                <div className="text-[8px] text-white/95 mt-0.5 truncate font-sans font-bold">Auto-Caisse</div>
              </div>
            </button>

            <button
              id="pad-btn-pay-carte"
              onClick={() => handlePayment("CARTE")}
              disabled={isBasketEmpty || !currentUser}
              className="py-3 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black transition-all active:scale-[0.96] border border-cyan-400 shadow-md cursor-pointer flex items-center gap-2 min-h-[56px]"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-[11px] font-black tracking-normal leading-none truncate font-sans">CARTE / TPE</div>
                <div className="text-[8px] text-white/95 mt-0.5 truncate font-sans font-bold">Monétique</div>
              </div>
            </button>

            <button
              id="pad-btn-pay-tndpay"
              onClick={() => handlePayment("TND_PAY")}
              disabled={isBasketEmpty || !currentUser}
              className="py-3 px-2 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] disabled:opacity-30 disabled:cursor-not-allowed text-white font-black transition-all active:scale-[0.96] border border-sky-305 shadow-md cursor-pointer flex items-center gap-2 min-h-[56px]"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-[#FDF43F] stroke-[2.5]" />
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-[11px] font-black tracking-normal leading-none truncate font-sans">D-DINAR WALLET</div>
                <div className="text-[8px] text-white/95 mt-0.5 truncate font-sans font-bold">Mobile App</div>
              </div>
            </button>

            <button
              id="pad-btn-pay-cheque"
              onClick={() => handlePayment("CHEQUE")}
              disabled={isBasketEmpty || !currentUser}
              className="py-3 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black transition-all active:scale-[0.96] border border-amber-400 shadow-md cursor-pointer flex items-center gap-2 min-h-[56px]"
            >
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5 text-white stroke-[3]" />
              </div>
              <div className="text-left overflow-hidden">
                <div className="text-[11px] font-black tracking-normal leading-none truncate font-sans">CHÈQUE BT</div>
                <div className="text-[8px] text-white/95 mt-0.5 truncate font-sans font-bold">Traite Porteur</div>
              </div>
            </button>
          </div>
        </div>

        {/* Row 3: Navigation shortcuts (Blue elements) */}
        <div>
          <p className="text-[10px] font-black text-sky-350 uppercase tracking-widest pl-1 mb-2">
            Navigation Console Tactile
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="pad-btn-nav-caisse"
              onClick={() => handleAction(() => onSwitchTab("caisse"), 400)}
              className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white text-emerald-300 font-bold text-xs flex items-center justify-center gap-3.5 transition-all active:scale-[0.96] border border-slate-600 shadow-md cursor-pointer text-center"
            >
              <Coins className="w-5.5 h-5.5 shrink-0 text-emerald-400" />
              <span className="tracking-wide">CAISSE TACTILE</span>
            </button>

            <button
              id="pad-btn-nav-stock"
              onClick={() => handleAction(() => onSwitchTab("stocks"), 400)}
              className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white text-amber-300 font-bold text-xs flex items-center justify-center gap-3.5 transition-all active:scale-[0.96] border border-slate-600 shadow-md cursor-pointer text-center"
            >
              <Settings className="w-5.5 h-5.5 shrink-0 text-amber-400" />
              <span className="tracking-wide">VISU STOCKS</span>
            </button>

            <button
              id="pad-btn-nav-ventes"
              onClick={() => handleAction(() => onSwitchTab("ventes"), 400)}
              className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white text-cyan-300 font-bold text-xs flex items-center justify-center gap-3.5 transition-all active:scale-[0.96] border border-slate-600 shadow-md cursor-pointer text-center"
            >
              <FileSpreadsheet className="w-5.5 h-5.5 shrink-0 text-cyan-400" />
              <span className="tracking-wide">HISTO. FACTURES</span>
            </button>

            <button
              id="pad-btn-nav-stats"
              onClick={() => handleAction(() => onSwitchTab("stats"), 400)}
              className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white text-purple-300 font-bold text-xs flex items-center justify-center gap-3.5 transition-all active:scale-[0.96] border border-slate-600 shadow-md cursor-pointer text-center"
            >
              <TrendingUp className="w-5.5 h-5.5 shrink-0 text-purple-400" />
              <span className="tracking-wide">RAPPORTS CA</span>
            </button>
          </div>
        </div>

        {/* Row 4: Cashier and Security Controls (Yellow & Orange components) */}
        <div className="border-t border-slate-700/60 pt-3.5">
          <div className="grid grid-cols-2 gap-3">
            <button
              id="pad-btn-vendeur"
              onClick={() => handleAction(onFocusVendeur, 580)}
              className="py-4 px-4 rounded-xl bg-[#EAB308] hover:bg-[#FACC15] text-slate-950 font-black text-xs flex items-center justify-center gap-2.5 transition-all active:scale-95 border border-yellow-350 shadow-md cursor-pointer uppercase min-h-[48px]"
            >
              <Users className="w-5 h-5 text-slate-950 animate-pulse stroke-[2.5]" />
              <span>Choix Vendeur</span>
            </button>

            <button
              id="pad-btn-verrouille"
              onClick={() => handleAction(onLogout, 250)}
              disabled={!currentUser}
              className="py-4 px-4 rounded-xl bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs flex items-center justify-center gap-2.5 transition-all active:scale-95 border border-orange-400 shadow-md cursor-pointer uppercase min-h-[48px]"
            >
              <Lock className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              <span>Verrouiller</span>
            </button>
          </div>
        </div>

      </div>

      {/* Touch status indicator badge */}
      {currentUser ? (
        <div className="mt-4 bg-[#0F172A]/70 border border-slate-700/50 p-2.5 rounded-xl flex items-center justify-between text-[10px] font-mono text-slate-350">
          <div className="flex items-center gap-2 truncate">
            <div className="w-2 h-2 rounded-full bg-emerald-450 animate-pulse"></div>
            <span className="truncate font-bold">Vendeur: {currentUser.nom}</span>
          </div>
          <span className="text-emerald-400 capitalize bg-emerald-900/30 px-1.5 py-0.5 rounded-md text-[8px] font-bold shrink-0">{currentUser.role}</span>
        </div>
      ) : (
        <div className="mt-4 bg-[#7F1D1D]/30 border border-[#F43F5E]/30 p-2.5 rounded-xl text-center text-[10px] font-mono text-[#FDA4AF] animate-pulse">
          ⚠️ BADGE MACHINE RFID REQUIS POUR VENDRE
        </div>
      )}

    </div>
  );
}
