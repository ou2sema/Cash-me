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
  Users,
  Lock,
  Unlock,
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
  cancelTransaction,
  createNewCategory,
  editCategoryInDb,
  deleteCategoryFromDb,
  createNewProduct
} from "./services/db";

import { MenuItem, BasketItem, TeaRoomUser, TransactionRecord, InventoryLogItem, CategoryItem, HomeSettings } from "./types";
import { POSSidebar } from "./components/POSSidebar";
import { POSProductGrid } from "./components/POSProductGrid";
import { POSFinancialPanel } from "./components/POSFinancialPanel";
import { PaymentDialog as FigmaPaymentDialog } from "./components/PaymentDialog";
import { CatalogModal } from "./components/CatalogModal";
import { JournalModal } from "./components/JournalModal";
import { Product as FigmaProduct, CartItem as FigmaCartItem } from "./types";

// @ts-ignore
import futuristicTeaIcon from "./assets/images/futuristic_tea_icon_1781193728060.jpg";
import RfidBadgeSimulator from "./components/RfidBadgeSimulator";
import ReceiptPrinterSimulator from "./components/ReceiptPrinterSimulator";
import StockManagerPanel from "./components/StockManagerPanel";
import DashboardStatsPanel from "./components/DashboardStatsPanel";
import TactileKeypad from "./components/TactileKeypad";
import PinAuthModal from "./components/PinAuthModal";
import UnifiedAuthModal from "./components/UnifiedAuthModal";
import AddProductModal from "./components/AddProductModal";

// Custom Techno-Teapot retro-éclairée branding & icon
const TechnoTeapotSVG = ({ className = "w-12 h-12", color = "#FF7A00" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 40 L70 40 L78 65 L22 65 Z" />
    <path d="M42 40 L50 32 L58 40" />
    <circle cx="50" cy="28" r="3" fill={color} />
    <path d="M22 52 C12 52 12 40 22 40" />
    <path d="M78 48 C88 48 92 40 86 35 C83 38 78 44 78 44" />
    <path d="M34 65 L66 65 L62 72 L38 72 Z" />
    <path d="M40 48 L40 58 M50 45 L50 60 M60 48 L60 58" opacity="0.6" strokeWidth="1.5" stroke={color} />
    <circle cx="50" cy="52" r="2" fill={color} />
  </svg>
);

// Cyber Hookah geometric icon
const GeometricHookahSVG = ({ className = "w-6 h-6", color = "#00F5D4" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 75 C32 85 38 90 50 90 C62 90 68 85 68 75 C68 65 62 62 50 62 C38 62 32 65 32 75 Z" />
    <path d="M50 25 L50 62" />
    <path d="M42 35 L58 35" strokeWidth="2.5" />
    <path d="M42 48 L58 48" strokeWidth="2.5" />
    <path d="M36 25 L64 25 L58 20 L42 20 Z" />
    <path d="M45 20 L55 20 L55 12 L45 12 Z" />
    <path d="M50 50 C68 50 78 60 78 75 L74 85" strokeWidth="2.5" />
    <path d="M74 85 L78 92" strokeWidth="4" stroke={color} />
  </svg>
);

// Balanced Stacked levels map layout shortcut
const StackedLayersSVG = ({ className = "w-6 h-6", color = "#00F5D4" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M50 20 L80 32 L50 44 L20 32 Z" />
    <path d="M20 48 L50 60 L80 48" />
    <path d="M20 54 L50 66 L80 54" opacity="0.6" />
    <path d="M20 66 L50 78 L80 66" />
  </svg>
);

// Interactive Tables lists matching "Neo-café" tablet layout bento grids
const TABLES_LIST = [
  { id: "table_04", nom: "Table 04", hasFlame: true },
  { id: "table_05", nom: "Table 05", hasFlame: true },
  { id: "table_12", nom: "Table 12" },
  { id: "table_03", nom: "Table 3" },
  { id: "table_vip", nom: "VIP", isVIP: true, hasFlame: true },
  { id: "table_01", nom: "Table 1" },
  { id: "table_08", nom: "Table 8" },
  { id: "table_06", nom: "Table 6" },
  { id: "table_07", nom: "Table 7" },
];

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
  const [showUnifiedAuth, setShowUnifiedAuth] = useState<boolean>(false);
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);

  // Security Locking & PIN Authorization
  const [isCaisseLocked, setIsCaisseLocked] = useState<boolean>(false);
  const [pinTargetUser, setPinTargetUser] = useState<TeaRoomUser | null>(null);
  const [pinSuccessAction, setPinSuccessAction] = useState<{ type: "unlock" | "switch_user"; user: TeaRoomUser } | null>(null);
  
  // Current Live Basket & tactile modifiers
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  const [quickDiscount, setQuickDiscount] = useState<number>(0);
  
  // Table Status Management state for Bento Grid mockup (Neo-Café design)
  const [selectedTableId, setSelectedTableId] = useState<string>("table_04");
  const [caisseView, setCaisseView] = useState<"plan" | "menu">("menu");
  
  // Figma Design System Bridges
  const [figmaCategory, setFigmaCategory] = useState<string>('theiere');
  const [figmaNumpadBuffer, setFigmaNumpadBuffer] = useState<string>("");
  const [showFigmaPayment, setShowFigmaPayment] = useState<boolean>(false);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showJournalModal, setShowJournalModal] = useState<boolean>(false);

  const mapCategoryToKey = (cat: string): string => {
    const norm = cat.toLowerCase();
    const found = categories.find(c => c.nom.toLowerCase() === norm || c.id.toLowerCase() === norm);
    if (found) return found.id;

    if (norm.includes('thé') || norm.includes('thei') || norm.includes('chaud')) return 'theiere';
    if (norm.includes('narg') || norm.includes('chich') || norm.includes('shisha') || norm.includes('hookah')) return 'narguile';
    return 'cristal'; 
  };

  const getProductAccent = (item: MenuItem): 'cyan' | 'amber' | 'green' | 'purple' => {
    const normCategory = mapCategoryToKey(item.categorie);
    const name = item.nom.toLowerCase();
    
    if (normCategory === 'theiere') {
      if (name.includes('menthe')) return 'cyan';
      if (name.includes('café') || name.includes('turc') || name.includes('express') || name.includes('noisette')) return 'amber';
      return 'green';
    } else if (normCategory === 'cristal') {
      if (name.includes('eau') || name.includes('limonade') || name.includes('soda')) return 'cyan';
      if (name.includes('patiss') || name.includes('gâteau') || name.includes('cookie') || name.includes('fruits')) return 'green';
      return 'amber';
    } else {
      if (name.includes('charbon')) return 'amber';
      return 'purple';
    }
  };

  const mapMenuItemToProduct = (item: MenuItem): FigmaProduct => {
    return {
      id: item.id,
      name: item.nom,
      price: item.prix,
      category: mapCategoryToKey(item.categorie),
      accent: getProductAccent(item)
    };
  };
  const [numpadValue, setNumpadValue] = useState<string>("");
  const [selectedBasketItemId, setSelectedBasketItemId] = useState<string | null>(null);
  
  // Custom interactive settings switches
  const [aiAgentActive, setAiAgentActive] = useState<boolean>(true);
  const [aiPerformanceActive, setAiPerformanceActive] = useState<boolean>(true);
  const [autoReceiptDelivery, setAutoReceiptDelivery] = useState<boolean>(false);

  // Initial table baskets
  const [tableBaskets, setTableBaskets] = useState<Record<string, BasketItem[]>>({
    "table_04": [
      { id: "prod_1", nom: "Sencha Impérial", prix: 5.5, quantite: 2 },
      { id: "prod_2", nom: "Matcha de Cérémonie Uji", prix: 8.0, quantite: 1 },
      { id: "prod_6", nom: "Mochi Artisanal Matcha-Haricot", prix: 3.5, quantite: 3 }
    ],
    "table_05": [
      { id: "prod_3", nom: "Darjeeling d'Automne Extra", prix: 6.2, quantite: 1 },
      { id: "prod_7", nom: "Financier Grillé au Sésame Noir", prix: 4.0, quantite: 2 }
    ],
    "table_03": [
      { id: "prod_4", nom: "Oolong Fleur d'Oranger", prix: 6.5, quantite: 1 }
    ],
    "table_vip": [
      { id: "prod_2", nom: "Matcha de Cérémonie Uji", prix: 8.0, quantite: 2 },
      { id: "prod_8", nom: "Fouet Matcha 'Chasen'", prix: 18.0, quantite: 1 }
    ]
  });

  // Structural synchronized hook between overall active basket and current selected table basket
  useEffect(() => {
    setTableBaskets((prev) => {
      const currentForTable = prev[selectedTableId] || [];
      if (JSON.stringify(currentForTable) === JSON.stringify(basket)) {
        return prev;
      }
      return {
        ...prev,
        [selectedTableId]: basket
      };
    });
  }, [basket, selectedTableId]);

  useEffect(() => {
    setBasket(tableBaskets[selectedTableId] || []);
  }, [selectedTableId]);

  // Active Invoice modal trigger
  const [shownTransaction, setShownTransaction] = useState<TransactionRecord | null>(null);
  const [lastCompletedTx, setLastCompletedTx] = useState<TransactionRecord | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  // Time tracker for UTC header visual clocks
  const [currentTime, setCurrentTime] = useState(new Date());

  // Audio beep player representing mechanical POS terminal key sounds
  const playBeep = (freq = 550, dur = 0.06) => {
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
    } catch (e) {
      // safe fallback
    }
  };

  // Color mapping per physical categorization layout rules (sunlight readable flat buttons)
  const getCategoryColor = (category: string) => {
    const norm = category.toLowerCase();
    if (norm.includes("boisson") || norm.includes("frais") || norm.includes("jus") || norm.includes("eau") || norm.includes("soda") || norm.includes("fraîche")) {
      return { bg: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700", text: "text-white" };
    }
    if (norm.includes("pâtiss") || norm.includes("gâteau") || norm.includes("sucré") || norm.includes("cookie") || norm.includes("mochi") || norm.includes("fine") || norm.includes("dessert") || norm.includes("snack") || norm.includes("croissant") || norm.includes("financier")) {
      return { bg: "bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white border-pink-700", text: "text-white" };
    }
    if (norm.includes("thé") || norm.includes("sencha") || norm.includes("matcha") || norm.includes("infusion") || norm.includes("chaud") || norm.includes("café") || norm.includes("expresso") || norm.includes("tisane") || norm.includes("oolong")) {
      return { bg: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-700", text: "text-white" };
    }
    if (norm.includes("chicha") || norm.includes("shisha") || norm.includes("hookah") || norm.includes("salon")) {
      return { bg: "bg-white border-slate-300 hover:bg-slate-150 active:bg-slate-200 text-slate-900 border-2", text: "text-slate-900" };
    }
    return { bg: "bg-neutral-600 hover:bg-neutral-700 active:bg-neutral-800 text-white border-neutral-700", text: "text-white" };
  };

  // Dynamic Key-Press machine for POS Touch Input
  const handleKeypadPress = (key: string) => {
    playBeep(520, 0.05);
    setGlobalError("");
    if (key === "EXIT") {
      setNumpadValue("");
      setCaisseView("plan");
    } else if (key === "CLEAR") {
      if (numpadValue !== "") {
        setNumpadValue("");
      } else {
        clearBasket();
      }
    } else if (key === "LOG OFF") {
      setCurrentUser(null);
      clearBasket();
      setNumpadValue("");
      setCaisseView("plan");
      setActiveTab("caisse");
    } else if (key === "QTY *") {
      if (!selectedBasketItemId && basket.length > 0) {
        setSelectedBasketItemId(basket[basket.length - 1].id);
      }
      const activeId = selectedBasketItemId || (basket.length > 0 ? basket[basket.length - 1].id : null);
      if (!activeId) {
        setGlobalError("Sélectionnez d'abord un article pour appliquer la quantité.");
        return;
      }
      const qtyNum = parseInt(numpadValue, 10);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        setGlobalError("Saisissez d'abord un nombre entier sur le pavé (ex: 3 puis QTY*).");
        return;
      }

      const original = products.find(p => p.id === activeId);
      if (original && qtyNum > original.stock_actuel) {
        setGlobalError(`Attention: Stock insuffisant pour "${original.nom}" (${original.stock_actuel} restant).`);
        return;
      }

      setBasket((prev) =>
        prev.map((item) => (item.id === activeId ? { ...item, quantite: qtyNum } : item))
      );
      setNumpadValue("");
    } else {
      if (key === "." && numpadValue.includes(".")) return;
      if (numpadValue.length >= 7) return;
      setNumpadValue((prev) => prev + key);
    }
  };

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

    // Auto load first user (ADMIN MAAZIM) to facilitate quick evaluation of the tablet
    setTimeout(() => {
      if (allStaff.length > 0 && !currentUser) {
        // Find Admin to pre-populate session
        const preUser = allStaff.find(u => u.role === "admin") || allStaff[0];
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

  // 3. Simulated RFID Tap Authentication & PIN Check Trigger
  const handleRfidScan = async (rfidToken: string) => {
    setGlobalError("");
    
    // Find staff member with this token
    const matchedProfile = allStaff.find(
      (u) => u.rfid_token.trim().toUpperCase() === rfidToken.trim().toUpperCase()
    );

    if (matchedProfile) {
      setPinTargetUser(matchedProfile);
      setPinSuccessAction({ type: "switch_user", user: matchedProfile });
    } else {
      // Create a temporary matched profile so they can register and test any custom RFID on-the-fly!
      const tempProfile: TeaRoomUser = {
        uid: `custom_${rfidToken}`,
        nom: `Profil Custom (${rfidToken})`,
        email: "custom@salondethe.com",
        rfid_token: rfidToken,
        role: "serveur",
        pin_code: "1111" // Code de secours d'évaluation
      };
      setPinTargetUser(tempProfile);
      setPinSuccessAction({ type: "switch_user", user: tempProfile });
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
    setSelectedBasketItemId(p.id);
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

  const handleCreateProductContextual = async (newProd: Omit<MenuItem, "id">) => {
    if (!currentUser) {
      throw new Error("Une session active de Gérant ou d'Administrateur est requise.");
    }
    await createNewProduct(newProd, currentUser);
    playBeep(850, 0.1);
  };

  // Figma POS Handler Adapters
  const handleAddProductFigma = (product: FigmaProduct) => {
    playBeep(650, 0.05);
    const qty = figmaNumpadBuffer ? Math.max(1, parseInt(figmaNumpadBuffer, 10)) : 1;
    setFigmaNumpadBuffer('');
    
    // Find matching database MenuItem
    const dbItem = products.find(p => p.id === product.id);
    if (!dbItem) return;
    
    if (dbItem.stock_actuel <= 0) {
      setGlobalError(`Attention: "${dbItem.nom}" est en rupture de stock !`);
      return;
    }
    
    setGlobalError("");
    setBasket((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.id === product.id ? { ...it, quantite: it.quantite + qty } : it
        );
      }
      return [...prev, { id: product.id, nom: product.name, prix: product.price, quantite: qty }];
    });
  };

  const handleNumpadFigma = (key: string) => {
    playBeep(650, 0.05);
    if (key === '⌫') {
      setFigmaNumpadBuffer((b) => b.slice(0, -1));
    } else if (key === '×') {
      setBasket([]);
      setFigmaNumpadBuffer('');
    } else {
      setFigmaNumpadBuffer((b) => (b.length < 3 ? b + key : b));
    }
  };

  const handlePaymentCompleteFigma = async (method: string) => {
    if (!currentUser) return;
    
    setProcessingCheckout(true);
    setGlobalError("");

    const total = basket.reduce((sum, item) => sum + item.prix * item.quantite, 0);
    const paymentMethodLabel = method === "ESPÈCES" ? "especes" : method === "CARTE / TND" ? "carte" : "mobile";

    try {
      const newTxId = await checkoutBasket(basket, total, currentUser);
      
      const recordedTx: TransactionRecord = {
        id: newTxId,
        timestamp: Date.now(),
        total: total,
        user_id: currentUser.uid,
        user_nom: currentUser.nom,
        rfid_token: currentUser.rfid_token,
        type: "vente",
        status: `completed_by_${paymentMethodLabel}`,
        items: basket.map(b => ({
          product_id: b.id,
          product_nom: b.nom,
          prix_unitaire: b.prix,
          quantite: b.quantite
        }))
      };

      setLastCompletedTx(recordedTx);
      setShownTransaction(recordedTx);
      setBasket([]); 
      setFigmaNumpadBuffer('');
      setShowFigmaPayment(false);
      setCaisseView("menu"); // Go back to hall plan on completed checkout!
    } catch (err: any) {
      setGlobalError(err.message || "La transaction réseau a échoué.");
    } finally {
      setProcessingCheckout(false);
    }
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

  // Calculations for total daily managed transactions and table allocations (Neo-Café summary metrics)
  const totalTransactionsSum = React.useMemo(() => transactions
    .filter((t) => t.status !== "annulé" && t.type === "vente")
    .reduce((sum, t) => sum + t.total, 0), [transactions]);
    
  const totalActiveBasketsSum = React.useMemo(() => Object.entries(tableBaskets).reduce((sum, [tableId, b]) => {
    // Exclude the currently selected table to make sure it is not counted twice from basket state
    if (tableId === selectedTableId) {
      return sum + basket.reduce((s, item) => s + item.prix * item.quantite, 0);
    }
    return sum + b.reduce((s, item) => s + item.prix * item.quantite, 0);
  }, 0), [tableBaskets, basket, selectedTableId]);

  const totalManagedValue = React.useMemo(() => totalTransactionsSum + totalActiveBasketsSum, [totalTransactionsSum, totalActiveBasketsSum]);

  const getTableTotal = (tableId: string) => {
    if (tableId === selectedTableId) {
      return basket.reduce((sum, item) => sum + item.prix * item.quantite, 0);
    }
    const basketItems = tableBaskets[tableId] || [];
    return basketItems.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  };

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

  const mappedCartItems: FigmaCartItem[] = basket.map((item) => {
    const dbItem = products.find(p => p.id === item.id);
    const accent = dbItem ? getProductAccent(dbItem) : 'cyan';
    const category = dbItem ? mapCategoryToKey(dbItem.categorie) : 'theiere';
    return {
      id: item.id,
      name: item.nom,
      price: item.prix,
      quantity: item.quantite,
      accent,
      category,
    };
  });

  return (
    <div className="bg-[#020813] min-h-screen text-slate-100 font-sans antialiased flex flex-col overflow-x-hidden relative select-none">
      
      {!isOnline && (
        <div id="persistent-offline-banner" className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold font-sans flex items-center justify-center gap-2 border-b border-amber-600 shadow-md relative z-50 text-center">
          <WifiOff className="w-4 h-4 text-amber-900 shrink-0" />
          <span><strong>Connexion Suspendue (Hors-Ligne) :</strong> Enregistrements stockés localement et synchronisés automatiquement.</span>
        </div>
      )}

      {/* Super System Status Ribbon */}
      <div id="tech-status-ribbon" className="bg-[#030914] border-b border-[#11243D]/50 text-slate-400 text-[10px] font-mono py-2 px-4 md:px-6 flex flex-wrap items-center justify-between gap-3 relative z-40 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00F5D4] shadow-[0_0_8px_#00f5d4] animate-pulse" />
            <span className="font-bold text-[#00F5D4] tracking-widest text-[9px] font-sans">MAAZIM POS 3000 Active</span>
          </div>
          <span className="text-[#11243D] hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-[9px] tracking-wider">
            <span>STATION D'ENCAISSEMENT PRINCIPALE</span>
          </div>
        </div>

        {/* Dynamic Clock & Connections */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-[#00F5D4] font-mono font-bold leading-none bg-[#00F5D4]/10 border border-[#00F5D4]/20 px-2 py-0.5 rounded text-[10px]" title="Heure locale de service">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          <button
            id="rfid-global-toggle-btn"
            onClick={() => { playBeep(650, 0.05); setShowRfidSimulator(true); }}
            className="px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 border bg-[#061224] hover:bg-[#0B1E38] text-cyan-400 border-[#11243D] hover:border-cyan-400 transition cursor-pointer shrink-0"
            title="Ouvrir le simulateur de badge"
          >
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>SIM ACCESS</span>
          </button>

          <button
            id="offline-simulate-btn"
            onClick={toggleOfflineMode}
            className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 border transition duration-150 cursor-pointer ${
              isOnline
                ? "bg-[#041F18] border-emerald-500 text-emerald-400 hover:bg-[#082E25]"
                : "bg-rose-950 border-rose-500 text-rose-300 animate-pulse"
            }`}
            title="Simuler une coupure de réseau"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-300 shrink-0" />
                <span>OFFLINE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Tablet Header Bar */}
      <header id="applet-main-header" className="relative bg-[#040D1D] border-b border-[#11243D] text-white shrink-0 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4 relative z-20">
          
          {/* Brand & Tab Navigation Capsule */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5 w-full lg:w-auto justify-between lg:justify-start">
            {/* Café Maazim flat brand logo and text */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative flex items-center justify-center">
                <div className="w-9 h-9 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
                  <img 
                    src={futuristicTeaIcon} 
                    className="w-full h-full object-cover" 
                    alt="Café Maazim Logo" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <span className="font-sans text-[13px] font-extrabold tracking-[0.25em] text-[#00F5D4] leading-none uppercase select-none drop-shadow-[0_0_8px_rgba(0,245,212,0.3)]">
                  CAFÉ MAAZIM
                </span>
                <span className="text-[7.5px] text-slate-400 font-mono tracking-wider font-extrabold uppercase mt-1 leading-none">
                  SALON DE THÉ TECHNO // TOPO-INTELLIGENT
                </span>
              </div>
            </div>

            <div className="hidden md:block h-5 w-[1px] bg-[#11243D]" />

            {/* Capsule tabs folding into physical flat tiles */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 bg-[#020813] border border-[#11243D] p-1 rounded-xl max-w-full">
              <button
                id="nav-tab-caisse"
                onClick={() => { playBeep(650, 0.05); setActiveTab("caisse"); setGlobalError(""); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition duration-150 cursor-pointer border ${
                  activeTab === "caisse"
                    ? "bg-[#00F5D4]/15 border-[#00F5D4] text-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.2)] font-black"
                    : "bg-[#060F1F]/40 border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Caisse Tactile</span>
              </button>
              
              <button
                id="nav-tab-ventes"
                onClick={() => { playBeep(650, 0.05); setActiveTab("ventes"); setGlobalError(""); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition duration-150 cursor-pointer border ${
                  activeTab === "ventes"
                    ? "bg-[#00F5D4]/15 border-[#00F5D4] text-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.2)] font-black"
                    : "bg-[#060F1F]/40 border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Registre Ventes</span>
              </button>

              <button
                id="nav-tab-stocks"
                onClick={() => { playBeep(650, 0.05); setActiveTab("stocks"); setGlobalError(""); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition duration-150 cursor-pointer border ${
                  activeTab === "stocks"
                    ? "bg-[#00F5D4]/15 border-[#00F5D4] text-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.2)] font-black"
                    : "bg-[#060F1F]/40 border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Menu & Stocks</span>
              </button>

              <button
                id="nav-tab-stats"
                onClick={() => { playBeep(650, 0.05); setActiveTab("stats"); setGlobalError(""); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition duration-150 cursor-pointer border ${
                  activeTab === "stats"
                    ? "bg-[#00F5D4]/15 border-[#00F5D4] text-[#00F5D4] shadow-[0_0_10px_rgba(0,245,212,0.2)] font-black"
                    : "bg-[#060F1F]/40 border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Rapports</span>
              </button>
            </div>
          </div>

          {/* CENTER MODULE: Translucent Active State Badge Pilule */}
          <div className="flex-1 flex justify-center items-center my-2 lg:my-0">
            <div
              onClick={() => { playBeep(650, 0.1); setShowUnifiedAuth(true); }}
              className={`flex items-center gap-3 bg-[#111622]/80 px-5 py-2.5 rounded-full border cursor-pointer hover:bg-slate-800 hover:border-cyan-400 transition duration-150 select-none shadow-lg transform active:scale-97 ${
                currentUser 
                  ? currentUser.role === "admin" || currentUser.role === "gerant"
                    ? "border-amber-500/50 shadow-amber-955/10"
                    : "border-cyan-500/40 shadow-cyan-955/10"
                  : "border-rose-500/30 shadow-rose-955/10 animate-pulse"
              }`}
              style={{ minWidth: "190px" }}
              title="Commuter de session (PIN / RFID)"
            >
              {/* Pulsating LED point */}
              <div className="relative flex items-center justify-center shrink-0">
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                  currentUser
                    ? currentUser.role === "admin"
                      ? "bg-amber-400 shadow-[0_0_10px_#f59e0b]"
                      : currentUser.role === "gerant"
                        ? "bg-purple-400 shadow-[0_0_10px_#c084fc]"
                        : "bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                    : "bg-rose-500 shadow-[0_0_10px_#f43f5e]"
                }`} />
              </div>

              {/* Identity & active status */}
              <div className="text-left font-sans">
                <div className="text-[7px] font-mono text-cyan-400 uppercase tracking-widest leading-none">
                  {currentUser ? `BADGE_RFID::${currentUser.role.toUpperCase()}` : "RFID_DISCONNECTED"}
                </div>
                <div className="text-[9.5px] font-bold text-white uppercase leading-tight mt-1 truncate max-w-[170px]">
                  {currentUser ? `${currentUser.nom}` : "PAS DE SESSION ACTIVE"}
                </div>
              </div>
            </div>
          </div>

          {/* Current user session badge styled as a personnel card */}
          <div className="shrink-0">
            {currentUser ? (
              <div 
                onClick={() => { playBeep(650, 0.05); setShowUnifiedAuth(true); }}
                className="flex items-center gap-2 bg-[#061122] border border-[#11243D] rounded-xl p-1 px-3 cursor-pointer hover:bg-slate-800 transition"
                title="Gérer le Personnel"
              >
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></div>
                </div>
                <div className="text-left font-sans">
                  <div className="text-[7px] font-mono text-cyan-400 uppercase tracking-wider leading-none">BADGE_RFID::{currentUser.role.toUpperCase()}</div>
                  <div className="text-[9.5px] font-extrabold text-white truncate max-w-[110px] uppercase leading-tight">{currentUser.nom}</div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => { playBeep(650, 0.05); setShowUnifiedAuth(true); }}
                className="flex items-center gap-2 bg-rose-900/20 border border-rose-800 text-rose-300 px-3 py-1.5 rounded-xl font-mono text-[8px] font-bold tracking-widest cursor-pointer shadow-xs animate-pulse"
                title="Cliquer pour simuler un badge"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 inline-block"></span>
                RFID BADGE REQUIS
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 flex flex-col lg:flex-row gap-6 overflow-hidden select-none">
        
        {/* Left / Center Main Partition Section (3-cols on desktop) */}
        <div className="lg:col-span-3 flex flex-col space-y-6 overflow-hidden">
          
          {/* Feedback alerts if any */}
          {globalError && (
            <div id="global-feedback-alert" className="bg-[#0A0D14] border border-rose-500/30 text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center justify-between gap-3 shadow-lg shadow-rose-505/10">
              <div className="flex items-center gap-2.5">
                <HeartCrack className="w-4 h-4 shrink-0 text-rose-500 animate-pulse" />
                <span>{globalError}</span>
              </div>
              <button 
                id="dismiss-error-btn"
                onClick={() => setGlobalError("")} 
                className="text-[10px] font-mono text-rose-450 hover:text-rose-200 transition underline cursor-pointer font-bold"
              >
                Fermer
              </button>
            </div>
          )}

          {/* RENDERING PORTIONS BY TAB */}
          <div id="main-viewports-container" className="flex-1 overflow-y-auto">
            
            {activeTab === "caisse" && (
              /* CAISSE TACTILE VIEW */
              <div id="viewport-caisse" className="space-y-4 relative min-h-[400px]">
                {isCaisseLocked ? (
                  /* HIGH-SECURITY LOCKED OVERLAY */
                  <div id="caisse-locked-overlay" className="bg-slate-100 border-2 border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center py-14 select-none">
                    
                    <div className="mb-4">
                      <div className="w-16 h-16 rounded-lg bg-slate-200 border-2 border-slate-400 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-slate-700" />
                      </div>
                    </div>

                    <h2 className="text-sm font-sans font-black tracking-widest text-slate-800 uppercase leading-none mb-1">
                      TERMINAL DE CAISSE VERROUILLÉ
                    </h2>
                    <p className="text-[10px] font-mono font-black text-rose-700 uppercase tracking-wider bg-rose-50 border border-rose-200 px-3 py-1 rounded mb-5">
                      SÉCURITÉ DOUBLE ENCAISSEMENT RFID ACTIVE
                    </p>
                    
                    <p className="text-xs text-slate-600 max-w-sm mb-6 leading-relaxed">
                      Saisissez le code PIN pour déverrouiller la session de l'opérateur courant : <span className="text-slate-800 font-black">{currentUser?.nom || "Non Connecté"}</span>.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-xs">
                      <button
                        id="caisse-unlock-trigger-btn"
                        onClick={() => {
                          playBeep(650, 0.05);
                          if (currentUser) {
                            setPinTargetUser(currentUser);
                            setPinSuccessAction({ type: "unlock", user: currentUser });
                          } else {
                            setGlobalError("Sélectionnez d'abord un vendeur ou badgez.");
                            focusVendeurInput();
                          }
                        }}
                        className="w-full bg-slate-750 hover:bg-slate-850 text-white font-black text-xs py-3.5 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm border border-slate-800"
                      >
                        <Unlock className="w-4 h-4 shrink-0" />
                        <span>Saisir mon PIN</span>
                      </button>
                      
                      <button
                        id="caisse-locked-switch-user-btn"
                        onClick={() => { playBeep(650, 0.05); focusVendeurInput(); }}
                        className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs py-3.5 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span>Changer de Vendeur</span>
                      </button>
                    </div>

                    <div className="mt-8 text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                      SYSTEM LEVEL POS-3000-CHAIN // LOCAL DESKTOP PORT 3000
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-5 items-stretch w-full overflow-hidden min-h-[500px]">
                    {/* LEFT PANEL: Simple Flat touch POS tabs */}
                    <div className="md:w-[95px] shrink-0 bg-slate-100 border border-slate-300 rounded-lg p-2.5 flex flex-col items-center justify-between select-none">
                      
                      {/* Sobriety brand symbol */}
                      <div className="flex flex-col items-center text-center space-y-1.5 w-full">
                        <div className="p-2 rounded-lg bg-slate-200 border border-slate-300">
                          <TechnoTeapotSVG className="w-8 h-8" color="#334155" />
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-sans font-black tracking-[0.1em] text-slate-700 leading-none uppercase">
                            MAAZIM
                          </div>
                          <div className="text-[7px] text-slate-500 font-mono tracking-wider font-extrabold uppercase mt-0.5 leading-none">
                            TOUCH POS
                          </div>
                        </div>
                      </div>

                      {/* Direct physical action switch rails */}
                      <div className="flex flex-row md:flex-col gap-2 my-4 w-full">
                        <button
                          id="shortcut-plan-btn"
                          onClick={() => { playBeep(650, 0.05); setCaisseView("plan"); }}
                          className={`relative w-full py-3.5 px-1 rounded-lg border text-center transition active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            caisseView === "plan"
                              ? "bg-slate-700 border-slate-800 text-white font-black"
                              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                          }`}
                          title="Plan des Tables"
                        >
                          <StackedLayersSVG className="w-5 h-5" color={caisseView === "plan" ? "#ffffff" : "#475569"} />
                          <span className="text-[8px] font-mono font-black tracking-wider mt-0.5 uppercase">PLAN</span>
                        </button>

                        <button
                          id="shortcut-tea-btn"
                          onClick={() => {
                            playBeep(650, 0.05);
                            setCaisseView("menu");
                            setSelectedCategory("Tous");
                          }}
                          className={`relative w-full py-3.5 px-1 rounded-lg border text-center transition active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            caisseView === "menu" && (selectedCategory === "Tous" || selectedCategory.toLowerCase().includes("thé"))
                              ? "bg-slate-700 border-slate-800 text-white font-black"
                              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                          }`}
                          title="Menu Thés & Infusions"
                        >
                          <TechnoTeapotSVG className="w-5 h-5" color={caisseView === "menu" && (selectedCategory === "Tous" || selectedCategory.toLowerCase().includes("thé")) ? "#ffffff" : "#475569"} />
                          <span className="text-[8px] font-mono font-black tracking-wider mt-0.5 uppercase">MENU</span>
                        </button>
                      </div>

                      {/* Pure offline network status anchor */}
                      <div className="hidden md:flex flex-col items-center space-y-0.5">
                        <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                        <span className="text-[6.5px] font-mono text-slate-500 font-extrabold uppercase">PRÊT</span>
                      </div>
                    </div>

                    {/* CENTER PANEL: Dynamic Workspace (Tables lists or product catalog) */}
                    <div className="flex-1 flex flex-col space-y-5 overflow-hidden">
                      {caisseView === "plan" ? (
                        /* HIGH-FIDELITY BENTO PLAN DES TABLES */
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <h2 className="text-sm font-sans font-black tracking-widest text-slate-700 uppercase leading-none">
                                PLAN DE SALLE & COMMANDES
                              </h2>
                              <p className="text-[10px] text-slate-500 uppercase mt-1 leading-none tracking-wider font-semibold font-mono">
                                Cliquer sur une table pour composer l'addition ou le service en cours
                              </p>
                            </div>

                            <div className="flex items-center gap-3 text-[9px] font-mono font-black uppercase shrink-0">
                              <div className="flex items-center gap-1.5 text-slate-705">
                                <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-400" />
                                <span>Libre / Dispo</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-amber-700">
                                <span className="w-2.5 h-2.5 rounded-sm bg-amber-405 border border-amber-400" />
                                <span>Occupée ({TABLES_LIST.filter(t => getTableTotal(t.id) > 0).length})</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {TABLES_LIST.map((table) => {
                              const tableBillTotal = getTableTotal(table.id);
                              const isOccupied = tableBillTotal > 0;
                              const isSelected = selectedTableId === table.id;
                              
                              return (
                                <div
                                  id={`table-bento-${table.id}`}
                                  key={table.id}
                                  onClick={() => {
                                    playBeep(650, 0.05);
                                    setSelectedTableId(table.id);
                                    setCaisseView("menu");
                                  }}
                                  className={`group relative p-4 rounded-lg border-2 flex flex-col justify-between transition-all duration-150 cursor-pointer min-h-[110px] select-none ${
                                    isSelected
                                      ? "ring-4 ring-cyan-500 scale-[0.98]"
                                      : "hover:bg-slate-50"
                                  } ${
                                    isOccupied
                                      ? "bg-amber-100 border-amber-400 text-amber-950"
                                      : "bg-slate-100 border-slate-350 text-slate-800"
                                  }`}
                                >
                                  <div className="flex justify-between items-start w-full relative z-10">
                                    <div>
                                      <span className={`text-[8px] font-mono font-black tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                                        isOccupied
                                          ? "bg-amber-200 border-amber-300 text-amber-900"
                                          : "bg-slate-200 border-slate-300 text-slate-700"
                                      }`}>
                                        {isOccupied ? "OCCUPÉE" : "LIBRE"}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <span className={`h-2 w-2 rounded-full ${
                                        isOccupied ? "bg-amber-600 animate-pulse" : "bg-slate-400"
                                      }`} />
                                    </div>
                                  </div>

                                  <div className="my-1.5 relative z-10">
                                    <h3 className="text-sm font-sans font-black tracking-tight uppercase leading-none">
                                      {table.nom}
                                    </h3>
                                    {table.isVIP && (
                                      <span className="text-[7.5px] text-orange-700 font-mono tracking-wider font-extrabold block uppercase mt-0.5">
                                        ★ SALON VIP / PRIVATIF ★
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between border-t border-slate-300/40 pt-2 relative z-10">
                                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                                      ADDITION
                                    </span>
                                    <div className="flex items-baseline gap-0.5">
                                      <span className={`text-sm font-mono font-black leading-none ${isOccupied ? "text-amber-900" : "text-slate-700"}`}>
                                        {tableBillTotal.toFixed(3)}
                                      </span>
                                      <span className="text-[8px] font-black text-slate-500 font-mono">DT</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* CATALOG MENU VIEW */
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                            <button
                              id="breadcrumb-return-plan-btn"
                              onClick={() => { playBeep(650, 0.05); setCaisseView("plan"); }}
                              className="text-[10px] font-mono text-cyan-800 hover:text-cyan-950 font-black tracking-widest flex items-center justify-center gap-1.5 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 px-3.5 py-2 rounded-lg cursor-pointer transition"
                            >
                              <span>← RETOUR AU PLAN DE SALLE</span>
                            </button>
                            <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-200 border border-slate-300 py-2 px-4 rounded-lg text-center truncate">
                              TABLE :: {(TABLES_LIST.find(t => t.id === selectedTableId)?.nom || selectedTableId).toUpperCase()}
                            </span>
                          </div>

                          {/* Horizontal category navigation tracker */}
                          <div id="caisse-categories-track" className="flex items-center gap-1.5 overflow-x-auto pb-1.5 select-none scrollbar-thin">
                            {uniqueCategories.map((cat) => {
                              const name = cat.toLowerCase();
                              let iconValue = "🍵";
                              if (name === "tous") iconValue = "🍵";
                              else if (name.includes("vert")) iconValue = "🍃";
                              else if (name.includes("noir")) iconValue = "🫖";
                              else if (name.includes("infusion") || name.includes("menthe") || name.includes("tisane") || name.includes("parfum")) iconValue = "🌿";
                              else if (name.includes("pâtiss") || name.includes("gâteau") || name.includes("sucré") || name.includes("cookie")) iconValue = "🍰";
                              else if (name.includes("salé") || name.includes("croissant") || name.includes("sandwich")) iconValue = "🥐";
                              else if (name.includes("boisson") || name.includes("frais") || name.includes("jus") || name.includes("eau")) iconValue = "🥤";
                              else if (name.includes("café") || name.includes("expresso")) iconValue = "☕";

                              const isActive = selectedCategory === cat;

                              return (
                                <button
                                  id={`category-pill-${cat}`}
                                  key={cat}
                                  onClick={() => { playBeep(650, 0.05); setSelectedCategory(cat); }}
                                  className={`px-3.5 py-2.5 rounded-lg text-[11px] font-black tracking-wider shrink-0 transition active:scale-95 cursor-pointer border flex items-center gap-1.5 select-none ${
                                    isActive
                                      ? "bg-slate-800 text-white border-slate-900"
                                      : "bg-slate-100 text-slate-705 border-slate-300 hover:bg-slate-200"
                                  }`}
                                >
                                  <span>{iconValue}</span>
                                  <span>{cat.toUpperCase()}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Interactive Touch Pad Products Grid */}
                          <div id="caisse-products-grid" className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {catalogFiltered.map((p) => {
                              const isOutOfStock = p.stock_actuel <= 0;
                              const normCat = p.categorie.toLowerCase();
                              
                              // Simple, efficient tactile category color coding
                              let padColorClass = "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"; // default
                              
                              if (normCat.includes("vert") || normCat.includes("noir") || normCat.includes("thé")) {
                                padColorClass = "bg-sky-100 border-sky-305 text-sky-950 hover:bg-sky-200"; // Blue for teas
                              } else if (normCat.includes("infusion") || normCat.includes("menthe") || normCat.includes("tisane") || normCat.includes("parfum")) {
                                padColorClass = "bg-emerald-100 border-emerald-305 text-emerald-950 hover:bg-emerald-200"; // Green for infusions
                              } else if (normCat.includes("chicha") || normCat.includes("shisha") || normCat.includes("hookah") || normCat.includes("salon")) {
                                padColorClass = "bg-orange-100 border-orange-300 text-orange-950 hover:bg-orange-200"; // Orange/amber for chichas
                              } else if (normCat.includes("pâtiss") || normCat.includes("sucré") || normCat.includes("cookie") || normCat.includes("gâteau")) {
                                padColorClass = "bg-pink-100 border-pink-300 text-pink-950 hover:bg-pink-200"; // Pink for dessert/sweet
                              } else if (normCat.includes("café") || normCat.includes("expresso")) {
                                padColorClass = "bg-amber-100 border-amber-305 text-amber-950 hover:bg-amber-100"; // yellow-gold café
                              } else if (normCat.includes("boisson") || normCat.includes("jus") || normCat.includes("frais") || normCat.includes("eau")) {
                                padColorClass = "bg-slate-100 border-slate-350 text-slate-900 hover:bg-slate-200"; // Grey for cold sodas/water
                              }

                              return (
                                <button
                                  id={`product-card-${p.id}`}
                                  key={p.id}
                                  disabled={isOutOfStock}
                                  onClick={() => { playBeep(650, 0.05); addToBasket(p); }}
                                  className={`group relative text-left border-2 p-3.5 rounded-lg flex flex-col justify-between transition-all duration-100 select-none min-h-[92px] active:scale-[0.97] ${padColorClass} ${
                                    isOutOfStock 
                                      ? "opacity-25 cursor-not-allowed border-dashed bg-slate-100 border-slate-200" 
                                      : "cursor-pointer"
                                  }`}
                                >
                                  <div className="w-full flex justify-between items-start">
                                    <h4 className="font-sans font-black text-[11px] leading-tight break-words uppercase pr-2 line-clamp-2">
                                      {p.nom}
                                    </h4>
                                    
                                    <span className={`text-[7px] font-mono font-bold px-1 py-0.2 rounded border shrink-0 ${
                                      isOutOfStock 
                                        ? "bg-rose-100 text-rose-800 border-rose-300" 
                                        : p.stock_actuel < 5 
                                          ? "bg-amber-200 text-amber-900 border-amber-405 animate-pulse" 
                                          : "bg-black/5 text-slate-650 border-black/10"
                                    }`}>
                                      ST: {p.stock_actuel}
                                    </span>
                                  </div>

                                  <div className="mt-2.5 flex items-end justify-between w-full">
                                    <span className="text-[7.5px] uppercase font-mono tracking-wider font-extrabold opacity-70">
                                      {p.categorie}
                                    </span>
                                    <div className="text-right font-mono text-[12px] font-black line-none">
                                      {p.prix.toFixed(3)} <span className="text-[8.5px]">DT</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
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
          
          {/* Right Panel Option A: RÉSUMÉ DU JOUR (when in Plan view) */}
          {activeTab === "caisse" && caisseView === "plan" && (
            <div id="resume-du-jour-panel" className="bg-slate-50 border-2 border-slate-300 rounded-lg p-5 text-slate-800 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-700 shrink-0" />
                  <h3 className="font-sans font-black text-xs text-slate-800 tracking-wider uppercase">
                    RÉSUMÉ DE SERVICE
                  </h3>
                </div>
                <span className="text-[7.5px] font-mono text-slate-600 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded uppercase font-bold">
                  SÉCURISÉ
                </span>
              </div>

              {/* Total business volume indicator */}
              <div className="space-y-1 bg-white border border-slate-200 p-3.5 rounded-lg">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block font-black">
                  VOLUME DES ENCAISSEMENTS TOTAL (DT)
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                    {totalTransactionsSum.toFixed(3)}
                  </span>
                  <span className="text-sm font-black font-mono text-slate-500">DT</span>
                </div>
                <div className="text-[8px] font-mono text-emerald-700 tracking-tight uppercase flex items-center gap-1 mt-1 font-bold">
                  <span>● LECTURE DE BASE DE DONNÉES SYNCHRONISÉE</span>
                </div>
              </div>

              {/* Occupied vs Free Tables counts */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <span className="text-[7.5px] font-mono text-slate-500 uppercase font-bold block">TABLES ACTIVES</span>
                  <span className="text-lg font-mono font-black text-amber-700">
                    {TABLES_LIST.filter(t => getTableTotal(t.id) > 0).length} / {TABLES_LIST.length}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                  <span className="text-[7.5px] font-mono text-slate-500 uppercase font-bold block">REVENU MOYEN</span>
                  <span className="text-lg font-mono font-black text-slate-800">
                    {(() => {
                      const activeT = TABLES_LIST.filter(t => getTableTotal(t.id) > 0);
                      if (activeT.length === 0) return "0.00";
                      const totalActive = activeT.reduce((sum, t) => sum + getTableTotal(t.id), 0);
                      return (totalActive / activeT.length).toFixed(1);
                    })()} <span className="text-[8px]">DT</span>
                  </span>
                </div>
              </div>

              {/* Compact Local Operator Row */}
              <div className="border-t border-slate-350 pt-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 border-2 border-slate-350 flex items-center justify-center text-slate-700">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-sans font-black text-slate-800 block uppercase leading-none">
                      {currentUser ? currentUser.nom : "HORS-CONNEXION"}
                    </span>
                    <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-wider block leading-none mt-1 font-bold">
                      Badge: {currentUser ? currentUser.role.toUpperCase() : "INVITE"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { playBeep(650, 0.05); setIsCaisseLocked(true); }}
                  className="px-2.5 py-1.5 rounded bg-amber-50 hover:bg-amber-100 border-2 border-amber-400 text-amber-900 font-mono text-[8px] font-black uppercase tracking-wider transition cursor-pointer"
                >
                  BLOQUER
                </button>
              </div>
            </div>
          )}

          {/* Right Panel Option B: ACTIVE SHOPPING BASKET (when in Menu view) */}
          {activeTab === "caisse" && caisseView === "menu" && (
            <div id="caisse-basket-container" className="bg-slate-50 border-2 border-slate-300 rounded-lg flex flex-col max-h-[480px] text-slate-800 shadow-sm">
              <div className="p-4 border-b border-slate-350 bg-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-slate-800 shrink-0" />
                  <h3 className="font-sans font-black text-xs text-slate-800 tracking-wider uppercase">
                    TICKET COMPOSÉ
                  </h3>
                </div>
                {basket.length > 0 && (
                  <button
                    id="clear-basket-btn"
                    onClick={() => { playBeep(650, 0.05); clearBasket(); }}
                    className="text-red-700 hover:text-red-900 border border-red-300 bg-red-50 hover:bg-red-100 p-1.5 rounded cursor-pointer transition"
                    title="Vider le panier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Basket list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[140px] scrollbar-thin">
                {basket.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg my-2 bg-white">
                    <Coins className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wide">LE PANIER EST VIDE</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-mono font-bold">Sélectionner des produits à gauche</p>
                  </div>
                ) : (
                  basket.map((item) => {
                    const isSelected = selectedBasketItemId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedBasketItemId(item.id)}
                        className={`border-2 rounded-lg p-2.5 flex items-center justify-between text-xs transition cursor-pointer select-none space-x-2 ${
                          isSelected
                            ? "bg-cyan-50 border-cyan-550 ring-2 ring-cyan-200"
                            : "bg-white border-slate-205 hover:border-slate-300"
                        }`}
                      >
                        <div className="overflow-hidden pr-1 flex-1">
                          <div className="font-black text-slate-800 text-xs uppercase truncate leading-tight">{item.nom}</div>
                          <div className="text-[11px] text-slate-600 font-mono font-black mt-0.5">{(item.prix * item.quantite).toFixed(3)} DT</div>
                        </div>

                        {/* touch increments upscaled for easy finger tapping */}
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <button
                            id={`decrease-basket-${item.id}`}
                            onClick={(e) => { e.stopPropagation(); playBeep(650, 0.05); decreaseBasketQty(item.id); }}
                            className="w-8 h-8 bg-slate-200 hover:bg-slate-300 text-slate-850 border border-slate-350 rounded flex items-center justify-center text-sm font-black cursor-pointer transition select-none"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs text-slate-850 w-5 text-center font-black">{item.quantite}</span>
                          <button
                            id={`increase-basket-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playBeep(650, 0.05);
                              const original = products.find(p => p.id === item.id);
                              if (!original) return;
                              if (item.quantite >= original.stock_actuel) {
                                setGlobalError(`Attention: Pas assez d'unités de "${item.nom}" en stock.`);
                                return;
                              }
                              addToBasket(original);
                            }}
                            className="w-8 h-8 bg-slate-200 hover:bg-slate-300 text-slate-850 border border-slate-350 rounded flex items-center justify-center text-sm font-black cursor-pointer transition select-none"
                          >
                            +
                          </button>
                          <button
                            id={`remove-basket-${item.id}`}
                            onClick={(e) => { e.stopPropagation(); playBeep(650, 0.05); removeBasketItem(item.id); }}
                            className="text-red-700 hover:text-red-900 border border-red-300 bg-red-50 hover:bg-red-100 p-1.5 rounded cursor-pointer transition shrink-0"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* totals info and checkout trigger */}
              <div className="p-4 border-t border-slate-350 bg-slate-100">
                <div className="flex justify-between font-black text-xs text-slate-600 mb-1 tracking-wider uppercase">
                  <span>TOTAL NET (TTC)</span>
                  <span className="font-mono text-emerald-800 text-base font-black">{totalCartValue.toFixed(3)} DT</span>
                </div>
                <div className="text-[8px] text-slate-500 font-mono mb-3 font-bold uppercase tracking-wider">
                  *TVA standard incluse (Tunisie)
                </div>

                <button
                  id="checkout-trigger-btn"
                  onClick={() => { playBeep(650, 0.05); handleCheckout(); }}
                  disabled={basket.length === 0 || processingCheckout}
                  className="w-full bg-slate-805 hover:bg-slate-905 text-white font-black text-xs py-3 rounded flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer text-center uppercase tracking-wider shadow-sm border border-slate-900"
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
                    onClick={() => { playBeep(650, 0.05); setShownTransaction(lastCompletedTx); }}
                    className="w-full mt-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-[9px] py-1 rounded flex items-center justify-center gap-1 cursor-pointer transition"
                  >
                    Imprimer dernier ticket (Sim)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tactile Control Keypad mirroring the POS reference model */}
          {activeTab === "caisse" && caisseView === "menu" && (
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
              isCaisseLocked={isCaisseLocked}
              onToggleLock={() => {
                if (isCaisseLocked) {
                  if (currentUser) {
                    setPinTargetUser(currentUser);
                    setPinSuccessAction({ type: "unlock", user: currentUser });
                  } else {
                    setGlobalError("Sélectionnez d'abord un vendeur pour déverrouiller.");
                    focusVendeurInput();
                  }
                } else {
                  setIsCaisseLocked(true);
                  setGlobalError("La caisse tactile a été verrouillée de sécurité.");
                }
              }}
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

      {/* Unified Security and Session Switch Modal (Tactile, PIN & RFID Sync) */}
      <UnifiedAuthModal
        isOpen={showUnifiedAuth}
        onClose={() => setShowUnifiedAuth(false)}
        allStaff={allStaff}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsCaisseLocked(false); // Valid login unlocks register
          setGlobalError("");
        }}
        onLogout={() => {
          setCurrentUser(null);
          clearBasket();
          setActiveTab("caisse");
          setGlobalError("Session déconnectée.");
        }}
        onGlobalErrorMsg={(msg) => setGlobalError(msg)}
      />

      {/* Security Pin Checking Overlay Prompt Modal */}
      {pinTargetUser && (
        <PinAuthModal
          isOpen={true}
          targetUser={pinTargetUser}
          onSuccess={() => {
            if (pinSuccessAction) {
              if (pinSuccessAction.type === "unlock") {
                setIsCaisseLocked(false);
                setGlobalError("");
              } else if (pinSuccessAction.type === "switch_user") {
                setCurrentUser(pinSuccessAction.user);
                setIsCaisseLocked(false); // Valid login unlocks the register
                setGlobalError("");
              }
            }
            setPinTargetUser(null);
            setPinSuccessAction(null);
          }}
          onClose={() => {
            setPinTargetUser(null);
            setPinSuccessAction(null);
          }}
        />
      )}

      {/* ── INTERFACE DE CAISSE IMMERSIVE FIGMA ── */}
      {activeTab === "caisse" && caisseView === "menu" && (
        <div className="fixed inset-0 z-45 bg-[#040c1a] flex overflow-hidden select-none" style={{ fontFamily: 'var(--font-pos)', color: 'var(--pos-text)' }}>
          {isCaisseLocked ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020713]/95 backdrop-blur-md text-center p-8 select-none" style={{ fontFamily: 'var(--font-pos)', color: 'var(--pos-text)' }}>
              <div className="mb-6 animate-bounce">
                <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <Lock className="w-10 h-10 text-amber-500" />
                </div>
              </div>

              <h2 className="text-lg font-sans font-extrabold tracking-widest text-[#00F5D4] uppercase leading-none mb-2">
                TERMINAL VERROUILLÉ
              </h2>
              <div className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-sm mb-6 inline-block">
                SÉCURITÉ DOUBLE ENCAISSEMENT ACTIVE
              </div>
              
              <p className="text-sm text-slate-300 max-w-sm mb-8 leading-relaxed font-sans font-medium">
                Saisissez le code PIN pour déverrouiller la session de l'opérateur en cours : <span className="text-white font-extrabold">{currentUser?.nom || "Non Connecté"}</span>.
              </p>

              <div className="flex flex-col gap-3.5 items-center w-full max-w-xs">
                <button
                  onClick={() => {
                    playBeep(650, 0.05);
                    if (currentUser) {
                      setPinTargetUser(currentUser);
                      setPinSuccessAction({ type: "unlock", user: currentUser });
                    } else {
                      setGlobalError("Sélectionnez d'abord un vendeur ou badgez.");
                      setShowRfidSimulator(true);
                    }
                  }}
                  className="w-full bg-[#00F5D4] text-slate-950 font-extrabold text-xs py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 shadow-[0_0_15px_rgba(0,245,212,0.35)]"
                >
                  <Unlock className="w-4 h-4 shrink-0" />
                  <span>SAISIR MON CODE PIN</span>
                </button>
                
                <button
                  onClick={() => { playBeep(650, 0.05); setShowRfidSimulator(true); }}
                  className="w-full bg-slate-905 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>BADGER UN AUTRE OPÉRATEUR</span>
                </button>
              </div>

              <div className="mt-12 text-[8px] font-mono font-bold text-slate-600 uppercase tracking-widest">
                MAAZIM SECURE POS-3000 // OPERATOR LOCK
              </div>
            </div>
          ) : (
            <>
              <POSSidebar
                activeCategory={figmaCategory}
                onCategoryChange={(cat) => { playBeep(650, 0.05); setFigmaCategory(cat); }}
                currentTime={currentTime}
                currentUser={currentUser}
                onSelectUserTrigger={() => { playBeep(650, 0.05); setShowRfidSimulator(true); }}
                onLock={() => { playBeep(650, 0.05); setIsCaisseLocked(true); }}
                categories={categories}
                onOpenCatalog={() => { playBeep(650, 0.05); setShowCatalogModal(true); }}
                onOpenJournal={() => { playBeep(650, 0.05); setShowJournalModal(true); }}
              />
              <POSProductGrid
                products={products.map(mapMenuItemToProduct)}
                activeCategory={figmaCategory}
                numpadBuffer={figmaNumpadBuffer}
                onAddProduct={handleAddProductFigma}
                currentUser={currentUser}
                categories={categories}
                onOpenAddProduct={() => { playBeep(650, 0.05); setShowAddProductModal(true); }}
              />
              <POSFinancialPanel
                cartItems={mappedCartItems}
                total={totalCartValue}
                numpadBuffer={figmaNumpadBuffer}
                onNumpad={handleNumpadFigma}
                onRemoveItem={(id) => { playBeep(650, 0.05); removeBasketItem(id); }}
                onClear={() => { playBeep(650, 0.05); clearBasket(); }}
                onCheckout={() => { playBeep(650, 0.05); setShowFigmaPayment(true); }}
                articlesVendus={transactions.reduce((sum, tx) => sum + (tx.items?.reduce((s, i) => s + i.quantite, 0) || 0), 0)}
                transactions={transactions}
                activeTableNo={TABLES_LIST.find(t => t.id === selectedTableId)?.nom}
                tables={TABLES_LIST}
                activeTableId={selectedTableId}
                onSelectTable={(id) => { playBeep(650, 0.05); setSelectedTableId(id); }}
                getTableTotal={getTableTotal}
              />

              <FigmaPaymentDialog
                open={showFigmaPayment}
                onClose={() => { playBeep(650, 0.05); setShowFigmaPayment(false); }}
                total={totalCartValue}
                onPaymentComplete={handlePaymentCompleteFigma}
              />

              <CatalogModal
                open={showCatalogModal}
                onClose={() => { playBeep(650, 0.05); setShowCatalogModal(false); }}
                categories={categories}
                onAddCategory={async (nom) => { await createNewCategory(nom); }}
                onEditCategory={async (id, nom) => { await editCategoryInDb(id, nom); }}
                onDeleteCategory={async (id) => { await deleteCategoryFromDb(id); }}
              />

              <JournalModal
                open={showJournalModal}
                onClose={() => { playBeep(650, 0.05); setShowJournalModal(false); }}
                transactions={transactions}
                tables={TABLES_LIST}
              />

              <AddProductModal
                isOpen={showAddProductModal}
                onClose={() => { playBeep(650, 0.05); setShowAddProductModal(false); }}
                activeCategory={figmaCategory}
                categories={categories}
                onSubmit={handleCreateProductContextual}
              />
            </>
          )}
        </div>
      )}

    </div>
  );
}
