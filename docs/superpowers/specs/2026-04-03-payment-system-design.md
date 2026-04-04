# Payment & Monetization System Design — Balling

**Date:** 2026-04-03  
**Status:** Approved

---

## Context

Balling needs a complete payment system that supports four revenue streams across web and mobile. The existing credit-pack system (`CreditPack` model, `/api/monetization/buy-credits`) is being replaced entirely. The new system uses Stripe for web/physical services and RevenueCat for in-app subscriptions (iOS/Android).

**Important:** The `web/` PricingPage and related pages currently being built reference the old credit system. Those pages must be updated after this system is in place.

---

## Business Model

| Revenue stream | Trigger | Platform | Processor |
|---|---|---|---|
| Competitive match entry | User joins ranked match | Web + App | Stripe (physical service → allowed in app via WebBrowser) |
| Baller subscription | Monthly unlimited access | Web | Stripe Checkout |
| Baller subscription | Monthly unlimited access | iOS/Android | RevenueCat → Apple IAP / Google Play |
| Equipment rental | Racket/grip/balls per session | Web + App | Stripe (physical service) |
| Online shop | Grips, balls, accessories | Web + App | Stripe (physical goods) |

**Baller benefits:** Unlimited competitive matches (free entry), Baller badge, priority matchmaking.

**Free users:** Can play casual/unranked matches. Pay per competitive match.

---

## Prisma Schema Changes

Remove `CreditPack` model. Remove `credits` field from `User`. Add:

```prisma
model BallerSubscription {
  id                       String   @id @default(cuid())
  user_id                  String   @unique
  user                     User     @relation(fields: [user_id], references: [id])
  source                   String   // 'revenuecat' | 'stripe'
  external_subscription_id String   @unique
  status                   String   // 'active' | 'cancelled' | 'expired'
  current_period_end       DateTime
  created_at               DateTime @default(now())
  updated_at               DateTime @updatedAt
}

model Purchase {
  id                      String   @id @default(cuid())
  user_id                 String
  user                    User     @relation(fields: [user_id], references: [id])
  type                    String   // 'match_entry' | 'baller_subscription' | 'equipment_rental' | 'shop_order'
  source                  String   // 'stripe' | 'revenuecat'
  external_transaction_id String   @unique   // idempotency key
  amount_cents            Int
  currency                String   @default("eur")
  metadata                Json?
  created_at              DateTime @default(now())
}

model MatchEntry {
  id          String   @id @default(cuid())
  match_id    String
  user_id     String
  user        User     @relation(fields: [user_id], references: [id])
  purchase_id String?  @unique
  status      String   // 'pending_payment' | 'confirmed' | 'refunded'
  created_at  DateTime @default(now())
}

model EquipmentRental {
  id           String   @id @default(cuid())
  user_id      String
  user         User     @relation(fields: [user_id], references: [id])
  item         String   // 'racket' | 'grip_set' | 'ball_set'
  quantity     Int
  session_date DateTime
  purchase_id  String?  @unique
  status       String   // 'pending_payment' | 'confirmed' | 'cancelled'
  created_at   DateTime @default(now())
}

model ShopOrder {
  id               String   @id @default(cuid())
  user_id          String
  user             User     @relation(fields: [user_id], references: [id])
  items            Json     // [{ product_id, name, quantity, unit_price_cents }]
  total_cents      Int
  status           String   // 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  shipping_address Json
  purchase_id      String?  @unique
  created_at       DateTime @default(now())
}
```

**User model additions:**
```prisma
is_baller         Boolean   @default(false)
baller_expires_at DateTime?
```

---

## Backend: Stripe Webhook Handler

**File:** `server/src/routes/webhooks/stripe.ts`  
**Route:** `POST /webhooks/stripe`  
**Middleware:** `express.raw({ type: 'application/json' })` — mounted BEFORE `express.json()` globally

### Events handled:

| Event | Action |
|---|---|
| `checkout.session.completed` | Read `metadata.type` → update MatchEntry/EquipmentRental/ShopOrder status to confirmed/paid, create Purchase |
| `customer.subscription.created` | Upsert BallerSubscription (source: stripe), set `is_baller=true`, `baller_expires_at=current_period_end` |
| `customer.subscription.updated` | Same as created |
| `customer.subscription.deleted` | Set status=cancelled, `is_baller=false`, `baller_expires_at=null` |

**Rules:**
- Verify signature via `stripe.webhooks.constructEvent()` → 400 on failure
- All DB writes in transactions
- Idempotency: check `Purchase.external_transaction_id` before writing — skip if exists
- Return `200 { received: true }` for all events including unhandled
- Never expose error details in response — log server-side only

---

## Backend: RevenueCat Webhook Handler

**File:** `server/src/routes/webhooks/revenuecat.ts`  
**Route:** `POST /webhooks/revenuecat`  
**Auth:** `Authorization: Bearer ${REVENUECAT_WEBHOOK_SECRET}` — 401 if missing/invalid

### Events handled:

| Event | Action |
|---|---|
| `INITIAL_PURCHASE` | Upsert BallerSubscription (source: revenuecat), set `is_baller=true`, `baller_expires_at` from `event.expiration_at_ms` |
| `RENEWAL` | Update `current_period_end`, ensure `is_baller=true` |
| `CANCELLATION` | Update status, set `is_baller=false` |
| `EXPIRATION` | Update status, set `is_baller=false` |

**Rules:**
- Always return 200 (RevenueCat retries on non-200)
- Idempotency via `event.id`

---

## Backend: Payment Endpoints

**Base path:** `server/src/routes/payments.ts` → mounted at `/payments`

### POST `/payments/match-entry`
- Auth required
- Body: `{ match_id: string }`
- Validate match exists and is open
- Check user not already entered
- If `user.is_baller`: create MatchEntry (confirmed), return `{ success: true, free: true }`
- Else: create MatchEntry (pending_payment), create Stripe session (mode: payment), return `{ url }`
- Metadata: `{ type: 'match_entry', match_id, user_id }`

### POST `/payments/baller-subscription`
- Auth required
- Body: `{ interval: 'monthly' }`
- Check user not already Baller
- Create Stripe session (mode: subscription, price: `STRIPE_PRICE_BALLER_MONTHLY`)
- Metadata: `{ type: 'baller_subscription', user_id }`
- Return `{ url }`

### POST `/payments/equipment-rental`
- Auth required
- Body: `{ item: 'racket' | 'grip_set' | 'ball_set', quantity: number, session_date: string }`
- Validate item enum and quantity (1–5)
- Create EquipmentRental (pending_payment)
- Create Stripe session with line_items from `STRIPE_PRICE_*` env vars
- Metadata: `{ type: 'equipment_rental', rental_id, user_id }`
- Return `{ url }`

### POST `/payments/shop-order`
- Auth required
- Body: `{ items: [{ product_id, quantity }], shipping_address: object }`
- Validate against hardcoded product catalog (grips, balls, accessories)
- Calculate total
- Create ShopOrder (pending_payment)
- Create Stripe session with line_items per product
- Metadata: `{ type: 'shop_order', order_id, user_id }`
- Return `{ url }`

### POST `/payments/cancel-pending`
- Auth required
- Cancel MatchEntry and EquipmentRental in 'pending_payment' status older than 30 minutes for this user

---

## Backend: Users Endpoint Update

**GET `/users/me`:**  
Return: `{ id, name, email, is_baller, baller_expires_at, elo_rating, matches_played }` (never password hash)

---

## Mobile: RevenueCat Integration

**File:** `mobile/src/lib/purchases.ts`

```typescript
initPurchases(userId: string): void          // initialize with platform key
getBallerOffering(): Promise<PurchasesPackage | null>
purchaseBaller(pkg: PurchasesPackage): Promise<CustomerInfo>  // native IAP sheet
restorePurchases(): Promise<CustomerInfo>   // Apple requirement
```

**File:** `mobile/src/screens/BallerPaywallScreen.tsx`
- Baller benefits list
- Price from RevenueCat offering (localized `priceString`)
- "Go Baller" button → `purchaseBaller()` → native IAP sheet (Face ID on iOS)
- Success: confirmation, navigate back, refresh user state
- Error (not userCancelled): show error alert
- "Restore Purchases" button (Apple requirement)
- Note: "Also available at balling.app" (EU DMA compliant — do not mention price difference)

**File:** `mobile/src/lib/webPayment.ts`

```typescript
openPaymentSheet(url: string, onSuccess: () => void, onCancel: () => void): Promise<void>
// Opens expo-web-browser → Stripe Checkout
// Detects success/cancel URL on return
```

Used for: match entry, equipment rental, shop orders (physical/real-world → exempt from IAP rules).

---

## Environment Variables

**Server `.env.example` additions:**
```
STRIPE_PRICE_BALLER_MONTHLY=price_...
STRIPE_PRICE_RACKET_RENTAL=price_...
STRIPE_PRICE_GRIP_SET=price_...
STRIPE_PRICE_BALL_SET=price_...
REVENUECAT_WEBHOOK_SECRET=...
WEB_URL=https://balling.app
```

**Mobile Expo `.env` additions:**
```
EXPO_PUBLIC_RC_IOS_KEY=appl_...
EXPO_PUBLIC_RC_ANDROID_KEY=goog_...
```

---

## Payment Flow Summary

```
COMPETITIVE MATCH
  User → POST /payments/match-entry
    ├── Is Baller? → confirmed instantly (free)
    └── Not Baller? → Stripe Checkout URL → webhook confirms MatchEntry

BALLER SUBSCRIPTION
  App → RevenueCat → Native IAP → RC webhook → is_baller=true
  Web → POST /payments/baller-subscription → Stripe → webhook → is_baller=true

EQUIPMENT RENTAL / SHOP
  POST /payments/equipment-rental or /shop-order
  → Stripe Checkout → webhook confirms order
  (App opens via expo-web-browser — physical service, allowed without IAP)
```

---

## Files Affected (web client)

The web/ PricingPage currently uses `/api/monetization/buy-credits` (credit packs). After this plan is implemented, it must be updated to:
- Remove credit pack cards
- Add match entry CTA → `/payments/match-entry`
- Keep Baller subscription card → now calls `/payments/baller-subscription`
- Add equipment rental section
- Add shop section (or link to shop page)

---

## Constraints

- TypeScript strict — no implicit `any`
- All webhook handlers idempotent
- `express.raw()` only on `/webhooks/stripe` — must not affect other routes
- Never log full request bodies (PII)
- All DB writes in transactions
- Return 200 to RevenueCat always
- Return 400 to Stripe on bad signature
- Baller check always from DB — never trust client
- `expo-web-browser` for Stripe in mobile — never redirect away from app

---

## Verification Checklist

- [ ] `npx prisma migrate dev` runs clean
- [ ] POST `/webhooks/stripe` returns 400 on bad sig, 200 on valid events
- [ ] POST `/webhooks/revenuecat` returns 401 on bad secret, 200 on valid events
- [ ] Baller users get free match entry (no Stripe session)
- [ ] Non-Baller users get Stripe Checkout URL
- [ ] Duplicate webhook events do not double-process
- [ ] BallerPaywallScreen shows native IAP sheet on iOS
- [ ] Restore Purchases button present and functional
- [ ] Equipment rental + shop order create correct Stripe sessions
