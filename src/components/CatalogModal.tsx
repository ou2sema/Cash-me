import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import { CategoryItem } from '../types';

interface CatalogModalProps {
  open: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onAddCategory: (nom: string) => Promise<void>;
  onEditCategory: (id: string, nom: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function CatalogModal({
  open,
  onClose,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CatalogModalProps) {
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onAddCategory(newCatName.trim());
      setNewCatName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l\'ajout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onEditCategory(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (['theiere', 'cristal', 'narguile'].includes(id)) {
      setErrorMsg('Les catégories système par défaut ne peuvent pas être supprimées.');
      return;
    }
    if (!window.confirm(`Voulez-vous vraiment supprimer la catégorie "${nom}" ?`)) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onDeleteCategory(id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans">
      <div 
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#070f1e] text-slate-100 overflow-hidden shadow-2xl relative"
        style={{ boxShadow: '0 0 30px rgba(0, 245, 212, 0.1)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <span className="text-cyan-400 text-sm font-bold">📂</span>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Gestion Catalogue</h3>
              <p className="text-[10px] text-slate-400">Ajoutez, modifiez ou supprimez vos catégories de vente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form to add */}
        <div className="p-6 border-b border-slate-800/50 bg-[#0a1528]/40">
          <form onSubmit={handleAdd} className="flex gap-2.5">
            <input
              type="text"
              placeholder="Ex: Gourmandises, Tapas, Softs..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              disabled={isSubmitting}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-505 focus:outline-none focus:border-cyan-500 transition-all font-medium"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCatName.trim()}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </form>
          {errorMsg && (
            <div className="mt-3 text-[10px] text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
              {errorMsg}
            </div>
          )}
        </div>

        {/* List of categories */}
        <div className="max-h-[280px] overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-1">
            CatégoriesActives ({categories.length})
          </div>
          {categories.map((cat) => {
            const isSystem = ['theiere', 'cristal', 'narguile'].includes(cat.id);
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#0d1627] hover:border-slate-700 transition duration-150"
              >
                {isEditing ? (
                  <div className="flex-1 flex gap-2 mr-3">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-750 rounded-lg px-3 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <div className="text-xs font-bold text-slate-200">
                        {cat.nom}
                        {isSystem && (
                          <span className="ml-2 text-[8px] font-mono font-bold uppercase text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded">
                            Système
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditingName(cat.nom);
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      
                      {!isSystem && (
                        <button
                          onClick={() => handleDelete(cat.id, cat.nom)}
                          className="p-2 rounded-lg bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 transition cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/60 bg-[#050b16] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-705 text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
