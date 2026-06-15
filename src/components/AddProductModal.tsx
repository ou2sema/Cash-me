import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { CategoryItem, MenuItem } from "../types";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: string;
  categories: CategoryItem[];
  onSubmit: (product: Omit<MenuItem, "id">) => Promise<void>;
}

export default function AddProductModal({
  isOpen,
  onClose,
  activeCategory,
  categories,
  onSubmit,
}: AddProductModalProps) {
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("");
  const [accent, setAccent] = useState<'cyan' | 'amber' | 'green' | 'purple'>('cyan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const activeCategoryObj = categories.find(c => c.id === activeCategory);
  const activeCategoryLabel = activeCategoryObj 
    ? activeCategoryObj.nom 
    : (activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1));

  useEffect(() => {
    if (isOpen) {
      setNom("");
      setPrix("");
      // Smart preselection of accent based on category content
      if (activeCategory.toLowerCase().includes("thei") || activeCategory === "theiere") {
        setAccent("cyan");
      } else if (activeCategory.toLowerCase().includes("narg") || activeCategory === "narguile") {
        setAccent("purple");
      } else if (activeCategory.toLowerCase().includes("crist") || activeCategory === "cristal") {
        setAccent("green");
      } else {
        setAccent("cyan");
      }
      setErrorMsg("");
    }
  }, [isOpen, activeCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setErrorMsg("Le nom de l'article est requis.");
      return;
    }
    const parsedPrice = parseFloat(prix);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg("Le prix doit être un nombre positif valide.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // Automatic category inheritance using active category name or fallback to active category ID
      const finalCategoryStr = activeCategoryObj ? activeCategoryObj.nom : activeCategory;

      await onSubmit({
        nom: nom.trim(),
        prix: parsedPrice,
        categorie: finalCategoryStr,
        stock_actuel: 80, // Default generous stock
        stock_alerte: 5,  // Default threshold
        description: "Article ajouté contextuellement",
        accent: accent,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors du traitement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const accents = [
    { key: "cyan" as const, icon: "🫖", label: "Bleu Néon (Théières)", bg: "hover:bg-cyan-950/25", border: "border-cyan-500", text: "text-cyan-400" },
    { key: "amber" as const, icon: "☕", label: "Ambre Chaud (Cafés)", bg: "hover:bg-amber-955/25", border: "border-amber-500", text: "text-amber-400" },
    { key: "green" as const, icon: "🍵", label: "Vert Matcha (Douceurs)", bg: "hover:bg-green-955/25", border: "border-green-500", text: "text-green-400" },
    { key: "purple" as const, icon: "💨", label: "Violet Vapeur (Narguilés)", bg: "hover:bg-purple-955/25", border: "border-purple-500", text: "text-purple-400" },
  ];

  return (
    <div id="add-product-modal-overlay" className="fixed inset-0 bg-[#02050b]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        id="add-product-modal" 
        className="w-full max-w-md bg-[#081122] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,245,212,0.1)] flex flex-col font-sans"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <span className="text-cyan-400 text-sm font-bold">➕</span>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Ajouter un Article</h3>
              <p className="text-[9px] text-slate-400 uppercase tracking-wide font-mono mt-0.5">
                Catégorie : <span className="text-white font-bold">{activeCategoryLabel}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Nom de l'article */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Nom de l'article
            </label>
            <input
              type="text"
              placeholder="Ex : Matcha de Cérémonie Uji"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all font-medium"
            />
          </div>

          {/* Prix de l'article */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Prix (en DT)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.050"
                min="0"
                placeholder="Ex : 12.500"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-12 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-all font-mono font-bold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 font-mono">
                DT
              </span>
            </div>
          </div>

          {/* Choix de l'Icône & Accentuation */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Icône & Accent Visuel
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {accents.map((acc) => {
                const isSelected = accent === acc.key;
                return (
                  <button
                    key={acc.key}
                    type="button"
                    onClick={() => setAccent(acc.key)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition duration-150 cursor-pointer ${
                      isSelected 
                        ? `${acc.border} bg-cyan-500/10 ${acc.text} font-bold` 
                        : "border-slate-800/80 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xl leading-none">{acc.icon}</span>
                    <span className="text-[9.5px] tracking-wide truncate">{acc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="text-[10px] text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 mt-2 pt-4 border-t border-slate-800/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-850 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nom.trim() || !prix}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
