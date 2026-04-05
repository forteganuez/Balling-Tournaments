# Balling Web Store — Design Spec

**Date:** 2026-04-04
**Status:** Draft
**Goal:** Revenue from selling padel, tennis, and squash equipment/gear through the Balling web client.

---

## Overview

An online store where Balling admins list equipment (rackets, paddles, grips, balls, bags, accessories) and customers purchase via Stripe Checkout. Shipping is local to Groningen only. Admins track and fulfill orders manually through a dashboard.

## Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Payment | Stripe Checkout only | Reuses existing infrastructure, simplest path |
| Admin access | ADMIN role only | Clean separation — organizers run tournaments, admins run store |
| Categories | Rackets, Paddles, Grips, Balls, Bags, Wristbands, Accessories | Covers racket sports gear without needing size variants |
| Fulfillment | Paid → Preparing → Shipped → Delivered (+ Cancelled) | Simple status tracking, admin updates manually |
| Shipping scope | Groningen only | Local delivery, no carrier API needed |

---

## Database Schema

### New Enums

```prisma
enum ProductCategory {
  RACKETS
  PADDLES
  GRIPS
  BALLS
  BAGS
  WRISTBANDS
  ACCESSORIES
}

enum OrderStatus {
  PAID
  PREPARING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### New Models

```prisma
model Product {
  id          String          @id @default(cuid())
  name        String
  description String
  category    ProductCategory
  sport       Sport?          // null = universal (e.g. bags)
  priceCents  Int             // cents — consistent with entryFee pattern
  imageUrl    String?
  stock       Int             @default(0)
  active      Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  orderItems  OrderItem[]

  @@index([category, active])
  @@index([sport, active])
}

model Order {
  id                String      @id @default(cuid())
  userId            String
  status            OrderStatus @default(PAID)
  totalCents        Int
  stripeSessionId   String?
  stripePaymentId   String?
  shippingName      String
  shippingAddress   String
  shippingCity      String      @default("Groningen")
  shippingPostal    String
  shippingPhone     String?
  notes             String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  user              User        @relation(fields: [userId], references: [id])
  items             OrderItem[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  productId   String
  quantity    Int
  priceCents  Int     // snapshot at purchase time
  order       Order   @relation(fields: [orderId], references: [id])
  product     Product @relation(fields: [productId], references: [id])

  @@index([orderId])
}
```

Add `orders Order[]` relation to the existing `User` model.

---

## API Routes

### Public / Authenticated — `/api/store`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List products. Filter: `?category=&sport=&search=&page=&limit=`. Returns `{ products, total, page, limit }` |
| GET | `/:id` | Public | Single product detail |
| POST | `/checkout` | Authenticated | Create order + Stripe session. Body: `{ items: [{productId, quantity}], shippingName, shippingAddress, shippingPostal, shippingPhone?, notes? }`. Returns `{ checkoutUrl, sessionId, orderId }` |
| GET | `/orders` | Authenticated | User's order history (paginated) |
| GET | `/orders/:id` | Authenticated | Single order (must own) |

### Admin — `/api/admin/store`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | ADMIN | All products (including inactive) |
| POST | `/products` | ADMIN | Create product |
| PUT | `/products/:id` | ADMIN | Update product |
| DELETE | `/products/:id` | ADMIN | Soft-delete (set active: false) |
| GET | `/orders` | ADMIN | All orders, filterable by `?status=` |
| GET | `/orders/:id` | ADMIN | Single order detail |
| PATCH | `/orders/:id/status` | ADMIN | Update order status |

---

## Stripe Checkout Flow

Same pattern as existing credit purchases:

1. Client POSTs to `/api/store/checkout` with items + shipping info
2. Backend validates stock, creates `Order` + `OrderItem` records in a transaction
3. Backend creates Stripe checkout session with `metadata: { type: 'STORE_PURCHASE', userId, orderId }`
4. Backend returns `{ checkoutUrl }`, client redirects browser
5. On payment success, Stripe sends `checkout.session.completed` webhook
6. Webhook handler (new `STORE_PURCHASE` case) confirms payment: updates `Order.stripePaymentId`, creates `Transaction`, decrements stock

**Stock handling:** Soft check at checkout creation (reject if stock < requested). Actual stock decrement at webhook confirmation (prevents holding stock for abandoned sessions).

---

## Zod Schemas

```ts
// Admin product CRUD
export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(['RACKETS','PADDLES','GRIPS','BALLS','BAGS','WRISTBANDS','ACCESSORIES']),
  sport: z.enum(['PADEL','TENNIS','SQUASH']).nullable().optional(),
  priceCents: z.coerce.number().int().min(100), // min 1 EUR
  imageUrl: z.string().url().nullable().optional(),
  stock: z.coerce.number().int().min(0),
  active: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

// Product listing query
export const productQuerySchema = z.object({
  category: z.enum(['RACKETS','PADDLES','GRIPS','BALLS','BAGS','WRISTBANDS','ACCESSORIES']).optional(),
  sport: z.enum(['PADEL','TENNIS','SQUASH']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// Order checkout
export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().int().min(1).max(10),
  })).min(1).max(20),
  shippingName: z.string().min(2).max(200),
  shippingAddress: z.string().min(5).max(500),
  shippingPostal: z.string().min(4).max(10),
  shippingPhone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

// Admin order status update
export const updateOrderStatusSchema = z.object({
  status: z.enum(['PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED']),
});
```

---

## Frontend Pages

### StorePage (`/store`)
- Product grid with filter chips (category, sport)
- Search bar
- Card layout: image, name, price, sport badge, stock indicator
- Each card links to `/store/:id`

### ProductDetailPage (`/store/:id`)
- Product image, name, description, price, stock status
- Quantity selector (1-10, max stock)
- "Buy Now" opens inline shipping form (name, address, postal code, phone)
- Submit creates order via API, redirects to Stripe Checkout
- Payment success/cancel status via URL params

### OrdersPage (`/store/orders`) — protected
- Card-based order list with status badge, date, total, item count
- Click to expand/view items

### AdminStorePage (`/admin/store`) — ADMIN only
- Two tabs: Products | Orders
- **Products tab:** List with add/edit forms, active toggle, stock count
- **Orders tab:** Filter by status, list with customer name, items, total, status dropdown to update

---

## Frontend Types

```ts
export type ProductCategory = 'RACKETS' | 'PADDLES' | 'GRIPS' | 'BALLS' | 'BAGS' | 'WRISTBANDS' | 'ACCESSORIES';
export type OrderStatus = 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  sport: Sport | null;
  priceCents: number;
  imageUrl: string | null;
  stock: number;
  active: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  priceCents: number;
  product?: { name: string; imageUrl: string | null };
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalCents: number;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostal: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}
```

---

## Constants

```ts
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'RACKETS','PADDLES','GRIPS','BALLS','BAGS','WRISTBANDS','ACCESSORIES'
];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  RACKETS: 'Rackets', PADDLES: 'Paddles', GRIPS: 'Grips',
  BALLS: 'Balls', BAGS: 'Bags', WRISTBANDS: 'Wristbands', ACCESSORIES: 'Accessories',
};

export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  PAID:      { label: 'Paid',      color: 'text-[#8a6838]' },
  PREPARING: { label: 'Preparing', color: 'text-yellow-600' },
  SHIPPED:   { label: 'Shipped',   color: 'text-blue-600' },
  DELIVERED: { label: 'Delivered', color: 'text-green-600' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600' },
};
```

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `server/src/services/storePayments.ts` | Stripe checkout session for store orders |
| `server/src/routes/store.ts` | Public product listing + authenticated checkout/orders |
| `server/src/routes/admin/store.ts` | ADMIN CRUD for products + order management |
| `web/src/hooks/useStore.ts` | Data fetching hooks (useProducts, useProduct, useOrders, etc.) |
| `web/src/pages/StorePage.tsx` | Product grid |
| `web/src/pages/ProductDetailPage.tsx` | Single product + buy flow |
| `web/src/pages/OrdersPage.tsx` | User order history |
| `web/src/pages/AdminStorePage.tsx` | Admin product/order management |

### Modified files
| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add Product, Order, OrderItem models + enums |
| `server/src/lib/validation.ts` | Add store Zod schemas |
| `server/src/routes/webhooks.ts` | Add STORE_PURCHASE case |
| `server/src/routes/uploads.ts` | Add 'products' to allowed buckets |
| `server/src/index.ts` | Register store routes |
| `web/src/lib/types.ts` | Add Product, Order, OrderItem interfaces |
| `web/src/lib/constants.ts` | Add category labels, order status map |
| `web/src/App.tsx` | Add store routes |
| `web/src/components/Navbar.tsx` | Add "Store" nav link |

---

## Implementation Phases

| Phase | What | Depends on | Testable |
|-------|------|------------|----------|
| 1 | Prisma schema + migration | Nothing | `npx prisma studio` |
| 2 | Backend service (storePayments.ts) + Zod schemas | Phase 1 | Unit test |
| 3 | Backend routes + webhook + uploads + index.ts | Phase 1-2 | curl / Postman |
| 4 | Frontend types + constants | Nothing | TypeScript compile |
| 5 | Frontend hooks | Phase 3-4 | Browser dev tools |
| 6 | Frontend pages + routing + navbar | Phase 4-5 | Full browser test |

---

## Verification

1. `cd server && npm run build` — compiles
2. `cd server && npm test` — all tests pass
3. `npx prisma migrate dev` — migration runs cleanly
4. Admin can create a product via `/admin/store`
5. Unauthenticated user can browse `/store`
6. Authenticated user can buy a product → Stripe checkout → webhook confirms → order appears in `/store/orders`
7. Admin can see and update order status in `/admin/store`
8. `cd web && npm run build` — compiles
