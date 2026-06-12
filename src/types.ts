export type UserRole = "admin" | "gerant" | "serveur";

export interface TeaRoomUser {
  uid: string;
  nom: string;
  email: string;
  rfid_token: string;
  role: UserRole;
  pin_code?: string; // Secure 4-digit PIN for touch console role switches
}

export interface MenuItem {
  id: string;
  nom: string;
  prix: number;
  stock_actuel: number;
  stock_alerte: number;
  categorie: string;
  description: string;
  image_url?: string;
}

export interface BasketItem {
  id: string;
  nom: string;
  prix: number;
  quantite: number;
}

export interface CategoryItem {
  id: string;
  nom: string;
}

export interface HomeSettings {
  id: string;
  salonName: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  announcement: string;
  showAnnouncement: boolean;
  logoUrl?: string;
}

export interface TransactionItem {
  product_id: string;
  product_nom: string;
  prix_unitaire: number;
  quantite: number;
}

export interface TransactionRecord {
  id: string;
  timestamp: number;
  total: number;
  user_id: string;
  user_nom: string;
  rfid_token: string;
  type: "vente" | "achat" | "reajustement";
  status: string;
  items: TransactionItem[];
}

export interface InventoryLogItem {
  id: string;
  product_id: string;
  product_nom: string;
  quantite_ajoutee: number;
  date: string;
  user_id: string;
  user_nom: string;
  action: "reassort" | "vente" | "ajustement";
}

export const PRODUCT_CATEGORIES = [
  "Thés Verts",
  "Thés Noirs",
  "Thés Bleus & Oolong",
  "Matcha & Lattés",
  "Infusions & Rooibos",
  "Pâtisseries Fines",
  "Services & Accessoires"
] as const;
