import { 
  collection, 
  onSnapshot, 
  doc, 
  writeBatch,
  setDoc, 
  addDoc, 
  getDocs, 
  getDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  increment,
  query,
  orderBy,
  limit,
  runTransaction
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { MenuItem, TeaRoomUser, TransactionRecord, BasketItem, InventoryLogItem, CategoryItem, HomeSettings } from "../types";

// Static Seed Data
const INITIAL_PRODUCTS: Omit<MenuItem, "id">[] = [
  {
    nom: "Thé Menthe",
    prix: 4.500,
    stock_actuel: 35,
    stock_alerte: 5,
    categorie: "Théière",
    description: "Thé vert traditionnel infusé à la menthe fraîche tunisienne et pignons."
  },
  {
    nom: "Chicha Classique",
    prix: 15.000,
    stock_actuel: 20,
    stock_alerte: 3,
    categorie: "Narguilé",
    description: "Narguilé traditionnel, charbon naturel, parfums au choix (Double Pomme, Menthe...)."
  },
  {
    nom: "Café Turc",
    prix: 3.500,
    stock_actuel: 28,
    stock_alerte: 5,
    categorie: "Théière",
    description: "Café de tradition cuit sur le sable chaud, parfumé à la cardamome ou la fleur d'oranger."
  },
  {
    nom: "Pâtisserie",
    prix: 6.000,
    stock_actuel: 15,
    stock_alerte: 4,
    categorie: "Cristal de Glace",
    description: "Pâtisserie fine tunisienne artisanale (Baklawa, Kaak Warka, Mlabes)."
  },
  {
    nom: "Chicha",
    prix: 12.000,
    stock_actuel: 12,
    stock_alerte: 2,
    categorie: "Narguilé",
    description: "Chicha standard parfum menthe-citron doux."
  },
  {
    nom: "Eau Minérale",
    prix: 2.000,
    stock_actuel: 50,
    stock_alerte: 10,
    categorie: "Cristal de Glace",
    description: "Eau minérale plate micro-filtrée et servie très fraîche."
  },
  {
    nom: "Menu Chaud",
    prix: 18.500,
    stock_actuel: 10,
    stock_alerte: 2,
    categorie: "Théière",
    description: "Formule dégustation chaude complète avec théières d'exception et assortiment."
  }
];

const DEFAULT_STAFF: TeaRoomUser[] = [
  {
    uid: "admin_maazim_uid",
    nom: "ADMIN MAAZIM",
    email: "admin@maazim.tn",
    rfid_token: "RFID_MAAZIM_00",
    role: "admin",
    pin_code: "1234"
  },
  {
    uid: "serveur_alice_uid",
    nom: "ALICE",
    email: "alice@maazim.tn",
    rfid_token: "RFID_ALICE_99",
    role: "serveur",
    pin_code: "1111"
  },
  {
    uid: "gerant_bob_uid",
    nom: "BOB",
    email: "bob@maazim.tn",
    rfid_token: "RFID_BOB_88",
    role: "gerant",
    pin_code: "2222"
  }
];

const INITIAL_CATEGORIES = [
  "Théière",
  "Cristal de Glace",
  "Narguilé"
];

// Seed databases if products collections are empty
export async function seedDatabaseIfEmpty() {
  const prodRef = collection(db, "products");
  const userRef = collection(db, "users");
  const catRef = collection(db, "categories");
  const settingsRef = doc(db, "settings", "home");
  
  try {
    const prodSnap = await getDocs(prodRef);
    if (prodSnap.empty) {
      console.log("Seeding products...");
      const batch = writeBatch(db);
      INITIAL_PRODUCTS.forEach((p, idx) => {
        const id = `prod_${idx + 1}`;
        batch.set(doc(db, "products", id), {
          id,
          ...p
        });
      });
      await batch.commit();
    }
    
    // Seed categories if empty
    const catSnap = await getDocs(catRef);
    if (catSnap.empty) {
      console.log("Seeding default categories...");
      const batch = writeBatch(db);
      INITIAL_CATEGORIES.forEach((catNom, idx) => {
        const id = `cat_${idx + 1}`;
        batch.set(doc(db, "categories", id), {
          id,
          nom: catNom
        });
      });
      await batch.commit();
    }

    // Seed settings if not exist
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      console.log("Seeding home settings...");
      await setDoc(settingsRef, {
        id: "home",
        salonName: "L'Heure du Thé",
        welcomeTitle: "Bienvenue à L'Heure du Thé",
        welcomeSubtitle: "Sélection de thés d'exception & pâtisseries artisanales",
        announcement: "Remise de 10% sur les pâtisseries fines pour toute commande !",
        showAnnouncement: true,
        logoUrl: ""
      });
    }
    
    const userSnap = await getDocs(userRef);
    if (userSnap.empty) {
      console.log("Seeding default staff users...");
      const batch = writeBatch(db);
      DEFAULT_STAFF.forEach((u) => {
        batch.set(doc(db, "users", u.uid), u);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error("Database seed failed (could be network or permission boundaries):", error);
  }
}

// REALTIME LISTENERS
export function listenProducts(onData: (prods: MenuItem[]) => void, onError: (err: Error) => void) {
  const path = "products";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const prods: MenuItem[] = [];
      snapshot.forEach((doc) => {
        prods.push(doc.data() as MenuItem);
      });
      onData(prods);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error as Error);
    }
  );
}

export function listenTransactions(onData: (txs: TransactionRecord[]) => void, onError: (err: Error) => void) {
  const path = "transactions";
  const q = query(collection(db, path), orderBy("timestamp", "desc"), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const txs: TransactionRecord[] = [];
      snapshot.forEach((doc) => {
        txs.push(doc.data() as TransactionRecord);
      });
      onData(txs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error as Error);
    }
  );
}

export function listenInventoryLogs(onData: (logs: InventoryLogItem[]) => void, onError: (err: Error) => void) {
  const path = "inventory_logs";
  const q = query(collection(db, path), orderBy("date", "desc"), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: InventoryLogItem[] = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data() as InventoryLogItem);
      });
      onData(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error as Error);
    }
  );
}

export function listenUsers(onData: (users: TeaRoomUser[]) => void, onError: (err: Error) => void) {
  const path = "users";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const ulist: TeaRoomUser[] = [];
      snapshot.forEach((doc) => {
        ulist.push(doc.data() as TeaRoomUser);
      });
      onData(ulist);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error as Error);
    }
  );
}

// BATCH TRANSACTION FLOW (Checkout cart, decrement stock counts in transaction, audit trace logs)
export async function checkoutBasket(
  basket: BasketItem[],
  total: number,
  currentUser: TeaRoomUser
): Promise<string> {
  // 1. Validate Basket Length
  if (basket.length === 0) {
    throw new Error("Le panier est vide.");
  }
  
  const txId = `tx_${Date.now()}`;
  
  try {
    await runTransaction(db, async (txn) => {
      // Read all products involved first to verify stock and fulfill Firestore read-before-write requirement
      const productsData: { ref: any; currentStock: number; id: string; nom: string }[] = [];
      for (const item of basket) {
        const prodDocRef = doc(db, "products", item.id);
        const prodSnap = await txn.get(prodDocRef);
        if (!prodSnap.exists()) {
          throw new Error(`Le produit "${item.nom}" n'existe pas.`);
        }
        const prodData = prodSnap.data() as MenuItem;
        const currentStock = prodData.stock_actuel ?? 0;
        if (currentStock < item.quantite) {
          throw new Error(`Stock insuffisant pour ${item.nom} : disponible ${currentStock}, requis ${item.quantite}`);
        }
        productsData.push({
          ref: prodDocRef,
          currentStock,
          id: item.id,
          nom: item.nom
        });
      }

      // Prepare items for transaction record
      const items = basket.map(item => ({
        product_id: item.id,
        product_nom: item.nom,
        prix_unitaire: item.prix,
        quantite: item.quantite
      }));

      // Prepare transaction record
      const txRecord: TransactionRecord = {
        id: txId,
        timestamp: Date.now(),
        total,
        user_id: currentUser.uid,
        user_nom: currentUser.nom,
        rfid_token: currentUser.rfid_token,
        type: "vente",
        status: "completed",
        items
      };

      const txDocRef = doc(db, "transactions", txId);
      txn.set(txDocRef, txRecord);

      // Update stocks and inventory logs
      for (const prod of productsData) {
        const item = basket.find(b => b.id === prod.id)!;
        txn.update(prod.ref, {
          stock_actuel: prod.currentStock - item.quantite
        });

        // Audit inventory trace log
        const logId = `log_${Date.now()}_${prod.id}`;
        const logDocRef = doc(db, "inventory_logs", logId);
        const logRecord: InventoryLogItem = {
          id: logId,
          product_id: prod.id,
          product_nom: prod.nom,
          quantite_ajoutee: -item.quantite,
          date: new Date().toISOString(),
          user_id: currentUser.uid,
          user_nom: currentUser.nom,
          action: "vente"
        };
        txn.set(logDocRef, logRecord);
      }
    });
    
    return txId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "transactions & stock updates via transaction");
    throw error;
  }
}

// CANCEL TRANSACTION & STOCK RESTORATION
export async function cancelTransaction(
  transaction: TransactionRecord,
  authorizedBy: TeaRoomUser
): Promise<void> {
  const txRef = doc(db, "transactions", transaction.id);
  
  try {
    await runTransaction(db, async (txn) => {
      const txSnap = await txn.get(txRef);
      if (!txSnap.exists()) {
        throw new Error("La transaction n'existe pas.");
      }
      if (txSnap.data()?.status === "annulé") {
        throw new Error("Cette transaction a déjà été annulée.");
      }

      // Read current products to safeguard correct starting values
      const productsData: { ref: any; currentStock: number; id: string; nom: string }[] = [];
      for (const item of transaction.items) {
        const prodDocRef = doc(db, "products", item.product_id);
        const prodSnap = await txn.get(prodDocRef);
        const currentStock = prodSnap.exists() ? (prodSnap.data() as MenuItem).stock_actuel ?? 0 : 0;
        productsData.push({
          ref: prodDocRef,
          currentStock,
          id: item.product_id,
          nom: item.product_nom
        });
      }

      // Update status to 'annulé' and log cancellation details
      txn.update(txRef, {
        status: "annulé",
        cancelled_by_id: authorizedBy.uid,
        cancelled_by_nom: authorizedBy.nom,
        cancelled_timestamp: Date.now()
      });

      // Replenish product stocks & log positive inventory changes
      for (const prod of productsData) {
        const item = transaction.items.find(i => i.product_id === prod.id)!;
        txn.update(prod.ref, {
          stock_actuel: prod.currentStock + item.quantite
        });

        const logId = `log_${Date.now()}_cancel_${prod.id}`;
        const logDocRef = doc(db, "inventory_logs", logId);
        const logRecord: InventoryLogItem = {
          id: logId,
          product_id: prod.id,
          product_nom: prod.nom,
          quantite_ajoutee: item.quantite,
          date: new Date().toISOString(),
          user_id: authorizedBy.uid,
          user_nom: authorizedBy.nom,
          action: "ajustement"
        };
        txn.set(logDocRef, logRecord);
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "cancel transaction");
    throw error;
  }
}

// INVENTORY MANAGEMENT FOR MANAGERS/ADMINS
export async function addOrRestockProduct(
  productId: string,
  addStock: number,
  currentUser: TeaRoomUser
): Promise<void> {
  const prodDocRef = doc(db, "products", productId);
  
  try {
    await runTransaction(db, async (txn) => {
      const prodSnap = await txn.get(prodDocRef);
      if (!prodSnap.exists()) {
        throw new Error("Le produit spécifié n'existe pas.");
      }
      
      const existingProduct = prodSnap.data() as MenuItem;
      const currentStock = existingProduct.stock_actuel ?? 0;
      
      txn.update(prodDocRef, {
        stock_actuel: currentStock + addStock
      });
      
      // log details
      const logId = `log_${Date.now()}_${productId}`;
      const logDocRef = doc(db, "inventory_logs", logId);
      const logRecord: InventoryLogItem = {
        id: logId,
        product_id: productId,
        product_nom: existingProduct.nom,
        quantite_ajoutee: addStock,
        date: new Date().toISOString(),
        user_id: currentUser.uid,
        user_nom: currentUser.nom,
        action: "reassort"
      };
      txn.set(logDocRef, logRecord);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "products restock");
    throw error;
  }
}

// CREATE NEW PRODUCT
export async function createNewProduct(
  newProd: Omit<MenuItem, "id">,
  currentUser: TeaRoomUser
): Promise<void> {
  const id = `prod_${Date.now()}`;
  const docRef = doc(db, "products", id);
  
  try {
    await setDoc(docRef, {
      id,
      ...newProd
    });
    
    // Log initial creation
    const logId = `log_${Date.now()}_${id}`;
    const logDocRef = doc(db, "inventory_logs", logId);
    const logRecord: InventoryLogItem = {
      id: logId,
      product_id: id,
      product_nom: newProd.nom,
      quantite_ajoutee: newProd.stock_actuel,
      date: new Date().toISOString(),
      user_id: currentUser.uid,
      user_nom: currentUser.nom,
      action: "reassort"
    };
    await setDoc(logDocRef, logRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "products create");
    throw error;
  }
}

// GENERAL EDIT PRODUCT INFORMATION
export async function editProductCatalog(
  updatedProduct: MenuItem,
  currentUser: TeaRoomUser
): Promise<void> {
  const docRef = doc(db, "products", updatedProduct.id);
  try {
    await setDoc(docRef, updatedProduct);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, "products edit");
    throw error;
  }
}

// UPSERT NEW STAFF PROFILE OR UPDATE PRIVILEGES
export async function registerOrUpdateStaff(
  userProfile: TeaRoomUser,
  currentUser: TeaRoomUser
): Promise<void> {
  const docRef = doc(db, "users", userProfile.uid);
  try {
    await setDoc(docRef, userProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "users register/update");
    throw error;
  }
}

// REALTIME LISTENERS EXTRA
export function listenCategories(onData: (cats: CategoryItem[]) => void, onError: (err: Error) => void) {
  const path = "categories";
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const cats: CategoryItem[] = [];
      snapshot.forEach((doc) => {
        cats.push(doc.data() as CategoryItem);
      });
      onData(cats);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error as Error);
    }
  );
}

export function listenHomeSettings(onData: (settings: HomeSettings) => void, onError: (err: Error) => void) {
  const path = "settings";
  return onSnapshot(
    doc(db, "settings", "home"),
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as HomeSettings);
      } else {
        onData({
          id: "home",
          salonName: "L'Heure du Thé",
          welcomeTitle: "Bienvenue à L'Heure du Thé",
          welcomeSubtitle: "Sélection de thés d'exception & pâtisseries artisanales",
          announcement: "Remise de 10% sur les pâtisseries fines pour toute commande !",
          showAnnouncement: true,
          logoUrl: ""
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      onError(error as Error);
    }
  );
}

// CRUD IN DB FOR CATEGORIES
export async function createNewCategory(nom: string): Promise<void> {
  const id = `cat_${Date.now()}`;
  const docRef = doc(db, "categories", id);
  try {
    await setDoc(docRef, { id, nom });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "categories create");
    throw err;
  }
}

export async function editCategoryInDb(id: string, newNom: string): Promise<void> {
  const docRef = doc(db, "categories", id);
  try {
    await updateDoc(docRef, { nom: newNom });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, "categories edit");
    throw err;
  }
}

export async function deleteCategoryFromDb(id: string): Promise<void> {
  const docRef = doc(db, "categories", id);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, "categories delete");
    throw err;
  }
}

// DELETE PRODUCT FROM MENU
export async function deleteProductFromDb(productId: string): Promise<void> {
  const docRef = doc(db, "products", productId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "products delete");
    throw error;
  }
}

export async function saveHomeSettings(settings: HomeSettings): Promise<void> {
  const docRef = doc(db, "settings", "home");
  try {
    await setDoc(docRef, settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "settings save");
    throw error;
  }
}
