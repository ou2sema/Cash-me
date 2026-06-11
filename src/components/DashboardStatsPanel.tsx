import React from "react";
import { MenuItem, TeaRoomUser, TransactionRecord, InventoryLogItem } from "../types";
import { 
  DollarSign, 
  Landmark, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCcw, 
  FileText, 
  Activity, 
  Printer, 
  X, 
  Smartphone, 
  Calendar, 
  Users 
} from "lucide-react";

interface DashboardStatsPanelProps {
  transactions: TransactionRecord[];
  products: MenuItem[];
  logs: InventoryLogItem[];
  currentUser: TeaRoomUser | null;
  allStaff?: TeaRoomUser[];
  onSelectUser?: (user: TeaRoomUser | null) => void;
}

export default function DashboardStatsPanel({
  transactions,
  products,
  logs,
  currentUser,
  allStaff = [],
  onSelectUser
}: DashboardStatsPanelProps) {

  const isAuthorized = currentUser && (currentUser.role === "admin" || currentUser.role === "gerant");

  if (!isAuthorized) {
    return (
      <div id="unauthorized-stats-container" className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-800 shadow-sm max-w-xl mx-auto">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="font-display font-bold text-lg text-[#2D3A30] mb-2">Rapports Financiers Réservés</h3>
        <p className="text-slate-500 max-w-sm mx-auto text-xs leading-relaxed mb-4">
          La consultation des chiffres d'affaires de la caisse, des marges, de la traçabilité et des rapports analytiques requiert un privilège Administrateur ou Gérant.
        </p>
        <span className="inline-block text-[11px] font-mono select-all bg-[#F1F3EE] border border-slate-200 text-slate-650 px-3 py-1 rounded mb-6">
          Rôle actuel : {currentUser ? currentUser.role.toUpperCase() : "INVITÉ"}
        </span>

        {allStaff.length > 0 && onSelectUser && (
          <div className="border-t border-slate-100 pt-6 mt-2">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">
              🔋 Badger en un clic pour tester :
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-md mx-auto">
              {allStaff.map((staff) => (
                <button
                  id={`stats-quick-badge-${staff.uid}`}
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

  // Date Filtering State
  const [dateFilter, setDateFilter] = React.useState<"today" | "7days" | "30days" | "all">("all");
  const [showPrintModal, setShowPrintModal] = React.useState(false);

  // Filter transactions in real-time based on selected pill-filter
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      if (dateFilter === "all") return true;
      const tDate = new Date(t.timestamp);
      const now = new Date();
      if (dateFilter === "today") {
        return tDate.getDate() === now.getDate() &&
               tDate.getMonth() === now.getMonth() &&
               tDate.getFullYear() === now.getFullYear();
      } else if (dateFilter === "7days") {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return t.timestamp >= sevenDaysAgo;
      } else if (dateFilter === "30days") {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return t.timestamp >= thirtyDaysAgo;
      }
      return true;
    });
  }, [transactions, dateFilter]);

  // Calculate stats metrics on filtered records
  const totalRevenue = React.useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  }, [filteredTransactions]);

  const totalCount = filteredTransactions.length;
  const averageTicket = totalCount > 0 ? totalRevenue / totalCount : 0;
  
  // Track critical stock alert count (computed globally for real-time inventory management)
  const itemsInAlert = React.useMemo(() => {
    return products.filter(p => p.stock_actuel <= p.stock_alerte);
  }, [products]);

  // Group sales by category using active filtered transactions
  const categorySalesRecord = React.useMemo(() => {
    const record: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      tx.items.forEach(it => {
        const prod = products.find(p => p.id === it.product_id);
        const cat = prod ? prod.categorie : "Inconnu";
        const salesVal = it.prix_unitaire * it.quantite;
        record[cat] = (record[cat] || 0) + salesVal;
      });
    });
    return record;
  }, [filteredTransactions, products]);

  const categorySorted = React.useMemo(() => {
    return (Object.entries(categorySalesRecord) as [string, number][]).sort((a, b) => b[1] - a[1]);
  }, [categorySalesRecord]);

  const highestCategoryVal = React.useMemo(() => {
    return categorySorted.length > 0 ? categorySorted[0][1] : 1;
  }, [categorySorted]);

  // Interface definition for single payment method data
  interface PaymentDetail {
    label: string;
    total: number;
    count: number;
  }

  type PaymentKey = "especes" | "carte" | "tnd_pay" | "cheque" | "autres";

  // Compute breakdown metrics by payment methods
  const paymentBreakdown = React.useMemo<Record<PaymentKey, PaymentDetail>>(() => {
    const breakdown: Record<PaymentKey, PaymentDetail> = {
      especes: { label: "Espèces (CASH)", total: 0, count: 0 },
      carte: { label: "Carte / Monétique", total: 0, count: 0 },
      tnd_pay: { label: "Wallet D-Dinar", total: 0, count: 0 },
      cheque: { label: "Chèque BT", total: 0, count: 0 },
      autres: { label: "Autres / Inconnu", total: 0, count: 0 }
    };

    filteredTransactions.forEach(t => {
      const statusLower = (t.status || "").toLowerCase();
      if (statusLower.includes("especes") || statusLower.includes("cash") || statusLower.includes("espèce")) {
        breakdown.especes.total += t.total;
        breakdown.especes.count += 1;
      } else if (statusLower.includes("carte") || statusLower.includes("card") || statusLower.includes("tpe")) {
        breakdown.carte.total += t.total;
        breakdown.carte.count += 1;
      } else if (statusLower.includes("tnd_pay") || statusLower.includes("dinar") || statusLower.includes("wallet")) {
        breakdown.tnd_pay.total += t.total;
        breakdown.tnd_pay.count += 1;
      } else if (statusLower.includes("cheque") || statusLower.includes("chèque")) {
        breakdown.cheque.total += t.total;
        breakdown.cheque.count += 1;
      } else {
        breakdown.autres.total += t.total;
        breakdown.autres.count += 1;
      }
    });

    return breakdown;
  }, [filteredTransactions]);

  // Compute maximum payment volume safely using explicit object values (strict type safety)
  const maxPaymentVolume = React.useMemo(() => {
    return Math.max(
      paymentBreakdown.especes.total,
      paymentBreakdown.carte.total,
      paymentBreakdown.tnd_pay.total,
      paymentBreakdown.cheque.total,
      paymentBreakdown.autres.total,
      1
    );
  }, [paymentBreakdown]);

  // List of payment keys to map over
  const paymentKeys = ["especes", "carte", "tnd_pay", "cheque", "autres"] as const;

  // Interface for staff performance rank structure
  interface StaffDetail {
    nom: string;
    total: number;
    count: number;
    average: number;
  }

  // Compute Leaderboard ranking of operator team staff
  const staffPerformance = React.useMemo<StaffDetail[]>(() => {
    const perf: Record<string, StaffDetail> = {};
    filteredTransactions.forEach(t => {
      const uId = t.user_id || "vendeur_inconnu";
      const uName = t.user_nom || "Vendeur Inconnu";
      if (!perf[uId]) {
        perf[uId] = { nom: uName, total: 0, count: 0, average: 0 };
      }
      perf[uId].total += t.total;
      perf[uId].count += 1;
    });

    Object.keys(perf).forEach(key => {
      perf[key].average = perf[key].count > 0 ? perf[key].total / perf[key].count : 0;
    });

    return Object.values(perf).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  interface ProductSaleDetail {
    id: string;
    nom: string;
    qty: number;
    total: number;
    category: string;
  }

  // Extract Top 5 Bestsellers products
  const bestSellers = React.useMemo<ProductSaleDetail[]>(() => {
    const productsSales: Record<string, ProductSaleDetail> = {};
    filteredTransactions.forEach(t => {
      t.items.forEach(it => {
        const pId = it.product_id;
        const pNom = it.product_nom;
        if (!productsSales[pId]) {
          const matchedProd = products.find(p => p.id === pId);
          productsSales[pId] = { 
            id: pId, 
            nom: pNom, 
            qty: 0, 
            total: 0, 
            category: matchedProd ? matchedProd.categorie : "Thé" 
          };
        }
        productsSales[pId].qty += it.quantite;
        productsSales[pId].total += (it.prix_unitaire * it.quantite);
      });
    });

    return Object.values(productsSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredTransactions, products]);

  // Print execution call
  const handlePrintAction = () => {
    window.print();
  };

  return (
    <div id="dashboard-statistics-main" className="space-y-6 text-slate-800 pb-8">
      
      {/* Global CSS injected style for printing only our formatted POS panel */}
      <style>{`
        @media print {
          /* Hide normal screen items */
          body * {
            visibility: hidden !important;
          }
          /* Show print zone */
          #printable-report, #printable-report * {
            visibility: visible !important;
          }
          #printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 10px !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Visual Report Controls & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div>
          <h3 className="font-display font-black text-sm text-[#2D3A30] uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#8BA888]" />
            Analyses & Rapports Financiers
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Sélectionnez la période pour auditer le volume des tickets et imprimer la clôture de caisse.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 select-none">
            {(["today", "7days", "30days", "all"] as const).map((filter) => {
              const label = 
                filter === "today" ? "Aujourd'hui" :
                filter === "7days" ? "7 Jours" :
                filter === "30days" ? "30 Jours" : "Tout l'historique";
              return (
                <button
                  id={`stats-filter-${filter}`}
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                    dateFilter === filter
                      ? "bg-[#2D3A30] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label === "Tout l'historique" ? "Tout" : label}
                </button>
              );
            })}
          </div>

          {/* Print button trigger */}
          <button
            id="print-financial-report-btn"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl cursor-pointer transition border border-emerald-600 shadow-sm transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer Rapport (POS)</span>
          </button>
        </div>
      </div>

      {/* Dynamic numerical stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Chiffre d'Affaires */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Chiffre d'Affaires</span>
            <h3 className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{totalRevenue.toFixed(3)} DT</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Total ventes de la période</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-2.5 rounded-xl">
            <Landmark className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Transactions de caisse */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Tickets Validés</span>
            <h3 className="text-xl font-bold font-mono text-amber-700 mt-0.5">{totalCount}</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Transactions thermiques émises</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 text-amber-700 p-2.5 rounded-xl">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Panier Moyen */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Panier Moyen</span>
            <h3 className="text-xl font-bold font-mono text-indigo-700 mt-0.5">{averageTicket.toFixed(3)} DT</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Dépense moyenne par visite</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-2.5 rounded-xl">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Alerte de Stock */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Seuil Approvisionnement</span>
            <h3 className={`text-xl font-bold font-mono mt-0.5 ${itemsInAlert.length > 0 ? "text-rose-700 animate-pulse" : "text-[#2D3A30]"}`}>
              {itemsInAlert.length}
            </h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Produits sous seuil critique</p>
          </div>
          <div className={`p-2.5 rounded-xl ${itemsInAlert.length > 0 ? "bg-rose-50 border border-rose-100 text-rose-700" : "bg-slate-50 border border-slate-100 text-slate-400"}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Sales by Category chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#2D3A30]">
              Répartition des Ventes par Catégories
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">En direct du comptoir</span>
          </div>
          
          {categorySorted.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Aucune vente enregistrée pour cette période.
            </div>
          ) : (
            <div className="space-y-4">
              {categorySorted.map(([category, amount]) => {
                const percentage = (amount / highestCategoryVal) * 100;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-700">{category}</span>
                      <span className="font-mono text-[#2D3A30]">{amount.toFixed(3)} DT</span>
                    </div>
                    <div className="w-full bg-[#F1F3EE] rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#8BA888] to-[#607D5D] h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bestsellers Side Column Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#2D3A30] border-b border-slate-100 pb-3 mb-3">
              Top 5 Articles les Plus Vendus
            </h4>

            {bestSellers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Aucune vente constatée sur cette période.
              </div>
            ) : (
              <div className="space-y-4">
                {bestSellers.map((item, index) => {
                  const maxQty = bestSellers.length > 0 ? bestSellers[0].qty : 1;
                  const pct = (item.qty / maxQty) * 100;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 truncate pr-2 flex items-center gap-1.5 max-w-[150px]">
                          <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-[#2D3A30] shrink-0">
                            {index + 1}
                          </span>
                          {item.nom}
                        </span>
                        <span className="font-mono text-[11px] text-slate-650 shrink-0 font-bold">
                          {item.qty} u. • <strong className="text-[#2D3A30] font-bold">{item.total.toFixed(3)} DT</strong>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-amber-500 h-1.5 rounded-full" 
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid Row: Modes de paiement & staff performance leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payment Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#2D3A30] flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              Répartition par Mode d'Encaissement
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Validation en caisse</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paymentKeys.map((key) => {
              const item = paymentBreakdown[key];
              const pct = (item.total / maxPaymentVolume) * 100;

              return (
                <div key={key} className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{item.label}</span>
                    <span className="text-[9px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      {item.count} dmd
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Recettes</span>
                      <span className="font-mono text-sm font-black text-slate-900">{item.total.toFixed(3)} DT</span>
                    </div>
                    <div className="w-full bg-white border border-slate-250 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-2 rounded-full ${
                          key === "especes" ? "bg-emerald-600" :
                          key === "carte" ? "bg-amber-600" :
                          key === "tnd_pay" ? "bg-indigo-650" :
                          key === "cheque" ? "bg-teal-600" : "bg-slate-400"
                        }`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff performance card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#2D3A30] flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Volume par Vendeur
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Classement</span>
          </div>

          {staffPerformance.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Aucun badge enregistré sur cette période.
            </div>
          ) : (
            <div className="space-y-2.5">
              {staffPerformance.map((item, idx) => (
                <div key={item.nom} className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="text-[10px]">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "👤"}</span>
                      {item.nom}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Moyenne: {item.average.toFixed(3)} DT</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-[#2D3A30] block">{item.total.toFixed(3)} DT</span>
                    <span className="text-[9px] text-slate-400 block font-semibold">{item.count} vente{item.count > 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Row 3: Stock Priorities list and audit traceability log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Stock alerts column */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#2D3A30] border-b border-slate-100 pb-3 mb-3">
            Priorités Ravitaillement
          </h4>

          {itemsInAlert.length === 0 ? (
            <div className="text-center py-8 text-[#8BA888] text-xs font-bold leading-relaxed">
              Tous les stocks sont optimaux ! 👍
            </div>
          ) : (
            <div className="space-y-3">
              {itemsInAlert.map(p => (
                <div key={p.id} className="bg-[#F9FAF8] border border-slate-100 p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#2D3A30]">{p.nom}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{p.categorie}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-rose-750 font-bold block bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">{p.stock_actuel} {p.stock_actuel > 1 ? 'unités' : 'unité'} restante{p.stock_actuel > 1 ? 's' : ''}</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block">Alerte: {p.stock_alerte}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grid: Audit Log history trace */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8BA888]" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#2D3A30]">
                Registre de Traçabilité des Mouvements (Caisse & Stock)
              </h4>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">Dernières 50 modifications</span>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {logs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Aucune activité détectée pour l'instant dans le registre d'inventaire.
              </div>
            ) : (
              logs.map(log => {
                const num = log.quantite_ajoutee;
                const isGain = num > 0;
                return (
                  <div key={log.id} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 ${
                        log.action === "vente" 
                          ? "bg-rose-50 text-rose-700" 
                          : "bg-[#F1F3EE] text-[#2D3A30]"
                      }`}>
                        {isGain ? `+${num}` : num}
                      </div>
                      <div>
                        <span className="font-bold text-[#2D3A30]">{log.product_nom}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Badge de: <span className="text-[#2D3A30] font-semibold">{log.user_nom}</span> • Action: <span className="capitalize text-slate-600 underline font-medium">{log.action}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(log.date).toLocaleString("fr-FR")}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* POS Ticket / Clôture Report Print Preview Modal */}
      {showPrintModal && (
        <div id="print-modal-overlay" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-xl border border-slate-750">
            
            {/* Modal Header Actions */}
            <div className="flex items-center justify-between p-4 border-b border-slate-850 bg-slate-850">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-450 animate-pulse" />
                <span className="text-xs uppercase font-black tracking-wider text-slate-100">Bilan de Caisse POS (Ticket / Clôture Z)</span>
              </div>
              <button 
                id="close-print-modal-btn"
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable POS Roller */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950 flex justify-center">
              {/* This id matches the CSS Visibility Selector in print styles to ONLY print this wrapper */}
              <div 
                id="printable-report" 
                className="bg-white text-slate-900 p-8 shadow-inner w-full max-w-sm rounded-lg"
                style={{ fontFamily: "'JetBrains Mono', Courier, monospace", fontSize: "12px" }}
              >
                <div className="text-center font-bold">
                  <h2 className="text-sm tracking-widest uppercase border-b-2 border-slate-900 pb-1 font-black mb-1">
                    ☕ TACTILE TEA CAISSE
                  </h2>
                  <p className="text-[10px] uppercase font-bold text-slate-600 mb-3">BILAN DE CLOSING DE CAISSE</p>
                  <p className="text-[11px] font-bold">RAPPORT DE FERMETURE (CLÔTURE Z)</p>
                  <div className="border-t border-dashed border-slate-400 my-2"></div>
                </div>

                {/* Metadata */}
                <div className="space-y-1 font-bold text-[11px] mb-4">
                  <div className="flex justify-between">
                    <span>DATE :</span>
                    <span>{new Date().toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HEURE :</span>
                    <span>{new Date().toLocaleTimeString("fr-FR")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OPÉRATEUR :</span>
                    <span className="uppercase">{currentUser ? currentUser.nom : "ADMINISTRATEUR"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ROLES :</span>
                    <span className="uppercase">{currentUser ? currentUser.role : "ADMIN"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PÉRIODE :</span>
                    <span className="uppercase text-emerald-800 font-extrabold">
                      {dateFilter === "today" ? "Aujourd'hui" :
                       dateFilter === "7days" ? "7 derniers jours" :
                       dateFilter === "30days" ? "30 derniers jours" : "Tout l'historique"}
                    </span>
                  </div>
                </div>

                <div className="border-t-2 border-dashed border-slate-900 my-3"></div>

                {/* Synthesis metrics */}
                <div className="space-y-1.5 font-bold mb-4">
                  <div className="flex justify-between text-xs font-black">
                    <span>CHIFFRE D'AFFAIRES (CA TTC) :</span>
                    <span className="text-emerald-800">{totalRevenue.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>NOMBRE DE TICKETS :</span>
                    <span>{totalCount}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>PANIER MOYEN :</span>
                    <span>{averageTicket.toFixed(3)} DT</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-700 my-2"></div>

                {/* Payment method breakdown */}
                <div className="mb-4">
                  <p className="font-black text-[11px] border-b border-slate-950 pb-0.5 uppercase mb-2">Modes d'Encaissement</p>
                  <div className="space-y-1.5 text-[11px]">
                    {paymentKeys.map((key) => {
                      const item = paymentBreakdown[key];
                      if (item.count === 0 && item.total === 0) return null;
                      return (
                        <div key={key} className="flex justify-between">
                          <span>{item.label} ({item.count} v.) :</span>
                          <span className="font-bold">{item.total.toFixed(3)} DT</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-700 my-2"></div>

                {/* Category splits */}
                {categorySorted.length > 0 && (
                  <div className="mb-4">
                    <p className="font-black text-[11px] border-b border-slate-950 pb-0.5 uppercase mb-2">Ventes par Catégorie</p>
                    <div className="space-y-1 text-[11px]">
                      {categorySorted.map(([category, amount]) => (
                        <div key={category} className="flex justify-between">
                          <span className="truncate max-w-[180px]">{category} :</span>
                          <span>{amount.toFixed(3)} DT</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-700 my-2"></div>

                {/* Staff stats */}
                {staffPerformance.length > 0 && (
                  <div className="mb-4">
                    <p className="font-black text-[11px] border-b border-slate-950 pb-0.5 uppercase mb-2">Performance Vendeurs</p>
                    <div className="space-y-1 text-[11px]">
                      {staffPerformance.map(staff => (
                        <div key={staff.nom} className="flex justify-between">
                          <span className="truncate max-w-[150px] uppercase">{staff.nom} :</span>
                          <span>{staff.total.toFixed(3)} DT ({staff.count} v.)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-700 my-2"></div>

                {/* Best sellers */}
                {bestSellers.length > 0 && (
                  <div className="mb-6">
                    <p className="font-black text-[11px] border-b border-slate-950 pb-0.5 uppercase mb-2">Top 5 Articles Vendus</p>
                    <div className="space-y-1.5 text-[11px]">
                      {bestSellers.map((prod, idx) => (
                        <div key={prod.id} className="flex justify-between">
                          <span className="truncate max-w-[180px]">{idx + 1}. {prod.nom} :</span>
                          <span>{prod.qty} u. ({prod.total.toFixed(3)} DT)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-900 my-4"></div>

                {/* Approvals signatures */}
                <div className="space-y-6 pt-2 text-[10px] font-bold">
                  <div className="flex justify-between">
                    <span>SIGNATURE DU GERANT :</span>
                    <span>VISA DIRECTEUR :</span>
                  </div>
                  <div className="pt-4 text-center text-[9px] text-slate-500 uppercase italic">
                    ** FIN DU RAPPORT DE FERMETURE **
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-end gap-3">
              <button 
                id="cancel-print-modal-btn"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 text-xs font-bold cursor-pointer transition animate-none"
              >
                Annuler
              </button>
              <button 
                id="execute-print-modal-btn"
                onClick={handlePrintAction}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl cursor-pointer transition shadow-lg shrink-0 transform active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Lancer l'Impression</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
