# Section-Preise (EUR)

| Section | ID | Preis | Status |
|---------|-----|-------|--------|
| Featured Collection (Tabs) | featured-collection-tabs | €9 | ✅ Paid |
| CTA Banner | cta-banner | €15 | ✅ Paid |
| Hero Minimal | hero-minimal | €5 | ✅ Paid |
| Logo Cloud | logo-cloud | €9 | ✅ Paid |
| Testimonial Cards | testimonial-cards | €9 | ✅ Paid |
| Testimonial Scrolling | testimonial-scrolling | €9 | ✅ Paid |
| FAQ Accordion | faq-accordion | €19 | ✅ Paid |
| Payment Icons | payment-icons | €5 | ✅ Paid |
| Testimonial Carousel | testimonial-carousel | €29 | ✅ Paid |
| Testimonial Image Review | testimonial-image-review | €9 | ✅ Paid |
| Testimonial Video Slider | testimonial-video-slider | €9 | ✅ Paid |
| Shop the Look | shop-the-look | €12 | ✅ Paid |

## Testing der Zahlungsfunktion

### Quick Start:
1. **App starten:** `npm run dev`
2. **Section öffnen:** z.B. "Shop the Look" (€12)
3. **"🧪 Test Purchase" klicken**
4. **Erfolg:** 
   - Browser Console: `Test Purchase Response: {status: 200, data: {purchaseRequired: true, ...}}`
   - Success Banner: `✅ Test erfolgreich! Purchase initiiert...`
   - Nach 3 Sekunden: Redirect zu Mock-Checkout (in Dev-Mode)

### Development Mode:
- In `NODE_ENV=development`: Automatischer Mock-Purchase wenn Shopify API keine Response gibt
- Mock ID: `gid://shopify/AppPurchaseOneTime/[random]`
- Purchase wird in DB mit Status `PENDING` gespeichert
- Ermöglicht Testing ohne echte Shopify API

### Production Mode:
- Echter Shopify API Call
- Echte Checkout URL von Shopify
- Webhook-Callback nach Zahlung
