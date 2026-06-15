import React from "react";
import { 
  Coins, 
  Printer, 
  Layers, 
  Trash2, 
  Lock, 
  Unlock,
  Radio,
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
  isCaisseLocked?: boolean;
  onToggleLock?: () => void;
  onKeyPress?: (key: string) => void;
  onPrintLastTicket?: () => void;
  onSwitchToPlan?: () => void;
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
  currentDiscount,
  isCaisseLocked = false,
  onToggleLock,
  onKeyPress,
  onPrintLastTicket,
  onSwitchToPlan
}: TactileKeypadProps) {
  
  // Audio tactile beep feedback matching mechanical POS terminal keys
  const playTactileBeep = (freq: number = 550, dur: number = 0.05) => {
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

  const executeKeyPress = (key: string, freq = 520) => {
    playTactileBeep(freq);
    if (onKeyPress) {
      onKeyPress(key);
    }
  };

  const handlePayment = async (type: "ESPECES" | "CARTE" | "CHEQUE" | "TND_PAY") => {
    playTactileBeep(680, 0.09);
    await onPaymentCheckout(type);
  };

  const isBasketEmpty = basket.length === 0;

  return (
    <div id="tactile-terminal-keypad" className="bg-[#060F1F] border border-[#11243D] rounded-2.5xl p-4.5 shadow-xl text-white select-none">
      
      {/* Mini Technical Header block */}
      <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#11243D]/60">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F5D4] shadow-[0_0_8px_#00f5d4] animate-pulse"></span>
          <p className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-bold">
            COMPACT KEYPAD STATION • C300
          </p>
        </div>
        <span className="text-[8px] bg-[#0A1D37] border border-[#162E4F] text-[#00F5D4] px-1.5 py-0.5 rounded font-mono font-medium tracking-wider">
          TOUCH 2.0
        </span>
      </div>

      {/* Main Touch Grid with Numbers + Action Columns Side-by-Side */}
      <div className="flex gap-3">
        
        {/* Left Column: 12-key tactile mechanical numpad */}
        <div className="flex-1 select-none">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => executeKeyPress(num.toString(), 500)}
                className="py-3 bg-[#0B1528] hover:bg-[#12253F] border border-[#162E4F]/80 text-[#00F5D4] text-center font-mono font-extrabold rounded-xl transition active:scale-90 cursor-pointer text-base shadow-sm"
              >
                {num}
              </button>
            ))}
            
            {/* Clear Button */}
            <button
              type="button"
              onClick={() => {
                playTactileBeep(350);
                if (onKeyPress) onKeyPress("CLEAR");
                else onClearCart();
              }}
              className="py-3 bg-[#1B0B13] hover:bg-[#2F1122] border border-[#3E162D] text-rose-450 text-center font-mono font-extrabold rounded-xl transition active:scale-90 cursor-pointer text-base shadow-sm"
              title="Vider / Effacer"
            >
              C
            </button>
            
            {/* Zebra Zero Button */}
            <button
              type="button"
              onClick={() => executeKeyPress("0", 490)}
              className="py-3 bg-[#0B1528] hover:bg-[#12253F] border border-[#162E4F]/80 text-[#00F5D4] text-center font-mono font-extrabold rounded-xl transition active:scale-90 cursor-pointer text-base shadow-sm"
            >
              0
            </button>
            
            {/* Exit/Table plan shortcut overlay */}
            <button
              type="button"
              onClick={() => {
                playTactileBeep(450);
                if (onSwitchToPlan) onSwitchToPlan();
                else if (onKeyPress) onKeyPress("EXIT");
              }}
              className="py-3 bg-[#111A1B] hover:bg-[#1B292B] border border-[#1E3A3E] text-cyan-400 text-center font-mono font-bold rounded-xl transition active:scale-90 cursor-pointer text-xs uppercase tracking-wider shadow-sm"
              title="Retourner au plan"
            >
              PLAN
            </button>
          </div>
        </div>

        {/* Right Column: High-contrast large physical checkout triggers */}
        <div className="w-[125px] flex flex-col gap-2 shrink-0">
          
          {/* ESPECES (CASH) key */}
          <button
            type="button"
            id="pad-checkout-cash"
            onClick={() => handlePayment("ESPECES")}
            disabled={isBasketEmpty || !currentUser}
            className="py-2.5 px-2 rounded-xl bg-[#00F5D4] hover:bg-[#33FFD8] disabled:opacity-25 disabled:cursor-not-allowed text-[#020813] font-sans font-black text-[9px] tracking-wider uppercase flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.93] border border-[#00FFF0]/30 shadow-[0_0_12px_rgba(0,245,212,0.18)] min-h-[46px] cursor-pointer"
          >
            <Coins className="w-4 h-4 text-[#020813] shrink-0 stroke-[2.5]" />
            <span>ESPÈCES (CASH)</span>
          </button>

          {/* IMPRIMER TICKET key */}
          <button
            type="button"
            id="pad-checkout-ticket"
            onClick={() => {
              playTactileBeep(600, 0.08);
              if (onPrintLastTicket) onPrintLastTicket();
            }}
            className="py-2.5 px-2 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-white font-sans font-black text-[9px] tracking-wider uppercase flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.93] border border-sky-400/40 shadow-[0_0_10px_rgba(14,165,233,0.15)] min-h-[46px] cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white shrink-0 stroke-[2]" />
            <span>IMPR TICKET</span>
          </button>

          {/* COMPTE TABLE account key */}
          <button
            type="button"
            id="pad-checkout-count-table"
            onClick={() => {
              playTactileBeep(550);
              if (onSwitchToPlan) onSwitchToPlan();
            }}
            className="py-2.5 px-2 rounded-xl bg-[#FFC300] hover:bg-yellow-400 text-[#020813] font-sans font-black text-[9px] tracking-wider uppercase flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.93] border border-yellow-500/40 shadow-[0_0_10px_rgba(255,195,0,0.15)] min-h-[46px] cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#020813] shrink-0 stroke-[2.5]" />
            <span>COMPTE TABLE</span>
          </button>

          {/* ANNULER key */}
          <button
            type="button"
            id="pad-checkout-void"
            onClick={() => {
              playTactileBeep(300, 0.1);
              onClearCart();
            }}
            disabled={isBasketEmpty}
            className="py-2.5 px-2 rounded-xl bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 disabled:opacity-20 disabled:cursor-not-allowed text-[#FF453A] border border-[#FF3B30]/35 font-sans font-black text-[9px] tracking-wider uppercase flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.93] min-h-[46px] cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-[#FF453A] shrink-0 stroke-[2]" />
            <span>ANNULER</span>
          </button>
        </div>

      </div>

      {/* Operator bottom signature line */}
      {currentUser && (
        <div className="mt-3.5 bg-[#040E20]/50 border border-[#11243D]/50 p-2 rounded-xl flex items-center justify-between text-[8px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="truncate font-bold uppercase">OP: {currentUser.nom}</span>
          </div>
          <span className="text-[#00F5D4] capitalize bg-[#00F5D4]/10 border border-[#00F5D4]/20 px-1 py-0.2 rounded text-[7px] font-bold shrink-0">{currentUser.role}</span>
        </div>
      )}

    </div>
  );
}
