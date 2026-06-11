import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  WifiOff, 
  ShoppingBag, 
  Trash2, 
  Coins, 
  RotateCcw, 
  Clock, 
  CreditCard,
  NotebookTabs,
  Menu,
  FileSpreadsheet,
  Settings,
  HeartCrack,
  RefreshCw,
  LogOut,
  Sparkles,
  Check
} from "lucide-react";

import { setFirestoreOnline, auth } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import { 
  seedDatabaseIfEmpty, 
  listenProducts, 
  listenTransactions, 
  listenInventoryLogs, 
  listenUsers,
  listenCategories,
  listenHomeSettings,
  checkoutBasket,
  cancelTransaction
} from "./services/db";

import { MenuItem, BasketItem, TeaRoomUser, TransactionRecord, InventoryLogItem, CategoryItem, HomeSettings } from "./types";
// @ts-ignore
import futuristicTeaIcon from "./assets/images/futuristic_tea_icon_1781193728060.jpg";
import RfidBadgeSimulator from "./components/RfidBadgeSimulator";
import ReceiptPrinterSimulator from "./components/ReceiptPrinterSimulator";
import StockManagerPanel from "./components/StockManagerPanel";
import DashboardStatsPanel from "./components/DashboardStatsPanel";
import TactileKeypad from "./components/TactileKeypad";

export default function App() {
  // Database States
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [allStaff, setAllStaff] = useState<TeaRoomUser[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [homeSettings, setHomeSettings] = useState<HomeSettings | null>(null);
  
  // Realtime Connection States
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Navigation Profile & Sessions
  const [activeTab, setActiveTab ] = useState<"caisse" | "ventes" | "stocks" | "stats">("caisse");
  const [currentUser, setCurrentUser] = useState<TeaRoomUser | null>(null);
  
  // Current Live Basket & tactile modifiers
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  const [quickDiscount, setQuickDiscount] = useState<number>(0);
  
  // Active Invoice modal trigger
  const [shownTransaction, setShownTransaction] = useState<TransactionRecord | null>(null);
  const [lastCompletedTx, setLastCompletedTx] = useState<TransactionRecord | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  // Time tracker for UTC header visual clocks
  const [currentTime, setCurrentTime] = useState(new Date());

  // Confirmation and verification states
  const [pendingCheckout, setPendingCheckout] = useState<{
    type: "STANDARD" | "ESPECES" | "CARTE" | "CHEQUE" | "TND_PAY";
    basket: BasketItem[];
    total: number;
  } | null>(null);

  // Assistive tactile triggers
  const handleTactileCheckout = async (paymentType: "ESPECES" | "CARTE" | "CHEQUE" | "TND_PAY") => {
    if (!currentUser) {
      setGlobalError("Veuillez badger ou sélectionner un vendeur avant d'encaisser.");
      focusVendeurInput();
      return;
    }
    if (basket.length === 0) {
      setGlobalError("Le panier en cours est vierge.");
      return;
    }

    setGlobalError("");
    const rawTotal = basket.reduce((sum, item) => sum + item.prix * item.quantite, 0);
    const basketTotal = Math.max(0, rawTotal - quickDiscount);

    setPendingCheckout({
      type: paymentType,
      basket: [...basket],
      total: basketTotal
    });
  };

  const executeCheckout = async () => {
    if (!pendingCheckout || !currentUser) return;
    setProcessingCheckout(true);
    setGlobalError("");

    const { type, basket: pendingBasket, total: basketTotal } = pendingCheckout;
    const paymentMethodLabel = type === "STANDARD" ? "complet" : type.toLowerCase();

    try {
      const newTxId = await checkoutBasket(pendingBasket, basketTotal, currentUser);
      
      const recordedTx: TransactionRecord = {
        id: newTxId,
        timestamp: Date.now(),
        total: basketTotal,
        user_id: currentUser.uid,
        user_nom: currentUser.nom,
        rfid_token: currentUser.rfid_token,
        type: "vente",
        status: `completed_by_${paymentMethodLabel}`,
        items: pendingBasket.map(b => ({
          product_id: b.id,
          product_nom: b.nom,
          prix_unitaire: b.prix,
          quantite: b.quantite
        }))
      };

      setLastCompletedTx(recordedTx);
      setShownTransaction(recordedTx);
      setBasket([]); 
      setQuickDiscount(0);
      setPendingCheckout(null);
    } catch (err: any) {
      setGlobalError(err.message || "La transaction réseau a échoué.");
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleCancelTransaction = async (tx: TransactionRecord, authorizedBy: TeaRoomUser) => {
    try {
      setGlobalError("");
      await cancelTransaction(tx, authorizedBy);
      
      const updatedTx: TransactionRecord = {
        ...tx,
        status: "annulé"
      };

      setShownTransaction(updatedTx);
      if (lastCompletedTx && lastCompletedTx.id === tx.id) {
        setLastCompletedTx(updatedTx);
      }
    } catch (err: any) {
      setGlobalError(err.message || "Impossible d'annuler la transaction.");
    }
  };

  const incrementLastItemQty = () => {
    if (basket.length === 0) return;
    const lastItem = basket[basket.length - 1];
    const original = products.find(p => p.id === lastItem.id);
    if (original && lastItem.quantite >= original.stock_actuel) {
      setGlobalError(`Attention: Pas assez d'unités de "${lastItem.nom}" en stock.`);
      return;
    }
    setBasket((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        quantite: copy[copy.length - 1].quantite + 1
      };
      return copy;
    });
  };

  const decrementLastItemQty = () => {
    if (basket.length === 0) return;
    const lastItem = basket[basket.length - 1];
    if (lastItem.quantite === 1) {
      setBasket((prev) => prev.slice(0, -1));
    } else {
      setBasket((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          quantite: copy[copy.length - 1].quantite - 1
        };
        return copy;
      });
    }
  };

  const toggleQuickDiscount = () => {
    setQuickDiscount((prev) => (prev === 0 ? 1.000 : 0));
  };

  const focusVendeurInput = () => {
    const el = document.getElementById("rfid-badge-simulator-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 1. Initial automated seeding and load listeners
  useEffect(() => {
    const initializeApp = async () => {
      try {
        try {
          await signInAnonymously(auth);
        } catch (authErr) {
          console.warn("L'authentification anonyme a échoué (probable désactivé dans la console) :", authErr);
        }
        await seedDatabaseIfEmpty();
        setIsReady(true);
      } catch (err: any) {
        console.error("Erreur de boot:", err);
        setGlobalError("Impossible de seed ou de joindre Firestore. Vérifiez vos autorisations.");
        setIsReady(true);
      }
    };
    initializeApp();

    // Clock update
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Load Firestore streams upon boot
  useEffect(() => {
    if (!isReady) return;

    const unsubProds = listenProducts(
      (data) => setProducts(data),
      (err) => setGlobalError(err.message)
    );

    const unsubTxs = listenTransactions(
      (data) => setTransactions(data),
      (err) => setGlobalError(err.message)
    );

    const unsubLogs = listenInventoryLogs(
      (data) => setLogs(data),
      (err) => setGlobalError(err.message)
    );

    const unsubUsers = listenUsers(
      (data) => setAllStaff(data),
      (err) => setGlobalError(err.message)
    );

    const unsubCats = listenCategories(
      (data) => setCategories(data),
      (err) => setGlobalError(err.message)
    );

    const unsubSettings = listenHomeSettings(
      (data) => setHomeSettings(data),
      (err) => setGlobalError(err.message)
    );

    // Auto load first user (Serveuse Alice) to facilitate quick evaluation of the tablet
    setTimeout(() => {
      if (allStaff.length > 0 && !currentUser) {
        // Find Alice or Bob to pre-populate session
        const preUser = allStaff.find(u => u.role === "serveur") || allStaff[0];
        setCurrentUser(preUser);
      }
    }, 1850);

    return () => {
      unsubProds();
      unsubTxs();
      unsubLogs();
      unsubUsers();
      unsubCats();
      unsubSettings();
    };
  }, [isReady, allStaff.length]);

  // 3. Simulated RFID Tap Authentication
  const handleRfidScan = async (rfidToken: string) => {
    setGlobalError("");
    
    // Find staff member with this token
    const matchedProfile = allStaff.find(
      (u) => u.rfid_token.trim().toUpperCase() === rfidToken.trim().toUpperCase()
    );

    if (matchedProfile) {
      setCurrentUser(matchedProfile);
    } else {
      // In a real database, RFID might create a server user profile
      throw new Error(`RFID '${rfidToken}' inconnu.`);
    }
  };

  // 4. Force Firestore Offline/Online simulation status
  const toggleOfflineMode = async () => {
    const nextState = !isOnline;
    try {
      await setFirestoreOnline(nextState);
      setIsOnline(nextState);
    } catch (err: any) {
      setGlobalError(`La transition de réseau a échoué: ${err.message}`);
    }
  };

  // 5. Checkout click
  const handleCheckout = async () => {
    if (!currentUser) {
      setGlobalError("Veuillez badger votre carte RFID avant d'encaisser.");
      return;
    }
    if (basket.length === 0) {
      setGlobalError("Le panier est vide.");
      return;
    }

    setGlobalError("");
    const basketTotal = Math.max(0, basket.reduce((sum, item) => sum + item.prix * item.quantite, 0) - quickDiscount);

    setPendingCheckout({
      type: "STANDARD",
      basket: [...basket],
      total: basketTotal
    });
  };

  // Basket quantity alterations
  const addToBasket = (p: MenuItem) => {
    setGlobalError("");
    if (p.stock_actuel <= 0) {
      setGlobalError(`Attention: "${p.nom}" est actuellement en rupture de stock !`);
      return;
    }
    setBasket((prev) => {
      const existing = prev.find((it) => it.id === p.id);
      if (existing) {
        return prev.map((it) =>
          it.id === p.id ? { ...it, quantite: it.quantite + 1 } : it
        );
      }
      return [...prev, { id: p.id, nom: p.nom, prix: p.prix, quantite: 1 }];
    });
  };

  const decreaseBasketQty = (id: string) => {
    setBasket((prev) => {
      const existing = prev.find((it) => it.id === id);
      if (!existing) return prev;
      if (existing.quantite === 1) {
        return prev.filter((it) => it.id !== id);
      }
      return prev.map((it) =>
        it.id === id ? { ...it, quantite: it.quantite - 1 } : it
      );
    });
  };

  const removeBasketItem = (id: string) => {
    setBasket((prev) => prev.filter((it) => it.id !== id));
  };

  const clearBasket = () => {
    setBasket([]);
  };

  // Get categorized products for caisse
  const uniqueCategories = [
    "Tous",
    ...(categories.length > 0 
      ? categories.map((c) => c.nom) 
      : Array.from(new Set(products.map((p) => p.categorie))))
  ];
  const catalogFiltered = products.filter((p) => {
    const isTous = selectedCategory === "Tous";
    return isTous || p.categorie === selectedCategory;
  });

  const rawTotalCartValue = basket.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  const totalCartValue = Math.max(0, rawTotalCartValue - quickDiscount);

  return (
    <div className="bg-[#F9FAF8] min-h-screen text-slate-800 font-sans antialiased flex flex-col selection:bg-[#8BA888] selection:text-white">
      
      {/* Top Tablet Header Bar */}
      <header id="applet-main-header" className="relative overflow-hidden bg-radial from-[#1E2E22] via-[#0E1510] to-[#080B09] text-white border-b border-[#324C37]/45 shrink-0 sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
        
        {/* Futuristic Background Scanline & Ambient Grid Watermark */}
        <div className="pointer-events-none absolute right-1/4 top-0 bottom-0 w-80 opacity-20 hidden md:block">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-[#0E1510] to-[#0E1510] absolute inset-0 z-10" />
          <img 
            src={futuristicTeaIcon} 
            className="w-full h-full object-cover opacity-60 mix-blend-screen scale-110" 
            alt="Teahouse Watermark" 
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Digital Grid Aesthetic Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,20,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,20,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40"></div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4 relative z-20">
          
          {/* Brand/Console layout */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D3A30] to-[#0F1C12] p-[1.5px] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.55)] transition-all duration-300">
              <div className="w-full h-full bg-black rounded-[10px] overflow-hidden flex items-center justify-center relative group">
                {homeSettings?.logoUrl ? (
                  <img src={homeSettings.logoUrl} className="w-full h-full object-cover" alt="Logo" referrerPolicy="no-referrer" />
                ) : (
                  <img 
                    src={futuristicTeaIcon} 
                    className="w-full h-full object-cover border border-emerald-500/20" 
                    alt="L'Heure du Thé" 
                    referrerPolicy="no-referrer"
                  />
                )}
                {/* Holographic scanning effect */}
                <div className="absolute inset-x-0 h-[2px] bg-emerald-400 opacity-60 top-0 animate-bounce pointer-events-none shadow-[0_0_8px_#10B981]"></div>
              </div>
            </div>
            
            <div>
              <h1 className="font-display font-black text-xs md:text-sm tracking-[0.25em] uppercase hover:tracking-[0.28em] transition-all bg-gradient-to-r from-emerald-400 via-[#8BA888] to-emerald-200 text-transparent bg-clip-text font-serif">
                {homeSettings?.salonName || "L'Heure du Thé"}
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 text-[8.5px] font-mono font-black text-emerald-400 bg-[#16271A] px-1.5 py-0.5 rounded border border-emerald-550/40 uppercase tracking-widest leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse animate-ping inline-block"></span>
                  CONSOLE READY
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1 font-bold">
                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-100">{currentTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </span>
                <span className="text-slate-700 hidden sm:inline">|</span>
                <span className="text-[8.5px] text-[#8BA888]/80 font-mono hidden sm:inline tracking-widest font-bold">CONSOLE V3.1.2 // TUNIS</span>
              </div>
            </div>
          </div>

          {/* Dynamic connection and offline-first toggles */}
          <div className="flex items-center gap-2.5">
            <button
              id="offline-simulate-btn"
              onClick={toggleOfflineMode}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-black tracking-wider uppercase flex items-center gap-2 border transition-all duration-300 cursor-pointer shadow-sm ${
                isOnline
                  ? "bg-[#1E3123]/90 border-emerald-500/35 text-emerald-400 hover:bg-[#253E2C]/90 hover:border-emerald-500/50 shadow-[#10B981]/5"
                  : "bg-rose-950/90 border-rose-500/40 text-rose-300 hover:bg-rose-900/90 hover:border-rose-500/60 shadow-rose-900/10 animate-pulse"
              }`}
              title="Simuler une coupure ou retour de réseau"
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">FIRESTORE DIRECT</span>
                  <span className="sm:hidden">ONLINE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">OFFLINE PERSISTENCE</span>
                  <span className="sm:hidden">OFFLINE</span>
                </>
              )}
            </button>

            {/* Current user session badge styled as a personnel card */}
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2.5 bg-[#141C16]/90 border border-[#3E5C45]/40 rounded-xl p-1.5 px-3 shadow-inner">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#10B981]"></div>
                </div>
                <div className="text-left font-sans">
                  <div className="text-[10px] font-mono text-[#8BA888] font-bold uppercase tracking-wider leading-tight">OP_BADGE::{currentUser.role}</div>
                  <div className="text-[11px] font-black text-emerald-100 truncate max-w-[110px] uppercase leading-none">{currentUser.nom}</div>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 bg-rose-950/80 border border-rose-800/40 text-rose-300 px-3 py-2 rounded-xl font-mono text-[9px] font-black tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 inline-block animate-ping"></span>
                ACCÈS RESTREINT // BADGE RFID
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        
        {/* Left / Center Main Partition Section (3-cols on desktop) */}
        <div className="lg:col-span-3 flex flex-col space-y-6 overflow-hidden">
          
          {/* Sub-header navigation system tabs selector */}
          <nav id="tablet-navigation-pane" className="flex items-center gap-2 bg-slate-100 border border-slate-350 p-1.5 rounded-2xl shadow-xs select-none">
            <button
              id="nav-tab-caisse"
              onClick={() => { setActiveTab("caisse"); setGlobalError(""); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 md:py-3.5 px-4 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === "caisse"
                  ? "bg-[#2D3A30] text-white shadow-md border border-[#2D3A30]"
                  : "text-slate-800 hover:text-[#2D3A30] hover:bg-slate-200"
              }`}
            >
              <Coins className="w-5 h-5 shrink-0" />
              <span>Caisse Tactile</span>
            </button>

            <button
              id="nav-tab-ventes"
              onClick={() => { setActiveTab("ventes"); setGlobalError(""); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 md:py-3.5 px-4 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === "ventes"
                  ? "bg-[#2D3A30] text-white shadow-md border border-[#2D3A30]"
                  : "text-slate-800 hover:text-[#2D3A30] hover:bg-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 shrink-0" />
              <span>Registre Ventes</span>
            </button>

            <button
              id="nav-tab-stocks"
              onClick={() => { setActiveTab("stocks"); setGlobalError(""); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 md:py-3.5 px-4 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === "stocks"
                  ? "bg-[#2D3A30] text-white shadow-md border border-[#2D3A30]"
                  : "text-slate-800 hover:text-[#2D3A30] hover:bg-slate-200"
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span>Menu & Stocks</span>
            </button>

            <button
              id="nav-tab-stats"
              onClick={() => { setActiveTab("stats"); setGlobalError(""); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 md:py-3.5 px-4 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                activeTab === "stats"
                  ? "bg-[#2D3A30] text-white shadow-md border border-[#2D3A30]"
                  : "text-slate-800 hover:text-[#2D3A30] hover:bg-slate-200"
              }`}
            >
              <NotebookTabs className="w-5 h-5 shrink-0" />
              <span>Rapports Financiers</span>
            </button>
          </nav>

          {/* Feedback alerts if any */}
          {globalError && (
            <div id="global-feedback-alert" className="bg-rose-50 border border-rose-200/60 text-rose-800 rounded-xl p-3.5 text-xs font-medium flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <HeartCrack className="w-4 h-4 shrink-0 text-rose-600 animate-pulse" />
                <span>{globalError}</span>
              </div>
              <button 
                id="dismiss-error-btn"
                onClick={() => setGlobalError("")} 
                className="text-[10px] font-mono text-rose-700 hover:text-rose-950 transition underline cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}

          {/* RENDERING PORTIONS BY TAB */}
          <div id="main-viewports-container" className="flex-1 overflow-y-auto">
            
            {activeTab === "caisse" && (
              /* CAISSE TACTILE VIEW */
              <div id="viewport-caisse" className="space-y-6">

                {/* WELCOME ANNOUNCEMENT BAR */}
                {homeSettings?.showAnnouncement && homeSettings.announcement && (
                  <div className="bg-[#2D3A30] text-amber-105 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-medium shadow-sm border border-[#2D3A30]/10">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                      <p className="tracking-tight italic">{homeSettings.announcement}</p>
                    </div>
                  </div>
                )}

                {/* GRAND ÉCRAN DE CONTRÔLE POS TACTILE (High-contrast LED visual monitor) */}
                <div id="pos-moniteur-tactile" className="bg-slate-900 border border-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden select-none">
                  {/* Subtle retro overlay scanlines */}
                  <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_3px_100%]"></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
                    
                    {/* Led total indicator */}
                    <div className="md:col-span-2 border-r border-slate-805 md:pr-6 flex flex-col justify-between">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#8BA888]">
                          Afficheur Client Principal • Total Net Payé
                        </p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-6xl font-black font-mono tracking-tight text-cyan-400 filter drop-shadow-[0_2px_8px_rgba(34,211,238,0.3)]">
                          {totalCartValue.toFixed(3)}
                        </span>
                        <span className="text-xl md:text-3xl font-black text-slate-450 font-mono">
                          DT
                        </span>
                      </div>
                      
                      {/* Items counter and discount state */}
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                        <span className="bg-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono">
                          {basket.reduce((sum, item) => sum + item.quantite, 0)} Produits
                        </span>
                        {quickDiscount > 0 && (
                          <span className="bg-indigo-950 border border-indigo-805 text-indigo-300 rounded-lg px-2.5 py-1 text-[11px] font-bold">
                            Remise: -1.000 DT appliquée
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operational cashier info & diagnostics */}
                    <div className="space-y-3 font-sans">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Vendeur Actif</span>
                        {currentUser ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                            <span className="text-sm font-black text-slate-100 truncate">{currentUser.nom}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1 py-1 px-2.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs font-bold text-rose-350 animate-pulse">
                            <span>Badge requis pour encaisser</span>
                          </div>
                        )}
                      </div>

                      {/* Device Peripherals Diagnostics */}
                      <div className="border-t border-slate-800 pt-2.5 text-[9px] font-mono text-slate-450 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span>📡 Base Firestore :</span>
                          <span className={isOnline ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            {isOnline ? "CONNECTÉ (LIVE)" : "PERSISTANCE LOCAL"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>🖨️ Rouleau Thermique :</span>
                          <span className="text-amber-400">Prêt (98%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>🎛️ Scanner RFID / NFC :</span>
                          <span className="text-slate-350 animate-pulse">En veille...</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
                
                {/* Horizontal product category tabs */}
                <div id="caisse-categories-track" className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none select-none">
                  {uniqueCategories.map((cat) => {
                    // Match visual emoji icon based on category name
                    const name = cat.toLowerCase();
                    let iconValue = "✨";
                    if (name === "tous") iconValue = "🍵";
                    else if (name.includes("vert")) iconValue = "🍃";
                    else if (name.includes("noir")) iconValue = "🫖";
                    else if (name.includes("infusion") || name.includes("menthe") || name.includes("tisane") || name.includes("parfum")) iconValue = "🌿";
                    else if (name.includes("pâtiss") || name.includes("gâteau") || name.includes("sucré") || name.includes("cookie")) iconValue = "🍰";
                    else if (name.includes("salé") || name.includes("croissant") || name.includes("sandwich")) iconValue = "🥐";
                    else if (name.includes("boisson") || name.includes("frais") || name.includes("jus") || name.includes("eau")) iconValue = "🥤";
                    else if (name.includes("café") || name.includes("expresso")) iconValue = "☕";

                    return (
                      <button
                        id={`category-pill-${cat}`}
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-6 py-3.5 rounded-2xl text-[13px] font-black tracking-tight shrink-0 transition-all active:scale-95 duration-100 cursor-pointer border-2 flex items-center gap-2 select-none shadow-sm ${
                          selectedCategory === cat
                            ? "bg-[#2D3A30] text-white border-[#2D3A30] shadow-md font-black"
                            : "bg-white text-slate-800 hover:text-[#2D3A30] hover:bg-slate-100 border-slate-300"
                        }`}
                      >
                        <span className="text-base shrink-0 leading-none">{iconValue}</span>
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>

                {products.length === 0 ? (
                  /* Loading prompt card */
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center shadow-xs">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#8BA888] mb-3" />
                    <p className="text-sm font-semibold text-[#2D3A30]">Réception du catalogue depuis Firestore...</p>
                    <p className="text-xs text-slate-500 mt-1">Veuillez patienter pendant l'importation de la carte.</p>
                  </div>
                ) : (
                  /* Menu items touch grid */
                  <div id="caisse-products-grid" className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4.5">
                    {catalogFiltered.map((p) => {
                      const isOutOfStock = p.stock_actuel <= 0;
                      return (
                        <button
                          id={`product-card-${p.id}`}
                          key={p.id}
                          disabled={isOutOfStock}
                          onClick={() => addToBasket(p)}
                          className={`group text-left bg-white border border-slate-300 p-4 rounded-2xl flex flex-col justify-between transition-all duration-150 relative shadow-xs select-none min-h-[220px] ${
                            isOutOfStock 
                              ? "opacity-50 cursor-not-allowed" 
                              : "hover:border-[#8BA888] hover:shadow-lg hover:shadow-slate-200/50 cursor-pointer active:scale-95 active:shadow-inner"
                          }`}
                        >
                          <div className="w-full">
                            {/* Photo or emoji placeholder */}
                            <div className="w-full h-24 md:h-28 bg-gradient-to-br from-[#F1F3EE] to-white rounded-xl flex items-center justify-center mb-3 font-semibold text-slate-850 shrink-0 overflow-hidden relative border border-slate-200 p-0 shadow-inner">
                              {p.image_url ? (
                                <img 
                                  src={p.image_url} 
                                  alt={p.nom} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-3xl filter drop-shadow-sm transform group-hover:scale-110 transition-transform">
                                  {p.categorie.toLowerCase().includes("vert") || p.nom.toLowerCase().includes("matcha") || p.nom.toLowerCase().includes("sencha")
                                    ? "🍵" 
                                    : p.categorie.toLowerCase().includes("noir") || p.nom.toLowerCase().includes("earl") || p.nom.toLowerCase().includes("oolong")
                                      ? "🫖"
                                      : p.categorie.toLowerCase().includes("infusion") || p.nom.toLowerCase().includes("menthe")
                                        ? "🌿"
                                        : p.categorie.toLowerCase().includes("pâtiss") || p.nom.toLowerCase().includes("gâteau") || p.nom.toLowerCase().includes("croissant")
                                          ? "🥐"
                                          : "🍰"
                                  }
                                </span>
                              )}
                            </div>

                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="text-[10px] font-mono font-black bg-[#F1F3EE] border border-slate-300 text-[#2D3A30] px-2.5 py-0.5 rounded-lg uppercase">
                                {p.categorie}
                              </span>
                              <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-0.5 rounded-lg ${
                                isOutOfStock 
                                  ? "bg-rose-50 text-rose-700 border border-rose-255 animate-pulse" 
                                  : p.stock_actuel <= p.stock_alerte 
                                    ? "bg-amber-50 text-amber-700 border border-amber-300 animate-pulse" 
                                    : "bg-green-50 text-green-700 border border-green-300"
                              }`}>
                                {isOutOfStock ? "Rupture" : `Stock: ${p.stock_actuel}`}
                              </span>
                            </div>
                            <h4 className="font-display font-black text-sm md:text-base text-slate-900 group-hover:text-emerald-800 transition line-clamp-2 leading-snug">{p.nom}</h4>
                            {p.description && (
                              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">{p.description}</p>
                            )}
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between border-t border-slate-150 pt-3.5 w-full">
                            <div className="flex flex-col">
                              <span className="font-sans text-[10px] uppercase text-slate-500 font-black tracking-tight">Prix unitaire</span>
                              <span className="font-sans text-sm md:text-base font-black text-[#3C5839]">{p.prix.toFixed(3)} DT</span>
                            </div>
                            <div className="w-11 h-11 rounded-full bg-[#F1F3EE] group-hover:bg-[#2D3A30] group-hover:text-white flex items-center justify-center font-extrabold text-lg transition-colors duration-205 text-slate-800 border border-slate-205 shadow-sm select-none shrink-0">
                              +
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "ventes" && (
              /* TRANSACTIONS BILLS LIST VIEW */
              <div id="viewport-ventes" className="bg-white border border-slate-200 rounded-2xl p-5 text-slate-800 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h4 className="font-display font-semibold text-sm uppercase tracking-tight text-[#2D3A30]">
                    Registre des Ventes & Transactions
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">Dernières données</span>
                </div>

                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-sans">
                      Aucune transaction n'a été enregistrée pour aujourd'hui.
                    </div>
                  ) : (
                    transactions.map((tx) => {
                      const isCancelled = tx.status === "annulé";
                      return (
                        <div 
                          key={tx.id} 
                          className={`border rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition shadow-xs ${
                            isCancelled 
                              ? "bg-rose-50/40 border-rose-150 opacity-80" 
                              : "bg-[#F9FAF8] border-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold text-xs ${isCancelled ? "text-rose-700 font-black" : "text-[#2D3A30]"}`}>{tx.id}</span>
                              <span className="text-[9px] bg-white text-slate-500 border border-slate-200/50 px-1.5 py-0.5 rounded font-mono">
                                {new Date(tx.timestamp).toLocaleTimeString("fr-FR")}
                              </span>
                              {isCancelled && (
                                <span className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded animate-pulse">
                                  Annulé
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-sans">
                              Servi par: <span className="text-[#2D3A30] font-semibold">{tx.user_nom}</span> • Badge: <span className="text-slate-500 font-mono text-[10px]">{tx.rfid_token}</span>
                            </p>
                            <div className={`text-xs text-slate-500 line-clamp-1 max-w-sm ${isCancelled ? "line-through text-slate-400" : ""}`}>
                              {tx.items.map(it => `${it.product_nom} (x${it.quantite})`).join(", ")}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between border-t border-slate-200/40 pt-2.5 sm:pt-0 sm:border-0 shrink-0">
                            <div className="text-right">
                              <span className={`font-mono font-bold text-sm ${isCancelled ? "text-rose-500 line-through" : "text-[#8BA888]"}`}>
                                {tx.total.toFixed(3)} DT
                              </span>
                              <span className={`text-[8px] font-mono block uppercase font-bold ${isCancelled ? "text-rose-600" : "text-slate-450"}`}>
                                {isCancelled ? "Annulé" : "Encaissé"}
                              </span>
                            </div>
                            <button
                              id={`view-ticket-${tx.id}`}
                              onClick={() => setShownTransaction(tx)}
                              className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer border ${
                                isCancelled 
                                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200" 
                                  : "bg-white hover:bg-slate-50 text-[#2D3A30] border-slate-250"
                              }`}
                            >
                              Voir le {isCancelled ? "Justificatif" : "Ticket"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === "stocks" && (
              /* MOUNT STOCK PANEL */
              <StockManagerPanel 
                products={products} 
                currentUser={currentUser} 
                allStaff={allStaff}
                onSelectUser={setCurrentUser}
                categories={categories}
                homeSettings={homeSettings}
              />
            )}

            {activeTab === "stats" && (
              /* MOUNT STATS PANEL */
              <DashboardStatsPanel 
                transactions={transactions} 
                products={products} 
                logs={logs} 
                currentUser={currentUser}
                allStaff={allStaff}
                onSelectUser={setCurrentUser}
              />
            )}

          </div>

        </div>

        {/* Right / Side Column Checkout Basket & RFID hardware scanner (1-col on desktop) */}
        <div className="relative flex flex-col space-y-6 shrink-0 lg:border-l lg:border-slate-200/60 lg:pl-6">
          
          {/* Active shopping basket */}
          {activeTab === "caisse" && (
            <div id="caisse-basket-container" className="bg-white border border-slate-200 rounded-2xl flex flex-col max-h-[480px] text-slate-800 shadow-md">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#8BA888] shrink-0" />
                  <h3 className="font-display font-medium text-sm text-[#2D3A30]">
                    Panier en Cours
                  </h3>
                </div>
                {basket.length > 0 && (
                  <button
                    id="clear-basket-btn"
                    onClick={clearBasket}
                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition cursor-pointer"
                    title="Vider le panier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Basket list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[140px]">
                {basket.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl my-4">
                    <Coins className="w-7 h-7 text-[#C8D5B9] mx-auto mb-2 animate-bounce" />
                    <p className="text-xs font-semibold text-[#2D3A30]">Le panier est vierge.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Touchez des produits pour composer l'addition.</p>
                  </div>
                ) : (
                  basket.map((item) => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs md:text-sm shadow-xs gap-3">
                      <div className="overflow-hidden pr-1 flex-1">
                        <div className="font-black text-[#2D3A30] truncate text-xs md:text-sm">{item.nom}</div>
                        <div className="text-[12px] text-[#5C7E58] font-mono font-black mt-0.5">{(item.prix * item.quantite).toFixed(3)} DT</div>
                      </div>

                      {/* touch increments upscaled for easy finger tapping */}
                      <div className="flex items-center gap-2.5 shrink-0 select-none">
                        <button
                          id={`decrease-basket-${item.id}`}
                          onClick={() => decreaseBasketQty(item.id)}
                          className="w-11 h-11 bg-white hover:bg-slate-100 text-slate-950 border-2 border-slate-300 rounded-full flex items-center justify-center text-lg font-black cursor-pointer transition shadow-sm active:scale-90 focus:outline-none"
                        >
                          -
                        </button>
                        <span className="font-mono text-sm text-slate-950 w-6 text-center font-black">{item.quantite}</span>
                        <button
                          id={`increase-basket-${item.id}`}
                          onClick={() => {
                            const original = products.find(p => p.id === item.id);
                            if (original && item.quantite >= original.stock_actuel) {
                              setGlobalError(`Attention: Pas assez d'unités de "${item.nom}" en stock.`);
                              return;
                            }
                            addToBasket(item as MenuItem);
                          }}
                          className="w-11 h-11 bg-white hover:bg-slate-100 text-slate-950 border-2 border-slate-300 rounded-full flex items-center justify-center text-lg font-black cursor-pointer transition shadow-sm active:scale-90 focus:outline-none"
                        >
                          +
                        </button>
                        <button
                          id={`remove-basket-${item.id}`}
                          onClick={() => removeBasketItem(item.id)}
                          className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2 rounded-xl cursor-pointer transition shrink-0"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-5 h-5 stroke-[2]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* totals info and checkout trigger */}
              <div className="p-4 border-t border-slate-100 bg-[#F1F3EE] rounded-b-2xl">
                <div className="flex justify-between font-bold text-xs text-slate-500 mb-1">
                  <span>TOTAL NET (TTC)</span>
                  <span className="font-mono text-[#2D3A30] text-sm font-bold">{totalCartValue.toFixed(3)} DT</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mb-4">
                  *TVA standard incluse (Tunisie)
                </div>

                <button
                  id="checkout-trigger-btn"
                  onClick={handleCheckout}
                  disabled={basket.length === 0 || processingCheckout}
                  className="w-full bg-[#8BA888] hover:bg-[#7a9677] text-white font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 shadow-md shadow-green-900/10 cursor-pointer text-center"
                >
                  {processingCheckout ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Écriture Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>Encaisser & Imprimer</span>
                    </>
                  )}
                </button>
                
                {lastCompletedTx && (
                  <button
                    id="reprint-ticket-trigger"
                    onClick={() => setShownTransaction(lastCompletedTx)}
                    className="w-full mt-2 bg-white hover:bg-slate-50 text-slate-650 hover:text-slate-850 border border-slate-200 font-semibold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    Re-voir le dernier ticket
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tactile Control Keypad mirroring the POS reference model */}
          {activeTab === "caisse" && (
            <TactileKeypad
              basket={basket}
              totalCartValue={totalCartValue}
              onPaymentCheckout={handleTactileCheckout}
              onIncrementQty={incrementLastItemQty}
              onDecrementQty={decrementLastItemQty}
              onApplyQuickDiscount={toggleQuickDiscount}
              onClearCart={clearBasket}
              onSwitchTab={(tab) => {
                setActiveTab(tab);
                setGlobalError("");
              }}
              onFocusVendeur={focusVendeurInput}
              onLogout={() => {
                setCurrentUser(null);
                clearBasket();
                setActiveTab("caisse");
                setGlobalError("");
              }}
              currentUser={currentUser}
              currentDiscount={quickDiscount}
            />
          )}

          {/* RFID badge swiper slot */}
          <RfidBadgeSimulator
            onScan={handleRfidScan}
            isLoading={processingCheckout}
            currentUser={currentUser}
            onLogout={() => {
              setCurrentUser(null);
              clearBasket();
              setActiveTab("caisse");
              setGlobalError("");
            }}
            allStaff={allStaff}
          />

        </div>

      </main>

      {/* FOOTER credit line */}
      <footer id="applet-main-footer" className="bg-[#F9FAF8] py-8 border-t border-slate-200/80 mt-auto text-slate-400 text-center text-[10px] font-mono leading-relaxed px-4">
        © 2026 Salon de Thé "L'Heure du Thé". Tous droits réservés.<br />
        Système de gestion et caisse RFID dégroupé en mode synchrone Firestore NoSQL & cache Offline-First.
      </footer>

      {/* Network receipt printer overlay check */}
      <ReceiptPrinterSimulator
        transaction={shownTransaction}
        onClose={() => setShownTransaction(null)}
        isOffline={!isOnline}
        currentUser={currentUser}
        allStaff={allStaff}
        onCancelTransaction={handleCancelTransaction}
      />

      {/* Confirmation d'encaissement overlay */}
      {pendingCheckout && (
        <div id="checkout-confirm-backdrop" className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="checkout-confirm-modal" className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-base text-[#2D3A30]">
                  Confirmer l'encaissement ?
                </h3>
                <p className="text-xs text-slate-500">Validation & impression du ticket</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 text-center">
                <span className="block text-[10px] font-sans font-black uppercase text-slate-450 tracking-wider">Montant total à percevoir</span>
                <div className="mt-1 flex items-baseline justify-center gap-1.5">
                  <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-[#2D3A30]">
                    {pendingCheckout.total.toFixed(3)}
                  </span>
                  <span className="text-lg font-black text-slate-450 font-mono">DT</span>
                </div>
                {pendingCheckout.type !== "STANDARD" && (
                  <div className="mt-2.5 inline-block bg-[#2D3A30] text-emerald-400 text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-lg">
                    Mode: {pendingCheckout.type === "ESPECES" ? "Espèces (Cash)" : pendingCheckout.type === "CARTE" ? "Chèque / Monétique" : pendingCheckout.type === "TND_PAY" ? "D-Dinar Wallet" : "Chèque"}
                  </div>
                )}
              </div>

              {/* Items checklist */}
              <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
                {pendingCheckout.basket.map((item) => (
                  <div key={item.id} className="p-2.5 flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-bold max-w-[200px] truncate">{item.nom} <span className="text-slate-450">x{item.quantite}</span></span>
                    <span className="font-mono text-slate-800 font-black">{(item.prix * item.quantite).toFixed(3)} DT</span>
                  </div>
                ))}
              </div>

              {currentUser && (
                <div className="flex items-center gap-2 text-xs bg-[#F1F3EE]/50 border border-[#8BA888]/10 rounded-xl p-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                  <span className="text-slate-650 font-sans">
                    Caissier: <span className="text-[#2D3A30] font-black">{currentUser.nom}</span> ({currentUser.role})
                  </span>
                </div>
              )}
            </div>

            {/* Actions button group */}
            <div className="mt-6 flex gap-3 border-t border-slate-100 pt-4">
              <button
                id="confirm-checkout-cancel-btn"
                onClick={() => setPendingCheckout(null)}
                disabled={processingCheckout}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-3 rounded-xl transition cursor-pointer text-center"
              >
                Annuler
              </button>
              <button
                id="confirm-checkout-confirm-btn"
                onClick={executeCheckout}
                disabled={processingCheckout}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-center shadow-md shadow-emerald-900/10"
              >
                {processingCheckout ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Impression...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Oui, Encaisser & Imprimer</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
