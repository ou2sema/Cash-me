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
  Check,
  Radio,
  LayoutGrid,
  Cpu,
  User,
  TrendingUp,
  Sliders
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
  const [showRfidSimulator, setShowRfidSimulator] = useState<boolean>(false);
  
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
    setShowRfidSimulator(true);
    setTimeout(() => {
      const el = document.getElementById("rfid-badge-simulator-panel");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 120);
  };

  // Background keystroke interceptor for USB/OTG physical RFID or NFC card swipers
  useEffect(() => {
    let rfidBuffer = "";
    let lastKeypressTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Avoid stealing input from normal typing fields
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        if (activeEl.id !== "rfid-custom-token-input") {
          return;
        }
      }

      const now = Date.now();
      if (now - lastKeypressTime > 120) {
        rfidBuffer = "";
      }
      lastKeypressTime = now;

      if (e.key === "Enter") {
        const token = rfidBuffer.trim();
        if (token.length >= 3) {
          console.log("RFID PHYSICAL HARDWARE BADGE DETECTED (wedge) :", token);
          handleRfidScan(token)
            .then(() => {
              // Sound a positive feedback beep
              try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (ctx) {
                  const o = ctx.createOscillator();
                  const g = ctx.createGain();
                  o.connect(g);
                  g.connect(ctx.destination);
                  o.frequency.value = 750;
                  g.gain.setValueAtTime(0.08, ctx.currentTime);
                  o.start();
                  o.stop(ctx.currentTime + 0.1);
                }
              } catch (_) {}
              setGlobalError("");
            })
            .catch((err) => {
              setGlobalError(`Séquence RFID '${token}' rejetée: ${err.message}`);
            });
        }
        rfidBuffer = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        rfidBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [allStaff, currentUser]);

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

  // Get categorized products for caisse with memoization
  const uniqueCategories = React.useMemo(() => [
    "Tous",
    ...(categories.length > 0 
      ? categories.map((c) => c.nom) 
      : Array.from(new Set(products.map((p) => p.categorie))))
  ], [categories, products]);

  const catalogFiltered = React.useMemo(() => products.filter((p) => {
    const isTous = selectedCategory === "Tous";
    return isTous || p.categorie === selectedCategory;
  }), [products, selectedCategory]);

  const rawTotalCartValue = React.useMemo(() => basket.reduce((sum, item) => sum + item.prix * item.quantite, 0), [basket]);
  const totalCartValue = React.useMemo(() => Math.max(0, rawTotalCartValue - quickDiscount), [rawTotalCartValue, quickDiscount]);

  // Calcul dynamique de la répartition par catégorie du Panier ou de l'historique de vente
  const statsRepartition = React.useMemo(() => {
    const isBasketActive = basket.length > 0;
    
    let thesCount = 0;
    let patisseriesCount = 0;
    let autresCount = 0;

    if (isBasketActive) {
      basket.forEach((item) => {
        const prod = products.find((p) => p.id === item.id);
        const cat = prod?.categorie || "";
        const lowerCat = cat.toLowerCase();
        
        if (lowerCat.includes("thé") || lowerCat.includes("matcha") || lowerCat.includes("infusion") || lowerCat.includes("boisson")) {
          thesCount += item.quantite;
        } else if (lowerCat.includes("pâtisserie") || lowerCat.includes("fine") || lowerCat.includes("snack") || lowerCat.includes("gâteau") || lowerCat.includes("patisserie")) {
          patisseriesCount += item.quantite;
        } else {
          autresCount += item.quantite;
        }
      });
    } else {
      const validTx = transactions.filter(t => t.status !== "annulé" && t.type === "vente");
      validTx.forEach((tx) => {
        tx.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.product_id);
          const cat = prod?.categorie || "";
          const lowerCat = cat.toLowerCase();
          
          if (lowerCat.includes("thé") || lowerCat.includes("matcha") || lowerCat.includes("infusion") || lowerCat.includes("boisson")) {
            thesCount += item.quantite;
          } else if (lowerCat.includes("pâtisserie") || lowerCat.includes("fine") || lowerCat.includes("snack") || lowerCat.includes("gâteau") || lowerCat.includes("patisserie")) {
            patisseriesCount += item.quantite;
          } else {
            autresCount += item.quantite;
          }
        });
      });
    }

    const total = thesCount + patisseriesCount + autresCount;
    
    if (total === 0) {
      return {
        thes: 60,
        patisseries: 25,
        autres: 15,
        totalItems: 0,
        isBasket: false
      };
    }

    const thesPct = (thesCount / total) * 100;
    const patisseriesPct = (patisseriesCount / total) * 100;
    const autresPct = 100 - thesPct - patisseriesPct;

    return {
      thes: thesPct,
      patisseries: patisseriesPct,
      autres: autresPct,
      totalItems: total,
      isBasket: isBasketActive
    };
  }, [basket, products, transactions]);

  return (
    <div className="bg-[#070A13] min-h-screen text-slate-100 font-sans antialiased flex flex-col selection:bg-cyan-550/30 selection:text-cyan-200 overflow-x-hidden relative">
      
      {/* Futuristic Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      {!isOnline && (
        <div id="persistent-offline-banner" className="bg-amber-500 text-amber-950 px-4 py-2.5 text-xs font-semibold font-sans flex items-center justify-center gap-2 border-b border-amber-600/55 shadow-sm animate-in slide-in-from-top duration-200 relative z-50 text-center">
          <WifiOff className="w-4 h-4 text-amber-900 shrink-0 animate-pulse" />
          <span><strong>Connexion Suspendue (Mode Hors-Ligne) :</strong> Les transactions sont stockées localement et synchronisées automatiquement dès le retour du réseau.</span>
        </div>
      )}

      {/* Top Tablet Header Bar */}
      <header id="applet-main-header" className="relative overflow-hidden bg-[#070A13]/60 border-b border-white/[0.06] text-white shrink-0 sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        
        {/* Futuristic Background Scanline & Ambient Grid Watermark */}
        <div className="pointer-events-none absolute right-1/4 top-0 bottom-0 w-80 opacity-5 hidden md:block">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-[#070A13] to-[#070A13] absolute inset-0 z-10" />
          <img 
            src={futuristicTeaIcon} 
            className="w-full h-full object-cover opacity-30 mix-blend-screen scale-110" 
            alt="Teahouse Watermark" 
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Digital Grid Aesthetic Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40"></div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-20">
          
          {/* Brand & Tab Navigation Capsule */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
            {/* Café Maazim metallic brand logo and text */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative flex items-center justify-center">
                {/* Glowing neon background pulse */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-white to-[#34d399] p-[1px] shadow-[0_0_20px_rgba(34,211,238,0.6)] animate-pulse" />
                <div className="absolute w-[42px] h-[42px] bg-[#070a13] rounded-[14px] overflow-hidden flex items-center justify-center">
                  <img 
                    src={futuristicTeaIcon} 
                    className="w-full h-full object-cover border border-cyan-500/20" 
                    alt="Café Maazim Logo" 
                    referrerPolicy="no-referrer"
                  />
                  {/* Holographic scanning laser line */}
                  <div className="absolute inset-x-0 h-[1.5px] bg-cyan-400 opacity-60 top-0 animate-bounce shadow-[0_0_6px_#22d3ee] pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col">
                <span className="font-sans text-[11px] font-black tracking-[0.2em] text-[#A5F3FC] leading-none uppercase select-none">
                  CAFÉ MAAZIM
                </span>
                <span className="text-[8px] text-slate-400 font-mono tracking-wider font-extrabold uppercase mt-1 leading-none">
                  SALON DE THÉ TECHNO
                </span>
              </div>
            </div>

            {/* Vertical separator in desktop */}
            <div className="hidden sm:block h-6 w-[1px] bg-white/[0.08]" />

            {/* Capsule tabs matching the photo, restoring original system menus */}
            <div className="flex items-center gap-1.5 bg-[#111827]/60 border border-white/10 rounded-2xl p-1 backdrop-blur-md">
              <button
                id="nav-tab-caisse"
                onClick={() => { setActiveTab("caisse"); setGlobalError(""); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                  activeTab === "caisse"
                    ? "bg-white/[0.08] text-[#A5F3FC] border-b border-t border-cyan-400/20 shadow-[0_0_15px_rgba(165,243,252,0.15)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                <span>Caisse Tactile</span>
              </button>
              
              <button
                id="nav-tab-ventes"
                onClick={() => { setActiveTab("ventes"); setGlobalError(""); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                  activeTab === "ventes"
                    ? "bg-white/[0.08] text-[#A5F3FC] border border-cyan-400/10 hover:text-[#A5F3FC] transition-all"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-cyan-400 opacity-80" />
                <span>Registre Ventes</span>
              </button>

              <button
                id="nav-tab-stocks"
                onClick={() => { setActiveTab("stocks"); setGlobalError(""); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                  activeTab === "stocks"
                    ? "bg-white/[0.08] text-[#A5F3FC] border border-cyan-400/10 hover:text-[#A5F3FC] transition-all"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400 opacity-80" />
                <span>Menu & Stocks</span>
              </button>

              <button
                id="nav-tab-stats"
                onClick={() => { setActiveTab("stats"); setGlobalError(""); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                  activeTab === "stats"
                    ? "bg-white/[0.08] text-[#A5F3FC] border border-cyan-400/10 hover:text-[#A5F3FC] transition-all"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5 text-cyan-400 opacity-80" />
                <span>Rapports Financiers</span>
              </button>
            </div>
          </div>

          {/* Dynamic connection and offline-first toggles */}
          <div className="flex items-center gap-2.5 relative z-30">
            <button
              id="rfid-global-toggle-btn"
              onClick={() => setShowRfidSimulator(true)}
              className="px-3.5 py-2 rounded-xl text-[10px] font-mono font-black tracking-wider uppercase flex items-center gap-2 border bg-[#111827]/60 hover:bg-white/[0.04] text-[#A5F3FC] border-white/10 hover:border-cyan-400/40 hover:shadow-[0_0_15px_rgba(165,243,252,0.1)] transition-all cursor-pointer shadow-sm shrink-0"
              title="Ouvrir le simulateur de badge"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden md:inline">SIM CONFIG</span>
              <span className="md:hidden">SIM</span>
            </button>

            <button
              id="offline-simulate-btn"
              onClick={toggleOfflineMode}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-mono font-black tracking-wider uppercase flex items-center gap-2 border transition-all duration-300 cursor-pointer shadow-sm ${
                isOnline
                  ? "bg-[#111827]/60 border-emerald-500/30 text-[#34D399] hover:bg-white/[0.04] hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/40 hover:border-rose-500/60 shadow-rose-900/10 animate-pulse"
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
              <div 
                onClick={() => setShowRfidSimulator(true)}
                className="hidden sm:flex items-center gap-2.5 bg-white/[0.03] border border-white/10 rounded-xl p-1.5 px-3.5 shadow-inner cursor-pointer hover:border-cyan-400/40 hover:bg-white/[0.06] transition-all hover:shadow-[0_0_15px_rgba(165,243,252,0.1)]"
                title="Gérer les Badgeurs / Personnel"
              >
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]"></div>
                </div>
                <div className="text-left font-sans">
                  <div className="text-[9px] font-mono text-[#A5F3FC]/70 font-semibold uppercase tracking-wider leading-tight">OP_BADGE::{currentUser.role}</div>
                  <div className="text-[11px] font-black text-white truncate max-w-[110px] uppercase leading-none">{currentUser.nom}</div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setShowRfidSimulator(true)}
                className="hidden sm:flex items-center gap-2 bg-rose-950/45 border border-rose-800/30 text-rose-300 px-3.5 py-2 rounded-xl font-mono text-[9px] font-black tracking-widest animate-pulse cursor-pointer hover:bg-rose-900/20 hover:border-rose-700/50 transition-all shadow-[0_0_12px_rgba(244,63,94,0.1)]"
                title="Accès Restreint : Cliquer pour simuler un badge"
              >
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
                  <div className="bg-[#111827]/40 text-[#A5F3FC]/90 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-medium shadow-[0_0_15px_rgba(165,243,252,0.05)] border border-white/[0.06] backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                      <p className="tracking-tight italic">{homeSettings.announcement}</p>
                    </div>
                  </div>
                )}

                {/* GRAND ÉCRAN DE CONTRÔLE POS TACTILE (High-contrast LED visual monitor styled after Cash Me Pearl dashboard picture) */}
                <div id="pos-moniteur-tactile" className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
                  {/* Left Panel: BALANCE (spanning 2 columns) */}
                  <div className="md:col-span-2 bg-[#111827]/40 border border-white/[0.08] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl shadow-2xl min-h-[280px]">
                    {/* cyan glow behind deposit pill */}
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
                    
                    <div className="flex justify-between items-start w-full relative z-10">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider block uppercase">BALANCE</span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5 block uppercase">TOTAL MANAGED VALUE</span>
                      </div>
                      <button 
                        onClick={() => setShowRfidSimulator(true)}
                        className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Simulateur RFID / Badgeurs"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="my-5 relative z-10">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-5xl font-extrabold font-mono tracking-tight text-white filter drop-shadow-[0_2px_15px_rgba(34,211,238,0.45)]">
                          {totalCartValue.toFixed(3)}
                        </span>
                        <span className="text-2xl font-bold font-mono text-cyan-400">DT</span>
                      </div>
                      
                      {/* Dynamic pill indicating RFID/session status */}
                      <div className="inline-flex items-center gap-1.5 mt-4 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-[#34D399] tracking-wider uppercase shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-ping" />
                        <span>CAFÉ MAAZIM +12.4% // </span>
                        <span>{currentUser ? currentUser.nom : "BADGE REQUIS"}</span>
                      </div>
                    </div>

                    {/* Buttons: DEPOSIT & WITHDRAW formatted exactly like the glowing pills in the photo */}
                    <div className="flex items-center gap-4 w-full mt-2 relative z-10">
                      <button
                        id="quick-pay-deposit-btn"
                        disabled={basket.length === 0}
                        onClick={() => handleTactileCheckout("TND_PAY")}
                        className="flex-1 bg-white hover:bg-cyan-100 text-slate-950 font-black text-[11px] uppercase tracking-widest py-3 rounded-full flex items-center justify-center gap-2 transition duration-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-[0_0_20px_rgba(165,243,252,0.4)] border border-cyan-300/40 active:scale-[0.97]"
                      >
                        {processingCheckout ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>DEPOSIT // PAYER</span>
                      </button>
                      
                      <button
                        id="quick-clear-withdraw-btn"
                        disabled={basket.length === 0}
                        onClick={clearBasket}
                        className="flex-1 bg-white/[0.02] hover:bg-white/[0.08] text-white border border-white/10 hover:border-white/20 font-black text-[11px] uppercase tracking-widest py-3 rounded-full flex items-center justify-center gap-2 transition duration-300 disabled:opacity-20 disabled:pointer-events-none cursor-pointer active:scale-[0.97]"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-450" />
                        <span>WITHDRAW // VIDER</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Section Cards (Grid 1 column overall, containing nested panels) */}
                  <div className="md:col-span-1 flex flex-col gap-4 justify-between h-full">
                    
                    {/* Card 2: AI AGENT ACTIVATED */}
                    <div className="bg-[#111827]/40 border border-white/[0.08] rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl shadow-2xl h-[47%]">
                      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between gap-4 h-full">
                        <div className="flex items-center gap-3">
                          {/* AI CPU pulsing widget */}
                          <div className="w-9 h-9 rounded-xl bg-cyan-950/50 border border-cyan-400/30 flex items-center justify-center text-cyan-400 relative shrink-0">
                            <Cpu className="w-4.5 h-4.5 animate-pulse" />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#34D399] border border-[#111827] shadow-[0_0_6px_#34d399]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#A5F3FC] tracking-wider block font-sans">AI AGENT ACTIVATED</span>
                            <span className="text-[9px] font-sans text-slate-400 leading-tight block mt-0.5 max-w-[130px]">
                              Optimizing teahouse inventory live: <span className="text-[#34D399] font-mono font-bold">94.2%</span>
                            </span>
                          </div>
                        </div>

                        {/* Waving Neon Green Line-Chart SVG from screens */}
                        <div className="w-16 h-8 shrink-0 relative overflow-hidden">
                          <svg viewBox="0 0 100 40" className="w-full h-full text-emerald-400 filter drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]">
                            <path
                              d="M 0 35 Q 15 15, 30 25 T 60 5 T 85 20 T 100 8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: TRANSACTION HISTORY */}
                    <div className="bg-[#111827]/40 border border-white/[0.08] rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl shadow-2xl h-[47%]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">TRANSACTION HISTORY</span>
                        <button 
                          onClick={() => setActiveTab("ventes")}
                          className="text-[9px] font-mono text-cyan-400 hover:underline cursor-pointer font-bold animate-pulse"
                        >
                          View all
                        </button>
                      </div>

                      <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                        {transactions.slice(0, 2).length === 0 ? (
                          <>
                            <div className="flex items-center justify-between text-[10px] border-b border-white/[0.03] pb-1">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                <span className="font-mono">18 Dec</span>
                              </div>
                              <span className="text-emerald-400 font-mono font-bold">+1,620 DT</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                <span className="font-mono">24 Nov</span>
                              </div>
                              <span className="text-emerald-400 font-mono font-bold">+1,420 DT</span>
                            </div>
                          </>
                        ) : (
                          transactions.slice(0, 2).map((tx) => {
                            const isCancelled = tx.status === "annulé";
                            const dateStr = new Date(tx.timestamp).toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
                            return (
                              <div key={tx.id} className="flex items-center justify-between text-[10px] border-b border-white/[0.03] pb-1 last:border-0 last:pb-0">
                                <div className="flex items-center gap-1.5 text-slate-350 overflow-hidden max-w-[110px]">
                                  <span className={`w-1 h-1 rounded-full ${isCancelled ? "bg-rose-450" : "bg-emerald-400"}`} />
                                  <span className="font-mono shrink-0 font-bold">{dateStr}</span>
                                  <span className="truncate opacity-75">{tx.user_nom}</span>
                                </div>
                                <span className={`font-mono font-bold ${isCancelled ? "text-rose-400 line-through" : "text-[#34D399]"}`}>
                                  {isCancelled ? "-" : "+"}{tx.total.toFixed(3)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 4: RÉPARTITION DU COMPTOIR (Dynamic allocation matching the Teahouse theme) */}
                  <div className="md:col-span-1 bg-[#111827]/40 border border-white/[0.08] rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden backdrop-blur-xl shadow-2xl min-h-[160px] h-full">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wide">RÉPARTITION DU COMPTOIR</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md ${statsRepartition.isBasket ? "text-cyan-400 bg-cyan-950/40 animate-pulse" : "text-emerald-400 bg-emerald-950/40"}`}>
                        {statsRepartition.isBasket ? "PANIER ACTIF" : "VENTES LIVE"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 my-2">
                      <div className="w-16 h-16 relative flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                          {/* Outer empty ring */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="3" />
                          
                          {/* Arc 1: Thés & Infusions (Cyan) */}
                          {statsRepartition.thes > 0 && (
                            <circle 
                              cx="18" 
                              cy="18" 
                              r="15.915" 
                              fill="none" 
                              stroke="url(#cyanGlowGrad)" 
                              strokeWidth="3.2" 
                              strokeDasharray={`${statsRepartition.thes} ${100 - statsRepartition.thes}`} 
                              strokeDashoffset="0"
                              className="filter drop-shadow-[0_0_3px_rgba(34,211,238,0.6)]"
                            />
                          )}

                          {/* Arc 2: Pâtisseries Fines (Emerald Green) */}
                          {statsRepartition.patisseries > 0 && (
                            <circle 
                              cx="18" 
                              cy="18" 
                              r="15.915" 
                              fill="none" 
                              stroke="url(#emeraldGlowGrad)" 
                              strokeWidth="3.2" 
                              strokeDasharray={`${statsRepartition.patisseries} ${100 - statsRepartition.patisseries}`} 
                              strokeDashoffset={`-${statsRepartition.thes}`}
                              className="filter drop-shadow-[0_0_3px_rgba(52,211,153,0.6)]"
                            />
                          )}

                          {/* Arc 3: Accessoires & Cadeaux (Amber Yellow) */}
                          {statsRepartition.autres > 0 && (
                            <circle 
                              cx="18" 
                              cy="18" 
                              r="15.915" 
                              fill="none" 
                              stroke="url(#amberGlowGrad)" 
                              strokeWidth="3.2" 
                              strokeDasharray={`${statsRepartition.autres} ${100 - statsRepartition.autres}`} 
                              strokeDashoffset={`-${statsRepartition.thes + statsRepartition.patisseries}`}
                              className="filter drop-shadow-[0_0_3px_rgba(251,191,36,0.6)]"
                            />
                          )}

                          <defs>
                            <linearGradient id="cyanGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#22D3EE" />
                              <stop offset="100%" stopColor="#06B6D4" />
                            </linearGradient>
                            <linearGradient id="emeraldGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#10B981" />
                            </linearGradient>
                            <linearGradient id="amberGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FBBF24" />
                              <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center leading-none text-center">
                          <span className="text-[10px] text-white font-black font-mono">
                            {statsRepartition.totalItems}
                          </span>
                          <span className="text-[7.5px] uppercase text-slate-400 font-bold font-sans tracking-wide">
                            {statsRepartition.isBasket ? "Art." : "Vendu"}
                          </span>
                        </div>
                      </div>

                      <div className="text-[9.5px] space-y-1 w-full text-right font-mono font-bold">
                        <div className="flex items-center justify-end gap-1.5 text-cyan-300">
                          <span>{statsRepartition.thes.toFixed(0)}%</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span className="text-slate-400 font-sans font-medium text-[8.5px]">Thés & Matchas</span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-emerald-400">
                          <span>{statsRepartition.patisseries.toFixed(0)}%</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                          <span className="text-slate-400 font-sans font-medium text-[8.5px]">Pâtisseries</span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-amber-400">
                          <span>{statsRepartition.autres.toFixed(0)}%</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="text-slate-400 font-sans font-medium text-[8.5px]">Accessoires</span>
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
                        className={`px-5 py-3 rounded-2xl text-xs font-bold tracking-tight shrink-0 transition-all duration-300 active:scale-95 cursor-pointer border flex items-center gap-2 select-none shadow-sm ${
                          selectedCategory === cat
                            ? "bg-gradient-to-r from-cyan-500/15 to-[#34D399]/15 text-[#A5F3FC] border-cyan-400/40 shadow-[0_0_15px_rgba(165,243,252,0.15)]"
                            : "bg-[#111827]/40 text-slate-400 hover:text-[#A5F3FC] hover:bg-white/[0.03] border-white/10"
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
                          className={`group text-left bg-[#111827]/40 border border-white/10 p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 relative select-none min-h-[220px] ${
                            isOutOfStock 
                              ? "opacity-40 cursor-not-allowed" 
                              : "hover:border-cyan-400/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] cursor-pointer active:scale-[0.98] active:border-cyan-400/60"
                          }`}
                        >
                          <div className="w-full">
                            {/* Photo or emoji placeholder */}
                            <div className="w-full h-24 md:h-28 bg-gradient-to-br from-[#111827] to-[#070A13] rounded-xl flex items-center justify-center mb-3 font-semibold text-white shrink-0 overflow-hidden relative border border-white/5 p-0 shadow-inner">
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
                              <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-slate-350 px-2 py-0.5 rounded-lg uppercase">
                                {p.categorie}
                              </span>
                              <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-lg border ${
                                isOutOfStock 
                                  ? "bg-rose-950/40 text-rose-300 border-rose-500/35 animate-pulse" 
                                  : p.stock_actuel <= p.stock_alerte 
                                    ? "bg-amber-950/40 text-amber-300 border-amber-500/35 animate-pulse" 
                                    : "bg-emerald-950/40 text-emerald-300 border-emerald-500/35"
                              }`}>
                                {isOutOfStock ? "Rupture" : `Stock: ${p.stock_actuel}`}
                              </span>
                            </div>
                            <h4 className="font-display font-bold text-sm md:text-base text-white group-hover:text-cyan-300 transition line-clamp-2 leading-snug">{p.nom}</h4>
                            {p.description && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">{p.description}</p>
                            )}
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3.5 w-full">
                            <div className="flex flex-col">
                              <span className="font-sans text-[10px] uppercase text-slate-405 text-slate-400 font-bold tracking-tight">Prix unitaire</span>
                              <span className="font-mono text-sm md:text-base font-bold text-[#34D399]">{p.prix.toFixed(3)} DT</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 border border-white/10 flex items-center justify-center font-extrabold text-lg transition-all duration-200 text-slate-300 shadow-sm select-none shrink-0 group-hover:border-cyan-400/35 group-hover:shadow-[0_0_12px_rgba(34,211,238,0.2)]">
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
            <div id="caisse-basket-container" className="bg-[#111827]/40 border border-white/10 rounded-2xl flex flex-col max-h-[480px] text-white shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-cyan-400 shrink-0" />
                  <h3 className="font-display font-medium text-sm text-[#A5F3FC] tracking-wide">
                    Panier en Cours
                  </h3>
                </div>
                {basket.length > 0 && (
                  <button
                    id="clear-basket-btn"
                    onClick={clearBasket}
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition cursor-pointer"
                    title="Vider le panier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Basket list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[140px]">
                {basket.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 border border-dashed border-white/10 rounded-xl my-4 bg-white/[0.01]">
                    <Coins className="w-7 h-7 text-[#A5F3FC]/50 mx-auto mb-2 animate-bounce" />
                    <p className="text-xs font-semibold text-white">Le panier est vierge.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Touchez des produits pour composer l'addition.</p>
                  </div>
                ) : (
                  basket.map((item) => (
                    <div key={item.id} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-3 flex items-center justify-between text-xs md:text-sm shadow-xs gap-3">
                      <div className="overflow-hidden pr-1 flex-1">
                        <div className="font-bold text-white truncate text-xs md:text-sm">{item.nom}</div>
                        <div className="text-[12px] text-[#34D399] font-mono font-bold mt-0.5">{(item.prix * item.quantite).toFixed(3)} DT</div>
                      </div>

                      {/* touch increments upscaled for easy finger tapping */}
                      <div className="flex items-center gap-2.5 shrink-0 select-none">
                        <button
                          id={`decrease-basket-${item.id}`}
                          onClick={() => decreaseBasketQty(item.id)}
                          className="w-10 h-10 bg-[#111827] hover:bg-white/5 text-white border border-white/10 rounded-full flex items-center justify-center text-base font-bold cursor-pointer transition shadow-sm active:scale-90 focus:outline-none"
                        >
                          -
                        </button>
                        <span className="font-mono text-sm text-white w-6 text-center font-bold">{item.quantite}</span>
                        <button
                          id={`increase-basket-${item.id}`}
                          onClick={() => {
                            const original = products.find(p => p.id === item.id);
                            if (!original) return;
                            if (item.quantite >= original.stock_actuel) {
                              setGlobalError(`Attention: Pas assez d'unités de "${item.nom}" en stock.`);
                              return;
                            }
                            addToBasket(original);
                          }}
                          className="w-10 h-10 bg-[#111827] hover:bg-white/5 text-white border border-white/10 rounded-full flex items-center justify-center text-base font-bold cursor-pointer transition shadow-sm active:scale-90 focus:outline-none"
                        >
                          +
                        </button>
                        <button
                          id={`remove-basket-${item.id}`}
                          onClick={() => removeBasketItem(item.id)}
                          className="text-rose-450 hover:text-rose-300 hover:bg-rose-500/10 p-2 rounded-xl cursor-pointer transition shrink-0"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* totals info and checkout trigger */}
              <div className="p-4 border-t border-white/[0.06] bg-[#070A13]/60 rounded-b-2xl">
                <div className="flex justify-between font-bold text-xs text-slate-400 mb-1">
                  <span>TOTAL NET (TTC)</span>
                  <span className="font-mono text-[#34D399] text-base font-bold">{totalCartValue.toFixed(3)} DT</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mb-4">
                  *TVA standard incluse (Tunisie)
                </div>

                <button
                  id="checkout-trigger-btn"
                  onClick={handleCheckout}
                  disabled={basket.length === 0 || processingCheckout}
                  className="w-full bg-[#34D399] hover:bg-[#2bbd88] text-slate-950 font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 shadow-md shadow-[#34D399]/10 cursor-pointer text-center"
                >
                  {processingCheckout ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin animate-spin" />
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
                    className="w-full mt-2 bg-white/5 hover:bg-white/10 text-[#A5F3FC] hover:text-white border border-white/10 font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
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

          {/* RFID badge swiper slot (Rendered as an overlay modal for a clean layout on actual tablet/touch screens) */}
          {showRfidSimulator && (
            <div id="rfid-simulator-modal-overlay" className="fixed inset-0 bg-slate-950/65 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-1.5 border border-slate-200 overflow-hidden text-left transform transition-all animate-in zoom-in-95 duration-200">
                
                {/* Close Button top-right */}
                <button 
                  onClick={() => setShowRfidSimulator(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition cursor-pointer z-50 font-sans text-[10px] font-black tracking-wider"
                  title="Masquer le simulateur"
                >
                  ✕ FERMER
                </button>

                <RfidBadgeSimulator
                  onScan={async (token) => {
                    await handleRfidScan(token);
                    // Automatically close simulator after a small confirmation wait time
                    setTimeout(() => setShowRfidSimulator(false), 900);
                  }}
                  isLoading={processingCheckout}
                  currentUser={currentUser}
                  onLogout={() => {
                    setCurrentUser(null);
                    clearBasket();
                    setActiveTab("caisse");
                    setGlobalError("");
                    setShowRfidSimulator(false);
                  }}
                  allStaff={allStaff}
                />
              </div>
            </div>
          )}

        </div>

      </main>

      {/* FOOTER credit line */}
      <footer id="applet-main-footer" className="bg-[#070A13]/60 py-8 border-t border-white/[0.05] mt-auto text-slate-500 text-center text-[10px] font-mono leading-relaxed px-4 relative z-10">
        © 2026 Salon de Thé "L'Heure du Thé" — Powered by <span className="text-[#A5F3FC]/80 font-bold">CASH ME PEARL</span>.<br />
        Système de gestion et caisse RFID synchrone Firestore NoSQL & cache local Offline-First.
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
