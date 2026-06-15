import React, { useState, useEffect } from "react";
import { Lock, Delete, Shield, CheckCircle, AlertTriangle, X, Radio, ArrowRight, User, LogOut } from "lucide-react";
import { TeaRoomUser } from "../types";

interface UnifiedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStaff: TeaRoomUser[];
  currentUser: TeaRoomUser | null;
  onLoginSuccess: (user: TeaRoomUser) => void;
  onLogout: () => void;
  onGlobalErrorMsg: (msg: string) => void;
}

export default function UnifiedAuthModal({
  isOpen,
  onClose,
  allStaff,
  currentUser,
  onLoginSuccess,
  onLogout,
  onGlobalErrorMsg,
}: UnifiedAuthModalProps) {
  const [selectedStaff, setSelectedStaff] = useState<TeaRoomUser | null>(null);
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "typing" | "verifying" | "success" | "error">("idle");

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setStatus("idle");
      setSelectedStaff(currentUser);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const playBeep = (freq: number = 600, dur: number = 0.08) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + dur);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  };

  const handleStaffSelect = (staff: TeaRoomUser) => {
    playBeep(550, 0.05);
    setSelectedStaff(staff);
    setPin("");
    setError("");
    setStatus("typing");
  };

  const handleKeyPress = (num: string) => {
    if (status === "verifying" || status === "success") return;
    playBeep(700, 0.05);
    setError("");
    setStatus("typing");
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    playBeep(400, 0.06);
    setError("");
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    playBeep(350, 0.08);
    setError("");
    setPin("");
  };

  const handleVerifyAndLogin = async () => {
    if (!selectedStaff) {
      setError("Veuillez sélectionner un profil utilisateur.");
      setStatus("error");
      return;
    }
    if (!pin) {
      setError("Veuillez saisir votre code PIN.");
      setStatus("error");
      return;
    }

    playBeep(850, 0.08);
    setStatus("verifying");

    setTimeout(() => {
      if (pin === selectedStaff.pin_code) {
        setStatus("success");
        playBeep(950, 0.15);
        setTimeout(() => {
          onLoginSuccess(selectedStaff);
          onClose();
        }, 600);
      } else {
        setError("Code PIN incorrect. Veuillez réessayer.");
        setStatus("error");
        playBeep(250, 0.2);
        setPin("");
      }
    }, 800);
  };

  const handleDirectLogout = () => {
    playBeep(300, 0.15);
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300">
      
      {/* Conteneur Principal Sombre & Cyan */}
      <div className="relative w-[780px] max-w-[95vw] bg-[#090f19] border border-white/[0.06] shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-2xl flex flex-col overflow-hidden text-slate-100 font-sans font-medium">
        
        {/* En-tête de la Modale */}
        <div className="px-6 py-4 border-b border-white/[0.04] bg-[#0c1424] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide text-slate-100 uppercase">
                Authentification Opérateur
              </h3>
              <p className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase mt-0.5">
                Terminal Sécurisé // Système POS
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps de la Modale réparti en deux colonnes */}
        <div className="flex flex-1 min-h-[420px]">
          
          {/* Colonne Gauche : Liste des utilisateurs */}
          <div className="w-1/2 p-6 border-r border-white/[0.04] bg-[#070b13] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block mb-3">
                Sélectionner un Profil :
              </span>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {allStaff.map((staff) => {
                  const isSelected = selectedStaff?.uid === staff.uid;
                  const isActiveUser = currentUser?.uid === staff.uid;
                  
                  return (
                    <div
                      key={staff.uid}
                      onClick={() => handleStaffSelect(staff)}
                      className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between select-none ${
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.04)]"
                          : "bg-[#0d1424]/60 border-white/[0.04] hover:bg-[#111a2e] hover:border-white/[0.1]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                          isSelected ? "bg-cyan-950/50 border-cyan-500/30 text-cyan-400" : "bg-slate-900 border-white/[0.04] text-slate-400"
                        }`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                            {staff.nom}
                          </div>
                          <div className="text-[9px] font-mono tracking-wider text-slate-500 uppercase mt-0.5">
                            Rôle: <span className={staff.role === "admin" || staff.role === "gerant" ? "text-amber-400" : "text-slate-400"}>{staff.role.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      {isActiveUser && (
                        <span className="text-[8px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase">
                          ACTIF
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session courante et Déconnexion */}
            {currentUser && (
              <div className="pt-4 border-t border-white/[0.04] mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono tracking-wide text-slate-400 uppercase">
                    Session: {currentUser.nom}
                  </span>
                </div>
                <button
                  onClick={handleDirectLogout}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" /> Déconnexion
                </button>
              </div>
            )}
          </div>

          {/* Colonne Droite : Clavier PIN numérique */}
          <div className="w-1/2 p-6 bg-[#090f19] flex flex-col justify-between items-center">
            <div className="w-full text-center">
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block mb-3">
                Saisie Code PIN :
              </span>

              {/* Zone d'affichage des points du code PIN */}
              <div className="w-full bg-[#0d1424] border border-white/[0.04] rounded-2xl h-14 flex items-center justify-center gap-3 mb-4 shadow-inner">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border transition-all duration-150 ${
                      i < pin.length
                        ? "bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] scale-110"
                        : "bg-slate-950 border-white/[0.08]"
                    }`}
                  />
                ))}
              </div>

              {/* Message d'erreur ou d'état */}
              <div className="h-5 flex items-center justify-center mb-2">
                {status === "verifying" && (
                  <span className="text-[10px] font-mono tracking-wide text-cyan-400 uppercase animate-pulse">
                    Vérification du code...
                  </span>
                )}
                {status === "success" && (
                  <span className="text-[10px] font-mono tracking-wide text-emerald-400 uppercase flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Accès accordé
                  </span>
                )}
                {error && (
                  <span className="text-[10px] font-mono tracking-wide text-rose-400 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {error}
                  </span>
                )}
                {status === "idle" && !selectedStaff && (
                  <span className="text-[10px] font-mono tracking-wide text-slate-500 uppercase">
                    En attente de profil opérateur
                  </span>
                )}
              </div>

              {/* Grille du Pavé Numérique Tactile */}
              <div className="grid grid-cols-3 gap-2 w-[220px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={status === "verifying" || status === "success"}
                    onClick={() => handleKeyPress(num)}
                    className="w-16 h-12 rounded-xl bg-[#111a2e]/60 border border-white/[0.04] text-base font-extrabold font-mono text-slate-200 hover:border-cyan-500/20 active:bg-cyan-950/30 active:scale-95 transition-all select-none flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}

                {/* Bouton Effacer Tout */}
                <button
                  type="button"
                  disabled={status === "verifying" || status === "success"}
                  onClick={handleClear}
                  className="w-16 h-12 rounded-xl bg-slate-950/80 hover:bg-slate-900/50 text-[9px] font-black uppercase text-slate-500 border border-white/[0.02] active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 cursor-pointer"
                >
                  Effacer
                </button>

                {/* Bouton 0 */}
                <button
                  type="button"
                  disabled={status === "verifying" || status === "success"}
                  onClick={() => handleKeyPress("0")}
                  className="w-16 h-12 rounded-xl bg-[#111a2e]/60 border border-white/[0.04] text-base font-extrabold font-mono text-slate-200 hover:border-cyan-500/20 active:bg-cyan-950/30 active:scale-95 transition-all select-none flex items-center justify-center disabled:opacity-40 cursor-pointer"
                >
                  0
                </button>

                {/* Bouton Retour arrière */}
                <button
                  type="button"
                  disabled={status === "verifying" || status === "success"}
                  onClick={handleDelete}
                  className="w-16 h-12 rounded-xl bg-slate-950/80 hover:bg-slate-900/50 text-rose-400 border border-white/[0.02] active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  title="Supprimer"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bouton de Validation Principal */}
            <button
              type="button"
              disabled={status === "verifying" || status === "success" || !selectedStaff || !pin}
              onClick={handleVerifyAndLogin}
              className="w-full mt-4 h-11 rounded-xl bg-cyan-500 text-slate-950 font-black tracking-wider text-xs uppercase shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-400 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              Valider l'Accès <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Note d'aide discrète en bas */}
        {selectedStaff && (
          <div className="bg-[#050811] px-6 py-2 border-t border-white/[0.02] text-center">
            <p className="text-[9px] font-mono text-slate-600 tracking-wide">
              Aide Test: Code de {selectedStaff.nom} est <span className="text-cyan-600/60 font-bold">{selectedStaff.pin_code || "1111"}</span>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}