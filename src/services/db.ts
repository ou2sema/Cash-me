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
  limit
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { MenuItem, TeaRoomUser, TransactionRecord, BasketItem, InventoryLogItem, CategoryItem, HomeSettings } from "../types";

// Static Seed Data
const INITIAL_PRODUCTS: Omit<MenuItem, "id">[] = [
  {
    nom: "Sencha Impérial",
    prix: 5.5,
    stock_actuel: 45,
    stock_alerte: 10,
    categorie: "Thés Verts",
    description: "Thé vert classique japonais aux notes fraîches et herbacées, riche en antioxydants."
  },
  {
    nom: "Matcha de Cérémonie Uji",
    prix: 8.0,
    stock_actuel: 12,
    stock_alerte: 5,
    categorie: "Matcha & Lattés",
    description: "Poudre de matcha premium d'Uji battue traditionnellement à la main. Texture crémeuse."
  },
  {
    nom: "Darjeeling d'Automne Extra",
    prix: 6.2,
    stock_actuel: 30,
    stock_alerte: 8,
    categorie: "Thés Noirs",
    description: "Thé noir d'exception des contreforts de l'Himalaya, liqueur ambrée et bouquet muscaté."
  },
  {
    nom: "Oolong Fleur d'Oranger",
    prix: 6.5,
    stock_actuel: 18,
    stock_alerte: 5,
    categorie: "Thés Bleus & Oolong",
    description: "Oolong semi-oxydé de Taïwan délicatement parsemé de pétales de néroli apaisants."
  },
  {
    nom: "Rooibos Vanille de Madagascar",
    prix: 4.8,
    stock_actuel: 25,
    stock_alerte: 8,
    categorie: "Infusions & Rooibos",
    description: "Infusion douce et naturellement sans théine, mariée à la gousse de vanille Bourbon parfumée."
  },
  {
    nom: "Mochi Artisanal Matcha-Haricot",
    prix: 3.5,
    stock_actuel: 8,
    stock_alerte: 10, // Stock alerte higher to show notifications
    categorie: "Pâtisseries Fines",
    description: "Pâtisserie traditionnelle japonaise à base de riz gluant, fourrée d'une pâte d'azuki douce."
  },
  {
    nom: "Financier Grillé au Sésame Noir",
    prix: 4.0,
    stock_actuel: 15,
    stock_alerte: 6,
    categorie: "Pâtisseries Fines",
    description: "Gâteau moelleux aux amandes sublimé par le goût toasté, intense et rustique du sésame noir."
  },
  {
    nom: "Fouet Matcha 'Chasen'",
    prix: 18.0,
    stock_actuel: 5,
    stock_alerte: 2,
    categorie: "Services & Accessoires",
    description: "Fouet traditionnel à matcha de 80 brins, taillé à la main dans une seule pièce de bambou."
  },
];

const DEFAULT_STAFF: TeaRoomUser[] = [
  {
    uid: "serveur_alice_uid",
    nom: "Alice (Serveuse)",
    email: "alice@salondethe.com",
    rfid_token: "RFID_ALICE_99",
    role: "serveur"
  },
  {
    uid: "gerant_bob_uid",
    nom: "Bob (Gérant)",
    email: "bob@salondethe.com",
    rfid_token: "RFID_BOB_88",
    role: "gerant"
  },
  {
    uid: "admin_clara_uid",
    nom: "Clara (Directrice)",
    email: "clara@salondethe.com",
    rfid_token: "RFID_CLARA_77",
    role: "admin"
  }
];

const INITIAL_CATEGORIES = [
  "Thés Verts",
  "Thés Noirs",
  "Thés Bleus & Oolong",
  "Matcha & Lattés",
  "Infusions & Rooibos",
  "Pâtisseries Fines",
  "Services & Accessoires"
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

// BATCH TRANSACTION FLOW (Checkout cart, decrement stock counts in batch, audit trace logs)
export async function checkoutBasket(
  basket: BasketItem[],
  total: number,
  currentUser: TeaRoomUser
): Promise<string> {
  const batch = writeBatch(db);
  const txId = `tx_${Date.now()}`;
  
  // 1. Validate Basket Length
  if (basket.length === 0) {
    throw new Error("Le panier est vide.");
  }
  
  // 2. Map items
  const items = basket.map(item => ({
    product_id: item.id,
    product_nom: item.nom,
    prix_unitaire: item.prix,
    quantite: item.quantite
  }));
  
  // 3. Prepare Transaction Documents
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
  batch.set(txDocRef, txRecord);
  
  // 4. Update stocks and create individual inventory logs
  for (const item of basket) {
    const prodDocRef = doc(db, "products", item.id);
    // atomic decrement
    batch.update(prodDocRef, {
      stock_actuel: increment(-item.quantite)
    });
    
    // audit inventory trace log
    const logId = `log_${Date.now()}_${item.id}`;
    const logDocRef = doc(db, "inventory_logs", logId);
    const logRecord: InventoryLogItem = {
      id: logId,
      product_id: item.id,
      product_nom: item.nom,
      quantite_ajoutee: -item.quantite,
      date: new Date().toISOString(),
      user_id: currentUser.uid,
      user_nom: currentUser.nom,
      action: "vente"
    };
    batch.set(logDocRef, logRecord);
  }
  
  try {
    await batch.commit();
    return txId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "transactions & stock updates");
    throw error;
  }
}

// CANCEL TRANSACTION & STOCK RESTORATION
export async function cancelTransaction(
  transaction: TransactionRecord,
  authorizedBy: TeaRoomUser
): Promise<void> {
  const batch = writeBatch(db);
  const txRef = doc(db, "transactions", transaction.id);
  
  // 1. Update status to 'annulé' and log cancellation details
  batch.update(txRef, {
    status: "annulé",
    cancelled_by_id: authorizedBy.uid,
    cancelled_by_nom: authorizedBy.nom,
    cancelled_timestamp: Date.now()
  });

  // 2. Replenish product stocks & log positive inventory changes
  for (const item of transaction.items) {
    const prodDocRef = doc(db, "products", item.product_id);
    batch.update(prodDocRef, {
      stock_actuel: increment(item.quantite)
    });

    const logId = `log_${Date.now()}_cancel_${item.product_id}`;
    const logDocRef = doc(db, "inventory_logs", logId);
    const logRecord: InventoryLogItem = {
      id: logId,
      product_id: item.product_id,
      product_nom: item.product_nom,
      quantite_ajoutee: item.quantite,
      date: new Date().toISOString(),
      user_id: authorizedBy.uid,
      user_nom: authorizedBy.nom,
      action: "ajustement"
    };
    batch.set(logDocRef, logRecord);
  }

  try {
    await batch.commit();
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
  const batch = writeBatch(db);
  
  // Fetch original first
  const prodDocRef = doc(db, "products", productId);
  const prodSnap = await getDoc(prodDocRef);
  if (!prodSnap.exists()) {
    throw new Error("Le produit spécifié n'existe pas.");
  }
  
  const existingProduct = prodSnap.data() as MenuItem;
  
  batch.update(prodDocRef, {
    stock_actuel: increment(addStock)
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
  batch.set(logDocRef, logRecord);
  
  try {
    await batch.commit();
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
