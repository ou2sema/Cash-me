import React, { useState } from "react";
import { CreditCard, Key, ShieldCheck, UserCheck, RefreshCw, AlertTriangle, Radio } from "lucide-react";
import { TeaRoomUser } from "../types";

interface RfidBadgeSimulatorProps {
  onScan: (rfidToken: string) => Promise<void>;
  isLoading: boolean;
  currentUser: TeaRoomUser | null;
  onLogout: () => void;
  allStaff: TeaRoomUser[];
}

export default function RfidBadgeSimulator({
  onScan,
  isLoading,
  currentUser,
  onLogout,
  allStaff
}: RfidBadgeSimulatorProps) {
  const [customToken, setCustomToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
  const [tempColor, setTempColor] = useState("bg-slate-200");

  const triggerScan = async (token: string, name: string) => {
    if (scanning) return;
    setScanning(true);
    setScanStatus("idle");
    setTempColor("animate-pulse bg-[#8BA888] scale-105");
    
    // Simulate RFID scanning lag time (350ms)
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    try {
      await onScan(token);
      setScanStatus("success");
      setTempColor("bg-[#2D3A30] text-white scale-105 shadow-sm");
      // sound or click
      playMockBeep(650, 0.08);
    } catch (e) {
      setScanStatus("error");
      setTempColor("bg-rose-605 text-white shadow-sm");
      playMockBeep(150, 0.15);
    } finally {
      setTimeout(() => {
        setScanning(false);
        setTempColor("bg-slate-200");
      }, 1500);
    }
  };

  const playMockBeep = (freq: number, dur: number) => {
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
      // Audio might be blocked by browser sandbox or autoplay permissions, ignore
    }
  };

  return (
    <div id="rfid-badge-simulator-panel" className="bg-white border border-slate-205 rounded-2xl p-5 text-slate-850 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-5 h-5 text-[#8BA888] animate-pulse" />
            <div className="absolute top-0 left-0 w-5 h-5 bg-[#8BA888] rounded-full animate-ping opacity-25"></div>
          </div>
          <h3 className="font-display font-medium text-xs tracking-wide text-[#2D3A30] uppercase">
            Lecteur RFID OTG-NFC
          </h3>
        </div>
        <span className="text-[10px] bg-[#F1F3EE] text-slate-600 font-mono px-2 py-0.5 rounded border border-slate-200/50">
          SIMULATEUR
        </span>
      </div>

      {/* Main RFID scanning target zone */}
      <div className="relative overflow-hidden bg-[#F9FAF8] border-2 border-slate-100 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 mb-5 min-h-[140px]">
        {/* Absolute Scanning Line */}
        {scanning && (
          <div className="absolute left-0 right-0 h-0.5 bg-[#8BA888] opacity-75 animate-bounce blur-[1px]"></div>
        )}
        
        {/* Circle State Indicator */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-350 mb-3 ${tempColor} shadow-md`}>
          {scanning ? (
            <RefreshCw className="w-6 h-6 animate-spin text-[#2D3A30]" />
          ) : scanStatus === "success" ? (
            <UserCheck className="w-6 h-6 text-white" />
          ) : scanStatus === "error" ? (
            <AlertTriangle className="w-6 h-6 text-white" />
          ) : currentUser ? (
            <ShieldCheck className="w-6 h-6 text-emerald-800 animate-pulse" />
          ) : (
            <CreditCard className="w-6 h-6 text-slate-400" />
          )}
        </div>

        {currentUser ? (
          <div>
            <p className="text-[9px] text-[#8BA888] font-mono font-bold tracking-wider mb-0.5">
              BADGE DÉTECTÉ • SESSION ACTIVE
            </p>
            <h4 className="font-display font-bold text-sm text-[#2D3A30]">{currentUser.nom}</h4>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                currentUser.role === "admin" 
                  ? "bg-rose-50 text-rose-700 border border-rose-100" 
                  : currentUser.role === "gerant" 
                    ? "bg-amber-50 text-amber-700 border border-amber-100" 
                    : "bg-green-50 text-green-700 border border-green-100"
              }`}>
                {currentUser.role === "admin" ? "DIRECTEUR (ADMIN)" : currentUser.role === "gerant" ? "GÉRANT" : "SERVEUR"}
              </span>
            </div>
            <button 
              id="rfid-logout-btn"
              onClick={onLogout} 
              className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800 transition underline underline-offset-4 cursor-pointer"
            >
              Fermer la session
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
              Approchez un badge du lecteur ou cliquez sur un membre de l'équipe ci-dessous pour vous connecter.
            </p>
          </div>
        )}
      </div>

      {/* Roster of employee badges available for simulation */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#2D3A30]/65 uppercase tracking-wider pl-1 mb-2">
          Badges de l'Équipe (Simulation Tactile)
        </p>

        {allStaff.length === 0 ? (
          <div className="text-center p-3 text-slate-400 text-xs py-5">
            Initialisation des badges en cours...
          </div>
        ) : (
          allStaff.map((staff) => (
            <button
              id={`tap-badge-${staff.uid}`}
              key={staff.uid}
              onClick={() => triggerScan(staff.rfid_token, staff.nom)}
              disabled={scanning || isLoading}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition duration-200 cursor-pointer disabled:opacity-50 ${
                currentUser?.uid === staff.uid
                  ? "bg-[#F1F3EE] border-[#8BA888]/40 text-[#2D3A30] font-bold shadow-xs"
                  : "bg-white hover:bg-[#F9FAF8] border-slate-205 text-slate-650 hover:text-[#2D3A30]"
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <CreditCard className="w-4 h-4 shrink-0 text-slate-450" />
                <div className="overflow-hidden">
                  <div className="font-bold text-xs text-[#2D3A30] truncate">{staff.nom}</div>
                  <div className="text-[9px] font-mono text-slate-500 truncate select-all">Token: {staff.rfid_token}</div>
                </div>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                staff.role === "admin" 
                  ? "bg-rose-50 text-rose-700 border border-rose-100" 
                  : staff.role === "gerant" 
                    ? "bg-amber-50 text-amber-700 border border-amber-100" 
                    : "bg-green-50 text-green-700 border border-green-100"
              }`}>
                {staff.role === "admin" ? "Admin" : staff.role === "gerant" ? "Gérant" : "Serveur"}
              </span>
            </button>
          ))
        )}

        {/* SuperAdmin customized tag option */}
        <div className="border-t border-slate-100 pt-3 mt-3">
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
            Créer un Badge Personnalisé (UID)
          </label>
          <div className="flex gap-2">
            <input
              id="rfid-custom-token-input"
              type="text"
              placeholder="Ex: RFID_CUSTOM_12"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              className="flex-1 bg-white border border-slate-250 rounded-md py-1 px-3 text-xs font-mono placeholder-slate-400 focus:outline-none focus:border-[#8BA888] text-slate-800"
            />
            <button
              id="submit-custom-rfid-btn"
              onClick={() => {
                if (!customToken.trim()) return;
                triggerScan(customToken.trim(), "Badge Custom");
                setCustomToken("");
              }}
              disabled={scanning || isLoading || !customToken.trim()}
              className="bg-[#2D3A30] hover:bg-[#1f2821] text-white text-xs font-semibold py-1 px-3 rounded-md transition disabled:opacity-50 cursor-pointer shrink-0"
            >
              Tester UID
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
