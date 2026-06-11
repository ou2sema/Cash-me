import React, { useState, useEffect } from "react";
import { MenuItem, TeaRoomUser, CategoryItem, HomeSettings } from "../types";
import { 
  PlusCircle, 
  Search, 
  AlertOctagon, 
  Archive, 
  Check, 
  ArrowRightLeft, 
  Trash2, 
  Edit3, 
  Tag, 
  Home, 
  Package, 
  Upload, 
  Settings, 
  Sparkles 
} from "lucide-react";
import { 
  addOrRestockProduct, 
  createNewProduct, 
  editProductCatalog, 
  deleteProductFromDb,
  createNewCategory,
  editCategoryInDb,
  deleteCategoryFromDb,
  saveHomeSettings
} from "../services/db";

interface StockManagerPanelProps {
  products: MenuItem[];
  currentUser: TeaRoomUser | null;
  allStaff?: TeaRoomUser[];
  onSelectUser?: (user: TeaRoomUser | null) => void;
  categories?: CategoryItem[];
  homeSettings?: HomeSettings | null;
}

export default function StockManagerPanel({ 
  products, 
  currentUser,
  allStaff = [],
  onSelectUser,
  categories = [],
  homeSettings = null
}: StockManagerPanelProps) {
  // Navigation inside Stocks panel
  const [activeSubTab, setActiveSubTab] = useState<"produits" | "categories" | "accueil">("produits");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  
  // Feedback alerts
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Restock control
  const [restockAmount, setRestockAmount] = useState<Record<string, number>>({});

  // ----------------------------------------------------
  // SUB-TAB 1: PRODUCT FORM STATES (ADD & EDIT)
  // ----------------------------------------------------
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [prodNom, setProdNom] = useState("");
  const [prodPrix, setProdPrix] = useState("");
  const [prodStock, setProdStock] = useState("20");
  const [prodAlerte, setProdAlerte] = useState("5");
  const [prodCat, setProdCat] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodImage, setProdImage] = useState("");

  // Set initial category choice when categories load
  useEffect(() => {
    if (categories.length > 0 && !prodCat) {
      setProdCat(categories[0].nom);
    }
  }, [categories, prodCat]);

  // Image upload and resize utility to keep Firestore lightweight (< 25KB)
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 280;
        const MAX_HEIGHT = 280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75); // 75% quality JPEG
          setProdImage(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddNewForm = () => {
    setIsEditing(false);
    setEditingProductId("");
    setProdNom("");
    setProdPrix("");
    setProdStock("20");
    setProdAlerte("5");
    setProdCat(categories.length > 0 ? categories[0].nom : "");
    setProdDesc("");
    setProdImage("");
    setIsFormOpen(true);
    setActionError("");
    setActionSuccess("");
  };

  const handleOpenEditForm = (p: MenuItem) => {
    setIsEditing(true);
    setEditingProductId(p.id);
    setProdNom(p.nom);
    setProdPrix(p.prix.toString());
    setProdStock(p.stock_actuel.toString());
    setProdAlerte(p.stock_alerte.toString());
    setProdCat(p.categorie);
    setProdDesc(p.description || "");
    setProdImage(p.image_url || "");
    setIsFormOpen(true);
    setActionError("");
    setActionSuccess("");
  };

  const handleCreateOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    if (!prodNom.trim() || !prodPrix.trim() || !prodStock.trim() || !prodAlerte.trim() || !prodCat) {
      setActionError("Veuillez remplir tous les champs marqués.");
      return;
    }

    const priceNum = parseFloat(prodPrix);
    const stockNum = parseInt(prodStock);
    const alertNum = parseInt(prodAlerte);

    if (isNaN(priceNum) || priceNum < 0) {
      setActionError("Le prix doit être un nombre positif.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setActionError("Le stock doit être supérieur ou égal à 0.");
      return;
    }
    if (isNaN(alertNum) || alertNum < 0) {
      setActionError("Le seuil d'alerte doit être supérieur ou égal à 0.");
      return;
    }

    if (!currentUser) {
      setActionError("Session inactive.");
      return;
    }

    try {
      if (isEditing) {
        const updatedProduct: MenuItem = {
          id: editingProductId,
          nom: prodNom.trim(),
          prix: priceNum,
          stock_actuel: stockNum,
          stock_alerte: alertNum,
          categorie: prodCat,
          description: prodDesc.trim(),
          image_url: prodImage
        };
        await editProductCatalog(updatedProduct, currentUser);
        setActionSuccess(`Le produit "${prodNom}" a été mis à jour avec succès.`);
      } else {
        await createNewProduct({
          nom: prodNom.trim(),
          prix: priceNum,
          stock_actuel: stockNum,
          stock_alerte: alertNum,
          categorie: prodCat,
          description: prodDesc.trim(),
          image_url: prodImage
        }, currentUser);
        setActionSuccess(`Le produit "${prodNom}" a été enregistré !`);
      }

      setIsFormOpen(false);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setActionError(err.message || "Échec de l'enregistrement.");
    }
  };

  const handleConfirmDeleteProduct = async (productId: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      await deleteProductFromDb(productId);
      setActionSuccess("Le produit a été retiré du catalogue.");
      setConfirmDeleteId(null);
      setTimeout(() => setActionSuccess(""), 3500);
    } catch (err: any) {
      setActionError(err.message || "Échec de la suppression.");
    }
  };

  const handleRestock = async (productId: string) => {
    setActionError("");
    setActionSuccess("");
    const qty = restockAmount[productId] || 0;
    if (qty <= 0) {
      setActionError("Veuillez saisir une quantité supérieure à 0.");
      return;
    }

    if (!currentUser) {
      setActionError("Session inactive.");
      return;
    }

    try {
      await addOrRestockProduct(productId, qty, currentUser);
      setActionSuccess("Stock approvisionné.");
      setRestockAmount(prev => ({ ...prev, [productId]: 0 }));
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Erreur de mise à jour.");
    }
  };

  // ----------------------------------------------------
  // SUB-TAB 2: CATEGORIES STATES
  // ----------------------------------------------------
  const [newCatNom, setNewCatNom] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatNom, setEditingCatNom] = useState("");

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    if (!newCatNom.trim()) {
      setActionError("Le nom de la catégorie ne peut être vide.");
      return;
    }

    try {
      await createNewCategory(newCatNom.trim());
      setActionSuccess(`Catégorie "${newCatNom}" ajoutée.`);
      setNewCatNom("");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Échec de création.");
    }
  };

  const handleEditCategory = async (id: string) => {
    setActionError("");
    setActionSuccess("");
    if (!editingCatNom.trim()) {
      setActionError("Le nom ne peut pas être vide.");
      return;
    }
    try {
      await editCategoryInDb(id, editingCatNom.trim());
      setActionSuccess("Catégorie modifiée.");
      setEditingCatId(null);
      setEditingCatNom("");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Échec de modification.");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    setActionError("");
    setActionSuccess("");
    // Check if products exist in this category
    const count = products.filter(p => p.categorie === name).length;
    if (count > 0) {
      setActionError(`Impossible de supprimer "${name}": ${count} produit(s) y sont rattachés. Déplacez-les d'abord.`);
      return;
    }

    try {
      await deleteCategoryFromDb(id);
      setActionSuccess("Catégorie supprimée.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Échec de suppression.");
    }
  };


  // ----------------------------------------------------
  // SUB-TAB 3: HOME SETTINGS STATES
  // ----------------------------------------------------
  const [homeSalonName, setHomeSalonName] = useState(homeSettings?.salonName || "L'Heure du Thé");
  const [homeWelcomeTitle, setHomeWelcomeTitle] = useState(homeSettings?.welcomeTitle || "Bienvenue à L'Heure du Thé");
  const [homeWelcomeSubtitle, setHomeWelcomeSubtitle] = useState(homeSettings?.welcomeSubtitle || "Sélection de thés d'exception & pâtisseries artisanales");
  const [homeAnnouncement, setHomeAnnouncement] = useState(homeSettings?.announcement || "");
  const [homeShowAnnouncement, setHomeShowAnnouncement] = useState(homeSettings?.showAnnouncement ?? true);
  const [homeLogoUrl, setHomeLogoUrl] = useState(homeSettings?.logoUrl || "");

  // Update locale states if backend loads settings
  useEffect(() => {
    if (homeSettings) {
      setHomeSalonName(homeSettings.salonName);
      setHomeWelcomeTitle(homeSettings.welcomeTitle);
      setHomeWelcomeSubtitle(homeSettings.welcomeSubtitle);
      setHomeAnnouncement(homeSettings.announcement);
      setHomeShowAnnouncement(homeSettings.showAnnouncement);
      setHomeLogoUrl(homeSettings.logoUrl || "");
    }
  }, [homeSettings]);

  const handleSettingsLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 140;
        const MAX_HEIGHT = 140;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.82); // High quality compact JPEG
          setHomeLogoUrl(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveHomeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");

    try {
      const updated: HomeSettings = {
        id: "home",
        salonName: homeSalonName.trim(),
        welcomeTitle: homeWelcomeTitle.trim(),
        welcomeSubtitle: homeWelcomeSubtitle.trim(),
        announcement: homeAnnouncement.trim(),
        showAnnouncement: homeShowAnnouncement,
        logoUrl: homeLogoUrl
      };
      await saveHomeSettings(updated);
      setActionSuccess("Les réglages de la page d'accueil ont été enregistrés !");
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err: any) {
      setActionError(err.message || "Échec de l'enregistrement des réglages.");
    }
  };


  // ----------------------------------------------------
  // AUTHORITY SECURITY GUARD 
  // ----------------------------------------------------
  const isAuthorized = currentUser && (currentUser.role === "admin" || currentUser.role === "gerant");

  if (!isAuthorized) {
    return (
      <div id="unauthorized-stock-container" className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-800 shadow-sm max-w-xl mx-auto">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h3 className="font-display font-bold text-lg text-[#2D3A30] mb-2">Accès Restreint</h3>
        <p className="text-slate-500 max-w-sm mx-auto text-xs leading-relaxed mb-4">
          Seuls les gérants et administrateurs peuvent modifier les stocks, gérer les catégories, ou personnaliser l'écran d'accueil.
        </p>
        <span className="inline-block text-[11px] font-mono select-all bg-[#F1F3EE] border border-slate-200 text-slate-650 px-3 py-1 rounded mb-6">
          Rôle actuel de la session : {currentUser ? currentUser.role.toUpperCase() : "INVITÉ"}
        </span>

        {allStaff.length > 0 && onSelectUser && (
          <div className="border-t border-slate-100 pt-6 mt-2">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">
              🔋 Badger en un clic pour tester :
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-md mx-auto">
              {allStaff.map((staff) => (
                <button
                  id={`stock-quick-badge-${staff.uid}`}
                  key={staff.uid}
                  type="button"
                  onClick={() => onSelectUser(staff)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-[11px] font-bold tracking-tight transition cursor-pointer ${
                    staff.role === "admin" || staff.role === "gerant"
                      ? "bg-[#2D3A30] text-white hover:bg-[#1a231d] border-[#2D3A30]"
                      : "bg-[#F1F3EE] text-slate-600 hover:bg-[#e4e7e0] border-slate-200"
                  }`}
                >
                  <span className="truncate">{staff.nom.split(" ")[0]}</span>
                  <span className="text-[8px] font-mono opacity-85 px-1 bg-black/10 text-white rounded">
                    {staff.role === "admin" ? "Admin" : staff.role === "gerant" ? "Gérant" : "Staff"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Filter products for display in Products Sub-tab
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.categorie.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "Tous" || p.categorie === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div id="stock-manager-main" className="space-y-6">
      
      {/* Toast Feedbacks */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-medium flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-[#F1F3EE] border border-[#8BA888]/30 text-emerald-800 rounded-xl p-3 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-[#8BA888]" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Internal Sub-navigation system tabs (Product, Category, Welcomer) */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveSubTab("produits"); setIsFormOpen(false); }}
          className={`flex-1 sm:flex-none py-3 px-5 text-xs font-bold border-b-2 font-display transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === "produits"
              ? "border-[#2D3A30] text-[#2D3A30]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Gestion Produits</span>
        </button>
        <button
          onClick={() => { setActiveSubTab("categories"); setIsFormOpen(false); }}
          className={`flex-1 sm:flex-none py-3 px-5 text-xs font-bold border-b-2 font-display transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === "categories"
              ? "border-[#2D3A30] text-[#2D3A30]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Gestion Catégories</span>
        </button>
        <button
          onClick={() => { setActiveSubTab("accueil"); setIsFormOpen(false); }}
          className={`flex-1 sm:flex-none py-3 px-5 text-xs font-bold border-b-2 font-display transition duration-200 flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === "accueil"
              ? "border-[#2D3A30] text-[#2D3A30]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Réglages Accueil</span>
        </button>
      </div>

      {/* ----------------------------------------------------
          SUB-TAB VIEWPORT 1: PRODUCTS
          ---------------------------------------------------- */}
      {activeSubTab === "produits" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="product-search-input"
                  type="text"
                  placeholder="Rechercher par nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg py-2 pl-9 pr-4 text-xs text-[#2D3A30] placeholder-slate-400 focus:outline-none focus:border-[#8BA888]"
                />
              </div>
              <select
                id="category-filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-250 rounded-lg py-2 px-3 text-xs text-slate-700 focus:outline-none focus:border-[#8BA888] cursor-pointer"
              >
                <option value="Tous">Toutes Catégories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.nom}>{cat.nom}</option>
                ))}
              </select>
            </div>

            <button
              id="toggle-add-product-btn"
              onClick={isFormOpen ? () => setIsFormOpen(false) : handleOpenAddNewForm}
              className="bg-[#2D3A30] hover:bg-[#1a231d] text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              {isFormOpen ? "Retour Catalogue" : "Référencer Produit"}
            </button>
          </div>

          {isFormOpen ? (
            /* Product Formulation Form (Create & Edit) */
            <form id="create-product-form" onSubmit={handleCreateOrUpdateProduct} className="bg-white border border-slate-205 rounded-xl p-6 text-slate-800 space-y-4 shadow-sm">
              <h3 className="font-display font-bold text-sm text-[#2D3A30] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Archive className="text-[#8BA888] w-4 h-4" />
                {isEditing ? `Modifier le Produit (${prodNom})` : "Ajouter un Nouveau Produit au Menu"}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nom du produit *</label>
                  <input
                    id="form-product-name"
                    type="text"
                    value={prodNom}
                    onChange={e => setProdNom(e.target.value)}
                    placeholder="Ex. Genmaicha Supérieur"
                    className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Prix Unitaire Net (DT TTC) *</label>
                  <input
                    id="form-product-price"
                    type="number"
                    step="0.001"
                    value={prodPrix}
                    onChange={e => setProdPrix(e.target.value)}
                    placeholder="Ex. 6.500"
                    className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Stock Actuel *</label>
                  <input
                    id="form-product-stock"
                    type="number"
                    value={prodStock}
                    onChange={e => setProdStock(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Alerte de Stock (Seuil Bas) *</label>
                  <input
                    id="form-product-alert"
                    type="number"
                    value={prodAlerte}
                    onChange={e => setProdAlerte(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Catégorie *</label>
                  <select
                    id="form-product-category"
                    value={prodCat}
                    onChange={e => setProdCat(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.nom}>{cat.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Description (Optionnel)</label>
                  <input
                    id="form-product-desc"
                    type="text"
                    value={prodDesc}
                    onChange={e => setProdDesc(e.target.value)}
                    placeholder="Ex. Notes marines et riz brun grillé..."
                    className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                {/* Product Photo Upload Field */}
                <div className="md:col-span-2 bg-[#F9FAF8] border border-dashed border-slate-200 rounded-xl p-4">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Photo du produit (Se convertit en Base64 compacte)</label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {prodImage ? (
                      <div className="relative group w-20 h-20 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-xs">
                        <img src={prodImage} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setProdImage("")}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition duration-150"
                        >
                          Détacher
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2D3A30] file:text-white hover:file:bg-black cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Retaillage automatique optimisé à 280px pour les performances Firestore.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-205 text-xs font-semibold py-1.5 px-4 rounded-md transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#2D3A30] hover:bg-[#1f2922] text-white text-xs font-semibold py-1.5 px-5 rounded-md transition cursor-pointer"
                >
                  {isEditing ? "Enregistrer les modifications" : "Créer le produit"}
                </button>
              </div>
            </form>
          ) : (
            /* Catalog table with full touch controls */
            <div id="stock-list-grid" className="bg-white border border-slate-200 rounded-xl overflow-hidden text-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#F1F3EE] text-[#2D3A30] text-[10px] uppercase font-mono tracking-wider border-b border-slate-250/60">
                      <th className="py-3 px-4 font-bold">Visuel / Désignation</th>
                      <th className="py-3 px-4 font-bold">Catégorie</th>
                      <th className="py-3 px-4 font-bold text-center">Prix</th>
                      <th className="py-3 px-4 font-bold text-center">Niveau de Stock</th>
                      <th className="py-3 px-4 font-bold text-center">Statut</th>
                      <th className="py-3 px-4 font-bold text-right">Ravitaillement / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                          Aucun produit disponible.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(p => {
                        const isLowStock = p.stock_actuel <= p.stock_alerte;
                        return (
                          <tr key={p.id} className="hover:bg-[#F9FAF8]/70 transition">
                            {/* Desig + Image preview */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-150 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-xs">
                                  {p.image_url ? (
                                    <img src={p.image_url} className="w-full h-full object-cover" alt={p.nom} referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="text-xl">🍵</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-[#2D3A30] truncate max-w-[180px]">{p.nom}</div>
                                  {p.description && (
                                    <div className="text-[10px] text-slate-500 line-clamp-1 max-w-[200px] mt-0.5 leading-relaxed">{p.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[9px] bg-[#F1F3EE] px-2 py-0.5 rounded text-slate-650 border border-slate-200/40 font-bold uppercase tracking-wider">
                                {p.categorie}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-xs font-mono font-bold text-slate-600">
                              {p.prix.toFixed(3)} DT
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                                  p.stock_actuel <= 0 
                                    ? "bg-rose-50 text-rose-700 border border-rose-100" 
                                    : isLowStock 
                                      ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse" 
                                      : "bg-green-50 text-green-700 border border-green-100"
                                }`}>
                                  {p.stock_actuel} {p.stock_actuel <= 1 ? "unité" : "unités"}
                                </span>
                                <span className="text-[9px] text-slate-450 mt-0.5 font-mono">
                                  Seuil d'alerte : {p.stock_alerte}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {p.stock_actuel <= 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                  Rupture
                                </span>
                              ) : isLowStock ? (
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                  Sous-Seuil
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 uppercase bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                  Fidèle
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {confirmDeleteId === p.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-[9px] text-rose-600 font-bold mr-1">Supprimer ?</span>
                                  <button
                                    onClick={() => handleConfirmDeleteProduct(p.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold py-1 px-2 rounded cursor-pointer"
                                  >
                                    Oui
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold py-1 px-2 rounded cursor-pointer"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2 justify-end">
                                  {/* Restock input */}
                                  <input
                                    id={`restock-input-${p.id}`}
                                    type="number"
                                    min="0"
                                    placeholder="+10"
                                    value={restockAmount[p.id] || ""}
                                    onChange={e => {
                                      const val = parseInt(e.target.value) || 0;
                                      setRestockAmount(prev => ({ ...prev, [p.id]: val }));
                                    }}
                                    className="w-12 bg-white border border-slate-200 rounded py-1 px-1.5 text-xs text-center focus:outline-none focus:border-[#8BA888] font-mono text-slate-850"
                                  />
                                  <button
                                    id={`restock-submit-btn-${p.id}`}
                                    onClick={() => handleRestock(p.id)}
                                    className="bg-slate-100 hover:bg-[#F1F3EE] text-slate-700 border border-slate-200 rounded p-1.5 transition text-xs cursor-pointer"
                                    title="Réapprovisionner"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                                  </button>
                                  
                                  {/* Edit Product */}
                                  <button
                                    onClick={() => handleOpenEditForm(p)}
                                    className="bg-slate-100 hover:bg-[#F1F3EE] text-blue-800 border border-slate-200 rounded p-1.5 transition text-xs cursor-pointer"
                                    title="Modifier la fiche"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-[#2D3A30]" />
                                  </button>

                                  {/* Delete Product */}
                                  <button
                                    onClick={() => setConfirmDeleteId(p.id)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-150 rounded p-1.5 transition text-xs cursor-pointer"
                                    title="Retirer le produit"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          SUB-TAB VIEWPORT 2: CATEGORIES
          ---------------------------------------------------- */}
      {activeSubTab === "categories" && (
        <div id="category-manager-deck" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Category Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 h-fit">
            <h4 className="font-display font-semibold text-xs uppercase tracking-tight text-[#2D3A30] border-b border-slate-100 pb-2">
              Créer une Catégorie
            </h4>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nom de la catégorie *</label>
                <input
                  type="text"
                  placeholder="Ex. Pâtisseries Glacées"
                  value={newCatNom}
                  onChange={e => setNewCatNom(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-[#8BA888]"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#2D3A30] hover:bg-[#1a231d] text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-display font-semibold text-xs uppercase tracking-tight text-[#2D3A30]">
                Catégories Actives (Firestore Sync)
              </h4>
              <span className="text-[10px] font-mono text-slate-400 font-bold">{categories.length} Catégories</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="py-2.5 flex items-center justify-between gap-4">
                  {editingCatId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingCatNom}
                        onChange={e => setEditingCatNom(e.target.value)}
                        className="flex-1 bg-white border border-slate-250 rounded py-1 px-2.5 text-xs text-slate-850 focus:outline-none"
                      />
                      <button
                        onClick={() => handleEditCategory(cat.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1 transition cursor-pointer"
                        title="Sauvegarder"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded p-1 transition cursor-pointer"
                        title="Annuler"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-bold text-xs text-[#2D3A30]">{cat.nom}</span>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                          ID: {cat.id} • {products.filter(p => p.categorie === cat.nom).length} produits
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatNom(cat.nom);
                          }}
                          className="bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-650 rounded p-1.5 transition text-xs cursor-pointer"
                          title="Modifier"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.nom)}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-650 rounded p-1.5 transition text-xs cursor-pointer"
                          title="Supprimer la catégorie"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SUB-TAB VIEWPORT 3: HOME SCREEN CUSTOMIZATION
          ---------------------------------------------------- */}
      {activeSubTab === "accueil" && (
        <form onSubmit={handleSaveHomeSettings} className="bg-white border border-slate-200 rounded-xl p-6 text-slate-800 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Settings className="text-[#8BA888] w-4 h-4 shrink-0" />
            <div>
              <h3 className="font-display font-semibold text-sm text-[#2D3A30]">
                Personnalisation de l'Écran d'Accueil
              </h3>
              <p className="text-[11px] text-slate-450">
                Configurez le nom de l'établissement, les messages de bienvenue et les encarts de promotion visibles par les clients.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nom de l'enseigne / salon *</label>
              <input
                type="text"
                value={homeSalonName}
                onChange={e => setHomeSalonName(e.target.value)}
                placeholder="Ex. Salon de L'Heure du Thé"
                className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Titre de bienvenue *</label>
              <input
                type="text"
                value={homeWelcomeTitle}
                onChange={e => setHomeWelcomeTitle(e.target.value)}
                placeholder="Ex. Bienvenue à la Maison Uji !"
                className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Sous-titre / Message d'ambiance *</label>
              <input
                type="text"
                value={homeWelcomeSubtitle}
                onChange={e => setHomeWelcomeSubtitle(e.target.value)}
                placeholder="Ex. Infusions d'exceptions & Pâtisseries fines japonaises..."
                className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
                required
              />
            </div>

            <div className="bg-[#F9FAF8] border border-slate-150 rounded-xl p-4 md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-400">Encart Annonces & Promotions</label>
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={homeShowAnnouncement}
                    onChange={e => setHomeShowAnnouncement(e.target.checked)}
                    className="rounded border-slate-350 bg-white text-[#2D3A30] focus:ring-[#8BA888]"
                  />
                  <span>Afficher la bannière</span>
                </label>
              </div>
              <textarea
                value={homeAnnouncement}
                onChange={e => setHomeAnnouncement(e.target.value)}
                placeholder="Ex. Joyeuses fêtes ! Utilisez votre carte RFID de rechargement pour obtenir -15% sur tous les thés d’automne."
                rows={2}
                className="w-full bg-white border border-slate-250 rounded-md py-1.5 px-3 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* Logo upload block */}
            <div className="bg-[#F9FAF8] border border-slate-150 rounded-xl p-4 md:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Logo de l'enseigne (Optionnel)</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {homeLogoUrl ? (
                  <div className="relative group w-16 h-16 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-xs">
                    <img src={homeLogoUrl} className="w-full h-full object-cover" alt="Logo Preview" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setHomeLogoUrl("")}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition duration-150"
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSettingsLogoUpload}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2D3A30] file:text-white hover:file:bg-black cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Format carré idéal. Résolution ajustée à 120px pour maintenir un chargement quasi instantané de la caisse.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 mt-4">
            <button
              type="submit"
              className="bg-[#2D3A30] hover:bg-[#1a231d] text-white text-xs font-bold py-2 px-5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-4 h-4 text-white" />
              <span>Enregistrer Réglages</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
