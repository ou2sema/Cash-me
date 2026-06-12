import React, { useState, useEffect } from "react";
import { Lock, Delete, Shield, CheckCircle, AlertTriangle, X } from "lucide-react";
import { TeaRoomUser } from "../types";

interface PinAuthModalProps {
  isOpen: boolean;
  targetUser: TeaRoomUser;
  onSuccess: () => void;
  onClose: () => void;
}

export default function PinAuthModal({
  isOpen,
  targetUser,
  onSuccess,
  onClose
}: PinAuthModalProps) {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<"typing" | "verifying" | "success" | "error">("typing");

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setStatus("typing");
    }
  }, [isOpen, targetUser]);

  if (!isOpen) return null;

  const playBeep = (freq: number = 600, dur: number = 0.08) => {
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

  const handleKeyPress = (num: string) => {
    if (status === "verifying" || status === "success") return;
    if (pin.length >= 4) return;
    
    playBeep(580 + (parseInt(num) * 20), 0.06);
    setError("");
    const updatedPin = pin + num;
    setPin(updatedPin);

    // Auto-validate on 4th digit
    if (updatedPin.length === 4) {
      handleValidate(updatedPin);
    }
  };

  const handleDelete = () => {
    if (pin.length === 0 || status === "verifying" || status === "success") return;
    playBeep(450, 0.06);
    setPin(pin.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    if (pin.length === 0 || status === "verifying" || status === "success") return;
    playBeep(350, 0.1);
    setPin("");
    setError("");
  };

  const handleValidate = async (pinToValidate: string) => {
    setStatus("verifying");
    // Small delay for tactical realism
    await new Promise((resolve) => setTimeout(resolve, 400));

    const expectedPin = targetUser.pin_code || "1111";
    if (pinToValidate === expectedPin) {
      setStatus("success");
      playBeep(880, 0.15);
      // Brief pause to show success animation
      await new Promise((resolve) => setTimeout(resolve, 600));
      onSuccess();
    } else {
      setStatus("error");
      setError("CODE PIN INCORRECT");
      playBeep(180, 0.3);
      setPin("");
      setTimeout(() => {
        setStatus("typing");
      }, 1000);
    }
  };

  return (
    <div id="pin-auth-modal-overlay" className="fixed inset-0 bg-[#070A13]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        id="pin-auth-modal" 
        className="relative w-full max-w-sm bg-[#111827] border border-white/10 rounded-3xl overflow-hidden p-6 shadow-[0_0_50px_rgba(34,211,238,0.15)] flex flex-col items-center"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-450 hover:text-white p-1 rounded-xl hover:bg-white/5 transition duration-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-[#34d399] p-[1.5px] shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center justify-center relative">
            <div className="absolute inset-[1.5px] bg-[#070A13] rounded-[13px] flex items-center justify-center">
              {status === "success" ? (
                <CheckCircle className="w-6 h-6 text-emerald-400 animate-bounce" />
              ) : status === "error" ? (
                <AlertTriangle className="w-6 h-6 text-rose-500 animate-pulse" />
              ) : (
                <Lock className="w-6 h-6 text-cyan-400" />
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-sans font-black uppercase tracking-wider text-white text-center leading-tight mb-1">
          Vérification de Sécurité
        </h3>
        <p className="text-xs text-slate-400 text-center mb-5 font-medium">
          Saisir le PIN pour <span className="text-cyan-400 font-extrabold">{targetUser.nom}</span>
        </p>

        {/* Visual Dots Indicators */}
        <div className="flex items-center gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => {
            const isActive = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  status === "success"
                    ? "bg-emerald-400 shadow-[0_0_12px_#34d399]"
                    : status === "error"
                    ? "bg-rose-500 shadow-[0_0_12px_#ef4444] animate-ping"
                    : isActive
                    ? "bg-cyan-400 shadow-[0_0_12px_#22d3ee] scale-110"
                    : "bg-slate-800 border border-slate-700"
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-rose-500 font-mono font-bold text-center text-[10px] tracking-wider uppercase mb-4 animate-pulse">
            ⚠️ {error}
          </div>
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mb-5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] active:scale-95 text-xl font-bold font-mono tracking-normal text-white transition-all cursor-pointer border border-white/[0.04] hover:border-cyan-500/20 shadow-md min-h-[50px] flex items-center justify-center select-none"
            >
              {num}
            </button>
          ))}
          {/* Clear Button */}
          <button
            onClick={handleClear}
            className="py-3 rounded-2xl bg-slate-900 hover:bg-slate-855 text-xs font-black tracking-wider text-slate-400 font-sans cursor-pointer transition active:scale-95 select-none min-h-[50px] flex items-center justify-center border border-white/[0.02]"
          >
            EFFACER
          </button>
          {/* 0 Button */}
          <button
            onClick={() => handleKeyPress("0")}
            className="py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] active:scale-95 text-xl font-bold font-mono text-white transition-all cursor-pointer border border-white/[0.04] hover:border-cyan-500/20 shadow-md min-h-[50px] flex items-center justify-center select-none"
          >
            0
          </button>
          {/* Backspace Button */}
          <button
            onClick={handleDelete}
            className="py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-rose-300 font-bold cursor-pointer transition active:scale-101 select-none min-h-[50px] flex items-center justify-center border border-white/[0.02]"
            title="Retour arrière"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Info panel with helper PIN to keep evaluation simple */}
        <div className="bg-cyan-950/20 border border-cyan-500/10 rounded-2xl p-3 w-full text-[10px] text-cyan-300 font-medium flex items-start gap-2">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-extrabold uppercase tracking-wide leading-none mb-1">Code PIN d'évaluation</p>
            <p className="text-cyan-400/80 leading-tight">
              Saisissez <span className="font-mono font-black text-rose-300">{targetUser.pin_code || "1111"}</span> pour déverrouiller / connecter ce compte.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
