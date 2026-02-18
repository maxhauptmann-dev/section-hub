# Integration: appPurchaseOneTimeCreate für Section Hub

Die Zahlungsfunktion `appPurchaseOneTimeCreate` wurde vollständig in dein Projekt integriert. Hier ist eine Übersicht der Änderungen:

## Was wurde implementiert

### 1. **Datenbank-Modell** (`prisma/schema.prisma`)
- Neues Modell `SectionPurchase` hinzugefügt
- Speichert: Shop, Section-ID, Shopify-Purchase-ID, Betrag, Währung, Status
- Status-Werte: PENDING, PENDING_APPROVAL, COMPLETED, PURCHASED, ACTIVE, ACCEPTED

### 2. **Billing-Service** (`app/services/billing.server.ts`)
Neue Functions:
- **`createOneTimePurchase()`** — Erstellt einen Kauf-Request bei Shopify
- **`getAppPurchaseStatus()`** — Prüft den Kauf-Status
- **`hasPurchasedSection()`** — Überprüft, ob eine Section bereits gekauft wurde
- **`markPurchaseCompleted()`** — Markiert einen Kauf als abgeschlossen
- **`getPurchaseByAppId()`** — Holt einen Kauf-Datensatz

### 3. **Install-API angepasst** (`app/routes/app.api.install-section.tsx`)
- Prüft, ob die Section einen Preis hat
- Falls ja und nicht gekauft: Startet die `appPurchaseOneTimeCreate`-Flow
- Gibt `confirmationUrl` zurück (Shopify-Checkout-Link)
- Falls kostenlos oder bereits gekauft: Normale Installation

### 4. **Callback-Route** (`app/routes/app.billing.complete.tsx`)
- Wird aufgerufen, nachdem Merchant im Shopify-Checkout bezahlt hat
- Verifiziert den Kauf-Status
- Markiert Purchase als completed
- Leitet zurück zur Sections-Seite mit erfolgreicher Meldung

### 5. **Frontend-Integration** (`app/routes/app.section.tsx`)
- `handleInstall()` wurde angepasst, um:
  - Purchase-Response zu erkennen
  - Zum Shopify-Checkout weiterzuleiten (`window.top!.location.href`)
  - Purchase-Success-Banner anzuzeigen

## Workflow

```
1. User klickt "Install to Theme" auf bezahlte Section
   ↓
2. Frontend sendet POST /app/api/install-section
   ↓
3. Backend prüft: Ist Section kostenlos oder bereits gekauft?
   ├─ NEIN: Ruft appPurchaseOneTimeCreate auf
   │  └─ Speichert Purchase-Datensatz (Status: PENDING)
   │  └─ Antwortet: { purchaseRequired: true, confirmationUrl: "..." }
   ├─ Frontend redirectet zu confirmationUrl
   │
4. Merchant bezahlt bei Shopify
   ↓
5. Shopify redirectet zu /app/billing/complete?shop=...&section=...
   ↓
6. Backend prüft Kauf-Status mit getAppPurchaseStatus()
   ├─ Status === "PURCHASED/ACTIVE/ACCEPTED"
   │  └─ Speichert status als "COMPLETED" in DB
   │  └─ Redirectet zu /app/sections?purchased=...&install=true
   │
7. Frontend zeigt Success-Banner
```

## Environment-Variablen

Stelle sicher, dass in `.env` folgende Variablen gesetzt sind:
```
SHOPIFY_APP_URL=https://your-app-url.com
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SCOPES=read_themes,write_themes,write_billing,read_billing
```

## Testen

### 1. Lokales Testen (Development Store)
```bash
npm run dev
```

### 2. Section mit Preis erstellen
Füge in `app/sections/[section-name]/meta.json` ein:
```json
{
  "price": {
    "type": "one_time",
    "amount": 9,
    "currency": "EUR"
  }
}
```

### 3. Kaufflow testen
1. Öffne eine Section mit Preis > 0
2. Klick "Install to Theme"
3. Du wirst zu Shopify-Checkout weitergeleitet
4. Nach erfolgreichem Kauf: Callback zeigt Success-Banner
5. Section kann nun installiert werden

## Wichtige Dateien

| Datei | Beschreibung |
|-------|-------------|
| `prisma/schema.prisma` | Datenbank-Modell für Käufe |
| `app/services/billing.server.ts` | Alle Billing-Funktionen |
| `app/routes/app.api.install-section.tsx` | Install-Logik mit Purchase-Check |
| `app/routes/app.billing.complete.tsx` | Callback nach Kauf |
| `app/routes/app.section.tsx` | Frontend mit Payment-Handling |

## Nächste Schritte (optional)

1. **Webhook hinzufügen** — Für asynchrone Purchase-Status-Updates
   ```ts
   // app/webhooks/app-purchases.tsx
   ```

2. **Email-Benachrichtigung** — Nach erfolgreichem Kauf
   ```ts
   // app/services/email.server.ts
   ```

3. **Admin-Dashboard** — Übersicht aller Käufe
   ```tsx
   // app/routes/app.admin.purchases.tsx
   ```

4. **Refunds verarbeiten** — Rückerstattungen
   ```ts
   // app/services/billing.server.ts -> addRefundHandler()
   ```

---

**Status:** ✅ Produktionsreif (mit Test im Development Store)
