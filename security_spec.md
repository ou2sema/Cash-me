# Security Specification for Salon de Thé Management App

## 1. Data Invariants

1. **User Identity & Roles**: Any write to `/users/{userId}` must verify that the `userId` matches the authenticated `request.auth.uid`. Field `role` can only be changed if the requester is already an admin.
2. **Product Stock Integrity**: Products can only be written (created/edited) by authenticated admins or managers. Average servers can only view products.
3. **Transaction Immortality**: Once a transaction document is created with a completed status, it behaves as a terminal archive and cannot be deleted or mid-modified.
4. **Inventory Log Integrity**: Inventory logs must always accurately trace back to the actual executing user (`request.auth.uid` matches the `user_id` field in the log).

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to breach the boundaries of role integrity, price tampering, product alterations, and trace-logging.

### Payload 1: Self-Elevation to Admin Role
* **Target Path**: `/users/attacker_uid`
* **Vulnerability Target**: Setting a custom role like `admin` upon registration or profiling.
* **Payload**: `{"uid": "attacker_uid", "nom": "Malicious User", "email": "attacker@gmail.com", "rfid_token": "badge_123", "role": "admin"}`
* **Expected Result**: `PERMISSION_DENIED` unless authorized by an existing admin.

### Payload 2: Hostile Takeover of Other Users Profiles
* **Target Path**: `/users/other_user_uid`
* **Vulnerability Target**: Editing another user's RFID token or name.
* **Payload**: `{"uid": "other_user_uid", "nom": "Hacked Name", "email": "other@gmail.com", "rfid_token": "hijacked_rfid"}`
* **Expected Result**: `PERMISSION_DENIED` (only owner or admin can edit).

### Payload 3: Spoofing Admin Status via Client Claims
* **Target Path**: `/products/new_product`
* **Vulnerability Target**: Adding a product menu item by claiming an administrative role in a fake client-side header.
* **Payload**: Product creation by unsigned or regular Server user.
* **Expected Result**: `PERMISSION_DENIED`.

### Payload 4: Arbitrary Price Modification
* **Target Path**: `/products/green_tea_royal`
* **Vulnerability Target**: Arbitrarily changing the price of high-end items to 0€ or low numbers.
* **Payload**: `{"nom": "Thé Royal", "prix": 0.01, "stock_actuel": 100}`
* **Expected Result**: `PERMISSION_DENIED` unless logged in as Admin/Gérant.

### Payload 5: Erasing Active Transaction History
* **Target Path**: `/transactions/invoice_999`
* **Vulnerability Target**: Deleting transaction logs to cover fraud.
* **Payload**: `DELETE` command on existing sales doc.
* **Expected Result**: `PERMISSION_DENIED` (all transactions are immutable/undeletable).

### Payload 6: Modifying Existing Transaction Totals
* **Target Path**: `/transactions/invoice_999`
* **Vulnerability Target**: Modifying total of a completed invoice on the client side.
* **Payload**: `{"total": 5.0, "status": "completed"}` updated from original total 120.0.
* **Expected Result**: `PERMISSION_DENIED`.

### Payload 7: Inventory Adjustment Under False User ID
* **Target Path**: `/inventory_logs/log_888`
* **Vulnerability Target**: Modifying logs claiming another staff member was responsible.
* **Payload**: `{"id": "log_888", "product_id": "tea_abc", "quantite_ajoutee": -50, "user_id": "manager_uid"}` sent by `server_uid`.
* **Expected Result**: `PERMISSION_DENIED` (UID mismatch check).

### Payload 8: Injection of Excessively Long Identifier Strings
* **Target Path**: `/products/excessive_id_j_u_n_k_` (1.5KB string)
* **Vulnerability Target**: ID Poisoning and wallet denial attacks.
* **Expected Result**: `PERMISSION_DENIED` due to standard ID length validations (`isValidId`).

### Payload 9: Emptying Stock Quantities Direct-Write Bypass
* **Target Path**: `/products/tea_matcha`
* **Vulnerability Target**: Server staff manually rewriting the catalog stock to a negative number or zero without a log.
* **Payload**: `{"stock_actuel": -999}` sent by an untrusted server role.
* **Expected Result**: `PERMISSION_DENIED`.

### Payload 10: Injecting Unverified System Emails
* **Target Path**: `/users/some_user_id`
* **Vulnerability Target**: Registering profile records without verifying verification states.
* **Expected Result**: `PERMISSION_DENIED`.

### Payload 11: Spoofed Transaction Creation Without User ID Mapping
* **Target Path**: `/transactions/invoice_new`
* **Vulnerability Target**: Posting an invoice with a mismatched cashier ID.
* **Payload**: `{"total": 25.0, "user_id": "other_cashier"}` sent by authenticated `my_cashier_uid`.
* **Expected Result**: `PERMISSION_DENIED`.

### Payload 12: Anonymous Write of Transaction Records
* **Target Path**: `/transactions/invoice_anon`
* **Vulnerability Target**: Recording sales anonymous and bypassing audit controls.
* **Expected Result**: `PERMISSION_DENIED`.

---

## 3. Test Assertions Checklist

* **Assert 1**: `get("/users/some_id")` fails when not logged in.
* **Assert 2**: `create("/products/new_id")` succeeds ONLY for Admin and Gérant.
* **Assert 3**: `update("/products/existing_id")` fails for Serveur.
* **Assert 4**: `delete("/transactions/existing_id")` always fails.
* **Assert 5**: `create("/transactions/new_id")` succeeds for Serveur, Gérant, and Admin if `user_id == auth.uid`.
