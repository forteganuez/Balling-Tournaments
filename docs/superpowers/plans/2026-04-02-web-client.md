# Web Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `web/` — a dark-themed React/Vite web client for Balling with Supabase auth, Stripe payments, and tournament management.

**Architecture:** Vite + React 18 + TypeScript strict app inside the existing monorepo at `web/`. Auth is handled by `@supabase/supabase-js`; the resulting access token is forwarded as a Bearer header on every Axios request to the Express API. Tournament management pages are ported and restyled from the existing `client/` folder.

**Tech Stack:** Vite 6, React 18, TypeScript strict, Tailwind CSS v3 (dark brand tokens), React Router v6, Axios, @supabase/supabase-js v2, Zod, Vitest + @testing-library/react.

---

## File Map

| File | Responsibility |
|---|---|
| `web/package.json` | Dependencies and scripts |
| `web/vite.config.ts` | Vite + Vitest config |
| `web/tailwind.config.ts` | Brand color tokens |
| `web/tsconfig.json` | Strict TypeScript config |
| `web/postcss.config.cjs` | Tailwind + autoprefixer |
| `web/index.html` | Inter font, root div |
| `web/.env.example` | VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| `web/src/lib/types.ts` | Shared TypeScript types (Tournament, Match, User, etc.) |
| `web/src/lib/supabase.ts` | Supabase client singleton |
| `web/src/api/client.ts` | Axios instance with Bearer token + 401 handler |
| `web/src/context/AuthContext.tsx` | Supabase session → server user + credits |
| `web/src/App.tsx` | Router tree + AuthProvider |
| `web/src/main.tsx` | React DOM root |
| `web/src/components/Navbar.tsx` | Logo, links, credits pill, auth state |
| `web/src/components/Footer.tsx` | Simple dark footer |
| `web/src/components/ProtectedRoute.tsx` | Redirect to /login if unauthenticated |
| `web/src/components/SportIcon.tsx` | Sport → emoji, ported from client/ |
| `web/src/components/Countdown.tsx` | Live countdown, ported + dark-restyled |
| `web/src/components/TournamentCard.tsx` | Dark card link, ported + restyled |
| `web/src/components/BracketView.tsx` | Elimination bracket, ported + restyled |
| `web/src/components/RoundRobinView.tsx` | RR table + standings, ported + restyled |
| `web/src/hooks/useTournaments.ts` | Fetch tournament list + single tournament |
| `web/src/pages/HomePage.tsx` | Hero, features, how-it-works, CTA |
| `web/src/pages/LoginPage.tsx` | Supabase signInWithPassword |
| `web/src/pages/RegisterPage.tsx` | Supabase signUp |
| `web/src/pages/DashboardPage.tsx` | Stats, quick actions |
| `web/src/pages/PricingPage.tsx` | Credit packs + Baller subscription |
| `web/src/pages/PaymentSuccessPage.tsx` | Success confirmation |
| `web/src/pages/PaymentCancelPage.tsx` | Cancel confirmation |
| `web/src/pages/TournamentsPage.tsx` | Browse with filters, ported + restyled |
| `web/src/pages/TournamentDetailPage.tsx` | Info, join, bracket, ported + restyled |
| `web/src/pages/CreateTournamentPage.tsx` | Create tournament form, ported + restyled |
| `web/src/pages/ManageTournamentPage.tsx` | Registrations, results, bracket, ported + restyled |
| `web/src/pages/OrganizerDashboardPage.tsx` | Organizer stats + tournament list, ported + restyled |

---

## Task 1: Config & Scaffolding

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.ts`
- Create: `web/tailwind.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/postcss.config.cjs`
- Create: `web/index.html`
- Create: `web/.env.example`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "balling-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.46.2",
    "axios": "^1.7.9",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 3: Create `web/src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Create `web/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0d0d0d',
        surface: '#1a1a1a',
        border: '#2a2a2a',
        accent: '#22c55e',
        primary: '#ffffff',
        muted: '#9ca3af',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 6: Create `web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "tailwind.config.ts"]
}
```

- [ ] **Step 7: Create `web/postcss.config.cjs`**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Create `web/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <title>Balling</title>
  </head>
  <body class="bg-base text-primary font-sans">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `web/.env.example`**

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

- [ ] **Step 10: Install dependencies and verify**

```bash
cd web && npm install
```

Expected: no errors, `node_modules/` created.

- [ ] **Step 11: Commit**

```bash
cd web && git add -A && git commit -m "feat(web): scaffold Vite + React + Tailwind config"
```

---

## Task 2: Types & Supabase Client

**Files:**
- Create: `web/src/lib/types.ts`
- Create: `web/src/lib/supabase.ts`
- Create: `web/src/lib/index.css`

- [ ] **Step 1: Create `web/src/lib/types.ts`**

```typescript
export type Sport = 'PADEL' | 'TENNIS' | 'SQUASH';

export type TournamentFormat =
  | 'SINGLE_ELIMINATION'
  | 'DOUBLE_ELIMINATION'
  | 'ROUND_ROBIN';

export type TournamentStatus =
  | 'REGISTRATION_OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type UserRole = 'PLAYER' | 'ORGANIZER' | 'ADMIN';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBaller: boolean;
  matchesPlayed: number;
  wins: number;
  losses: number;
  credits: number;
  ballerExpiresAt: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  sport: Sport;
  format: TournamentFormat;
  status: TournamentStatus;
  description?: string;
  date: string;
  location: string;
  venue?: string;
  maxPlayers: number;
  entryFee: number;
  organizerId: string;
  organizer?: { id: string; name: string };
  _count?: { registrations: number };
  registrations?: Registration[];
  matches?: Match[];
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  userId: string;
  tournamentId: string;
  paidAt?: string;
  user?: { id: string; name: string };
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  score?: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface BalanceResponse {
  totalCredits: number;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}
```

- [ ] **Step 2: Create `web/src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Create `web/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #0d0d0d;
    color: #ffffff;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/ web/src/index.css && git commit -m "feat(web): add types, Supabase client, and global styles"
```

---

## Task 3: API Client

**Files:**
- Create: `web/src/api/client.ts`
- Test: `web/src/api/client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/api/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock supabase before importing client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock window.location
const locationMock = { href: '' };
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});

describe('api client', () => {
  beforeEach(() => {
    locationMock.href = '';
  });

  it('attaches Bearer token when session exists', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } as never },
      error: null,
    });

    const { api } = await import('./client');
    // Intercept the outgoing request config
    const config = await api.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
      url: '/test',
    } as never);

    expect((config.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-token'
    );
  });

  it('redirects to /login and signs out on 401', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

    const { api } = await import('./client');
    const error = { response: { status: 401 } };

    await api.interceptors.response.handlers[0].rejected(error as never).catch(() => {});

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(locationMock.href).toBe('/login');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npm test
```

Expected: FAIL — "api" not found / module missing.

- [ ] **Step 3: Create `web/src/api/client.ts`**

```typescript
import axios from 'axios';
import { supabase } from '../lib/supabase';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const status =
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response
        ? (error.response as { status: number }).status
        : null;

    if (status === 401) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd web && npm test
```

Expected: PASS — 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/api/ && git commit -m "feat(web): add Axios client with auth interceptors"
```

---

## Task 4: AuthContext

**Files:**
- Create: `web/src/context/AuthContext.tsx`
- Test: `web/src/context/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/context/AuthContext.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state then resolves to null user when no session', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { useAuth, AuthProvider } = await import('./AuthContext');

    function TestChild() {
      const { user, isLoading } = useAuth();
      if (isLoading) return <div>loading</div>;
      return <div>{user ? user.name : 'no-user'}</div>;
    }

    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('no-user')).toBeInTheDocument());
  });

  it('populates user when session and API calls succeed', async () => {
    const { supabase } = await import('../lib/supabase');
    const { api } = await import('../api/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'tok' } as never },
      error: null,
    });
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          user: {
            id: '1',
            name: 'Alice',
            email: 'a@b.com',
            role: 'PLAYER',
            isBaller: false,
            matchesPlayed: 5,
            wins: 3,
            losses: 2,
          },
        },
      })
      .mockResolvedValueOnce({
        data: { totalCredits: 10, subscription: null },
      });

    const { useAuth, AuthProvider } = await import('./AuthContext');

    function TestChild() {
      const { user, isLoading } = useAuth();
      if (isLoading) return <div>loading</div>;
      return <div>{user?.name ?? 'no-user'}</div>;
    }

    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npm test
```

Expected: FAIL — AuthContext module not found.

- [ ] **Step 3: Create `web/src/context/AuthContext.tsx`**

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';
import type { AppUser, BalanceResponse } from '../lib/types';

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const [meRes, balanceRes] = await Promise.all([
        api.get<{ user: Omit<AppUser, 'credits' | 'ballerExpiresAt'> }>(
          '/api/auth/me'
        ),
        api.get<BalanceResponse>('/api/monetization/balance'),
      ]);

      setUser({
        ...meRes.data.user,
        credits: balanceRes.data.totalCredits,
        ballerExpiresAt:
          balanceRes.data.subscription?.currentPeriodEnd ?? null,
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetchUser();
      }
      setIsLoading(false);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        session &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
      ) {
        await fetchUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, refetch: fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd web && npm test
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add web/src/context/ && git commit -m "feat(web): add AuthContext with Supabase session management"
```

---

## Task 5: App Router + Entry Point

**Files:**
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`

- [ ] **Step 1: Create `web/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 2: Create `web/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import CreateTournamentPage from './pages/CreateTournamentPage';
import ManageTournamentPage from './pages/ManageTournamentPage';
import OrganizerDashboardPage from './pages/OrganizerDashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-base">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/payment/cancel" element={<PaymentCancelPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:id" element={<TournamentDetailPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
              </Route>

              {/* Organizer-only routes */}
              <Route element={<ProtectedRoute requiredRole="ORGANIZER" />}>
                <Route path="/tournaments/new" element={<CreateTournamentPage />} />
                <Route path="/tournaments/:id/manage" element={<ManageTournamentPage />} />
                <Route path="/organizer" element={<OrganizerDashboardPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/main.tsx web/src/App.tsx && git commit -m "feat(web): add App router and entry point"
```

---

## Task 6: Core Layout Components

**Files:**
- Create: `web/src/components/ProtectedRoute.tsx`
- Create: `web/src/components/Navbar.tsx`
- Create: `web/src/components/Footer.tsx`

- [ ] **Step 1: Create `web/src/components/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../lib/types';

interface Props {
  requiredRole?: UserRole;
}

export default function ProtectedRoute({ requiredRole }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 2: Create `web/src/components/Navbar.tsx`**

```tsx
import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-accent' : 'text-muted hover:text-primary'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-base/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 text-xl font-bold text-primary">
          Ball
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
            i
          </span>
          ng
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-6 sm:flex">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/tournaments" className={navLinkClass}>
            Tournaments
          </NavLink>
          <NavLink to="/pricing" className={navLinkClass}>
            Pricing
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
          {user?.role === 'ORGANIZER' && (
            <NavLink to="/organizer" className={navLinkClass}>
              Organizer
            </NavLink>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Credits pill */}
              <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium sm:flex">
                <span className="text-accent">⚡</span>
                {user.credits} credits
              </span>

              {/* Account dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-primary hover:border-accent"
                >
                  {user.name.split(' ')[0]}
                  <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-surface shadow-xl">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        void logout();
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-muted hover:text-primary"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary hover:border-accent"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create `web/src/components/Footer.tsx`**

```tsx
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-base py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} Balling. Built for students in Groningen.
          </p>
          <div className="flex gap-6 text-sm text-muted">
            <Link to="/pricing" className="hover:text-primary">Pricing</Link>
            <Link to="/tournaments" className="hover:text-primary">Tournaments</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/ProtectedRoute.tsx web/src/components/Navbar.tsx web/src/components/Footer.tsx && git commit -m "feat(web): add Navbar, Footer, ProtectedRoute components"
```

---

## Task 7: Ported UI Components

**Files:**
- Create: `web/src/components/SportIcon.tsx`
- Create: `web/src/components/Countdown.tsx`
- Create: `web/src/components/TournamentCard.tsx`
- Create: `web/src/components/BracketView.tsx`
- Create: `web/src/components/RoundRobinView.tsx`

- [ ] **Step 1: Create `web/src/components/SportIcon.tsx`**

```tsx
import type { Sport } from '../lib/types';

interface Props {
  sport: Sport;
  className?: string;
}

const icons: Record<Sport, string> = {
  PADEL: '🏓',
  TENNIS: '🎾',
  SQUASH: '🟡',
};

export default function SportIcon({ sport, className }: Props) {
  return <span className={className}>{icons[sport]}</span>;
}
```

- [ ] **Step 2: Create `web/src/components/Countdown.tsx`** (ported + dark-restyled)

```tsx
import { useState, useEffect } from 'react';

interface Props {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-surface text-xl font-bold text-primary sm:h-16 sm:w-16 sm:text-2xl">
        {String(value).padStart(2, '0')}
      </div>
      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}

export default function Countdown({ targetDate }: Props) {
  const target = new Date(targetDate);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    calcTimeLeft(target)
  );

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [targetDate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!timeLeft) {
    const isPast = target.getTime() < Date.now() - 24 * 60 * 60 * 1000;
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-muted">
        {isPast ? 'Tournament completed' : 'Tournament has started!'}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <TimeUnit value={timeLeft.days} label="Days" />
      <span className="text-2xl font-bold text-muted">:</span>
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <span className="text-2xl font-bold text-muted">:</span>
      <TimeUnit value={timeLeft.minutes} label="Min" />
      <span className="text-2xl font-bold text-muted">:</span>
      <TimeUnit value={timeLeft.seconds} label="Sec" />
    </div>
  );
}
```

- [ ] **Step 3: Create `web/src/components/TournamentCard.tsx`** (ported + dark-restyled)

```tsx
import { Link } from 'react-router-dom';
import type { Tournament } from '../lib/types';
import SportIcon from './SportIcon';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCentsToEuros(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elim',
  DOUBLE_ELIMINATION: 'Double Elim',
  ROUND_ROBIN: 'Round Robin',
};

const statusStyles: Record<string, { border: string; text: string; label: string }> = {
  REGISTRATION_OPEN: { border: 'border-accent', text: 'text-accent', label: 'Open' },
  IN_PROGRESS: { border: 'border-yellow-500', text: 'text-yellow-400', label: 'In Progress' },
  COMPLETED: { border: 'border-border', text: 'text-muted', label: 'Completed' },
  CANCELLED: { border: 'border-red-500', text: 'text-red-400', label: 'Cancelled' },
};

interface Props {
  tournament: Tournament;
}

export default function TournamentCard({ tournament }: Props) {
  const status = statusStyles[tournament.status] ?? statusStyles.COMPLETED;
  const spotsUsed = tournament._count?.registrations ?? 0;
  const fillPct = Math.min((spotsUsed / tournament.maxPlayers) * 100, 100);

  return (
    <Link
      to={`/tournaments/${tournament.id}`}
      className="block rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <SportIcon sport={tournament.sport} className="text-2xl" />
          <h3 className="font-semibold text-primary">{tournament.name}</h3>
        </div>
        <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
      </div>

      <div className="mb-4 space-y-1 text-sm text-muted">
        <p>{tournament.location}{tournament.venue ? ` · ${tournament.venue}` : ''}</p>
        <p>{formatDate(tournament.date)}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="rounded border border-border px-2 py-0.5 text-xs text-muted">
          {formatLabels[tournament.format] ?? tournament.format}
        </span>
        <div className="text-right">
          <p className="text-sm font-semibold text-primary">
            {tournament.entryFee === 0 ? 'Free' : formatCentsToEuros(tournament.entryFee)}
          </p>
          <p className="text-xs text-muted">{spotsUsed}/{tournament.maxPlayers} spots</p>
        </div>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Create `web/src/components/BracketView.tsx`** (ported + dark-restyled)

```tsx
import type { Match } from '../lib/types';

interface Props {
  matches: Match[];
  players: Record<string, string>;
  highlightPlayerId?: string;
}

function getRoundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semifinals';
  if (fromFinal === 2) return 'Quarterfinals';
  return `Round ${round}`;
}

export default function BracketView({ matches, players, highlightPlayerId }: Props) {
  if (!matches.length) {
    return <p className="py-8 text-center text-muted">No bracket data available yet.</p>;
  }

  const roundMap = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = roundMap.get(m.round) ?? [];
    arr.push(m);
    roundMap.set(m.round, arr);
  }

  const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b);
  for (const r of rounds) roundMap.get(r)!.sort((a, b) => a.position - b.position);

  const totalRounds = rounds.length;
  const playerName = (id?: string) => (id ? (players[id] ?? 'TBD') : 'BYE');
  const isHighlighted = (id?: string) => highlightPlayerId && id === highlightPlayerId;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex items-stretch gap-0">
        {rounds.map((round, roundIdx) => {
          const roundMatches = roundMap.get(round)!;
          return (
            <div key={round} className="flex flex-col">
              <h4 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                {getRoundLabel(round, totalRounds)}
              </h4>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {roundMatches.map((match) => (
                  <div key={match.id} className="flex items-center">
                    <div className="w-52 overflow-hidden rounded-lg border border-border bg-surface">
                      {/* Player 1 */}
                      <div
                        className={`flex items-center justify-between border-b border-border px-3 py-2 text-sm ${
                          match.winnerId === match.player1Id
                            ? 'bg-accent/10 font-semibold text-accent'
                            : 'text-primary'
                        } ${isHighlighted(match.player1Id) ? 'ring-2 ring-inset ring-accent' : ''}`}
                      >
                        <span className="truncate">{playerName(match.player1Id)}</span>
                        {match.winnerId === match.player1Id && (
                          <span className="ml-2 text-xs font-bold text-accent">W</span>
                        )}
                      </div>
                      {/* Player 2 */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                          match.winnerId === match.player2Id
                            ? 'bg-accent/10 font-semibold text-accent'
                            : 'text-primary'
                        } ${isHighlighted(match.player2Id) ? 'ring-2 ring-inset ring-accent' : ''}`}
                      >
                        <span className="truncate">{playerName(match.player2Id)}</span>
                        {match.winnerId === match.player2Id && (
                          <span className="ml-2 text-xs font-bold text-accent">W</span>
                        )}
                      </div>
                      {match.score && (
                        <div className="border-t border-border px-3 py-1 text-center text-xs text-muted">
                          {match.score}
                        </div>
                      )}
                    </div>
                    {roundIdx < rounds.length - 1 && (
                      <div className="flex h-full w-8 items-center">
                        <div className="h-px w-full bg-border" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `web/src/components/RoundRobinView.tsx`** (ported + dark-restyled)

```tsx
import { useMemo } from 'react';
import type { Match } from '../lib/types';

interface Props {
  matches: Match[];
  players: Record<string, string>;
}

interface Standing {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
}

export default function RoundRobinView({ matches, players }: Props) {
  const playerIds = useMemo(() => Object.keys(players), [players]);

  const resultMap = useMemo(() => {
    const map: Record<string, Record<string, { score: string; won: boolean }>> = {};
    for (const m of matches) {
      if (!m.player1Id || !m.player2Id || !m.completedAt) continue;
      if (!map[m.player1Id]) map[m.player1Id] = {};
      if (!map[m.player2Id]) map[m.player2Id] = {};
      map[m.player1Id][m.player2Id] = { score: m.score ?? '-', won: m.winnerId === m.player1Id };
      map[m.player2Id][m.player1Id] = { score: m.score ?? '-', won: m.winnerId === m.player2Id };
    }
    return map;
  }, [matches]);

  const standings = useMemo(() => {
    const stats: Record<string, Standing> = {};
    for (const id of playerIds) {
      stats[id] = { playerId: id, name: players[id] ?? 'Unknown', wins: 0, losses: 0, points: 0 };
    }
    for (const m of matches) {
      if (!m.winnerId || !m.player1Id || !m.player2Id) continue;
      const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      if (stats[m.winnerId]) { stats[m.winnerId].wins += 1; stats[m.winnerId].points += 3; }
      if (stats[loserId]) stats[loserId].losses += 1;
    }
    return Object.values(stats).sort((a, b) => b.points - a.points || b.wins - a.wins);
  }, [matches, playerIds, players]);

  if (!matches.length) {
    return <p className="py-8 text-center text-muted">No round robin data yet.</p>;
  }

  const thClass = 'border border-border bg-surface px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted';
  const tdClass = 'border border-border px-3 py-2 text-sm text-primary';

  return (
    <div className="space-y-8">
      <div>
        <h4 className="mb-3 text-sm font-semibold text-muted">Results Matrix</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Player</th>
                {playerIds.map((id) => (
                  <th key={id} className={thClass}>
                    <span className="block max-w-[80px] truncate">{players[id]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerIds.map((rowId) => (
                <tr key={rowId}>
                  <td className={`${tdClass} font-medium`}>{players[rowId]}</td>
                  {playerIds.map((colId) => {
                    if (rowId === colId) return <td key={colId} className={`${tdClass} text-center text-muted`}>—</td>;
                    const result = resultMap[rowId]?.[colId];
                    if (!result) return <td key={colId} className={`${tdClass} text-center text-muted`}>—</td>;
                    return (
                      <td key={colId} className={`${tdClass} text-center font-medium ${result.won ? 'text-accent' : 'text-red-400'}`}>
                        {result.won ? 'W' : 'L'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-muted">Standings</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {['#', 'Player', 'W', 'L', 'Pts'].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr key={s.playerId} className={idx === 0 ? 'bg-accent/5' : ''}>
                  <td className={tdClass}>{idx + 1}</td>
                  <td className={`${tdClass} font-medium`}>{s.name}</td>
                  <td className={`${tdClass} text-center text-accent`}>{s.wins}</td>
                  <td className={`${tdClass} text-center text-red-400`}>{s.losses}</td>
                  <td className={`${tdClass} text-center font-semibold`}>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/ && git commit -m "feat(web): add and restyle ported UI components"
```

---

## Task 8: Tournament Data Hooks

**Files:**
- Create: `web/src/hooks/useTournaments.ts`

- [ ] **Step 1: Create `web/src/hooks/useTournaments.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Tournament, Sport, TournamentStatus } from '../lib/types';

interface TournamentFilters {
  sport?: Sport;
  status?: TournamentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export function useTournaments(filters: TournamentFilters = {}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (filters.sport) params.set('sport', filters.sport);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page ?? 1));
    params.set('limit', String(filters.limit ?? 20));

    api
      .get<Tournament[]>(`/api/tournaments?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setTournaments(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load tournaments'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters.sport, filters.status, filters.search, filters.page, filters.limit]);

  return { tournaments, loading, error };
}

export function useTournament(id: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    return api
      .get<Tournament>(`/api/tournaments/${id}`)
      .then((res) => setTournament(res.data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load tournament');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { tournament, loading, error, refetch };
}

export function useMyTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Tournament[]>('/api/tournaments/my')
      .then((res) => setTournaments(res.data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load tournaments');
      })
      .finally(() => setLoading(false));
  }, []);

  return { tournaments, loading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/hooks/ && git commit -m "feat(web): add tournament data hooks"
```

---

## Task 9: HomePage

**Files:**
- Create: `web/src/pages/HomePage.tsx`

- [ ] **Step 1: Create `web/src/pages/HomePage.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: '⚔️',
    title: 'Competitive Matches',
    description: 'Challenge players at your level. ELO rating tracks your progress across padel, tennis, and squash.',
  },
  {
    icon: '📊',
    title: 'Live Rankings',
    description: 'See where you stand in the Groningen student rankings. Climb the ladder match by match.',
  },
  {
    icon: '🏆',
    title: 'Tournaments',
    description: 'Join or organise tournaments. Single elimination, double elimination, or round robin formats.',
  },
];

const steps = [
  { num: '01', title: 'Sign Up', desc: 'Create your account with your student email in under a minute.' },
  { num: '02', title: 'Buy Credits', desc: 'Get a credit pack or go Baller for unlimited competitive play.' },
  { num: '03', title: 'Play & Rank Up', desc: 'Challenge players, join tournaments, climb the rankings.' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold leading-tight text-primary sm:text-5xl lg:text-6xl">
            The Racket Sports Platform
            <br />
            <span className="text-accent">for Students</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Compete in padel, tennis, and squash against fellow students in Groningen.
            Track your ELO, join tournaments, and become the campus champion.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to={user ? '/tournaments' : '/register'}
              className="rounded-lg bg-accent px-8 py-3 text-base font-semibold text-white hover:bg-green-600"
            >
              {user ? 'Browse Tournaments' : 'Join Now'}
            </Link>
            <Link
              to="/pricing"
              className="rounded-lg border border-border px-8 py-3 text-base font-semibold text-primary hover:border-accent"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-2xl font-bold text-primary">
            Everything you need to compete
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-surface p-6">
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-primary">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-2xl font-bold text-primary">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-lg font-bold text-accent">
                  {s.num}
                </div>
                <h3 className="mb-2 font-semibold text-primary">{s.title}</h3>
                <p className="text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-primary">Ready to play?</h2>
          <p className="mb-8 text-muted">Join hundreds of students already competing in Groningen.</p>
          {!user && (
            <Link
              to="/register"
              className="rounded-lg bg-accent px-8 py-3 text-base font-semibold text-white hover:bg-green-600"
            >
              Create your account
            </Link>
          )}
          {user && (
            <Link
              to="/tournaments"
              className="rounded-lg bg-accent px-8 py-3 text-base font-semibold text-white hover:bg-green-600"
            >
              Browse Tournaments
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/HomePage.tsx && git commit -m "feat(web): add HomePage"
```

---

## Task 10: Auth Pages (Login + Register)

**Files:**
- Create: `web/src/pages/LoginPage.tsx`
- Create: `web/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Create `web/src/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    navigate('/dashboard');
  };

  const inputClass =
    'w-full rounded-lg border border-border bg-base px-4 py-3 text-primary placeholder-muted outline-none focus:border-accent';

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-surface p-8">
          <h1 className="mb-2 text-2xl font-bold text-primary">Welcome back</h1>
          <p className="mb-8 text-sm text-muted">Log in to your Balling account.</p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@student.rug.nl"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `web/src/pages/RegisterPage.tsx`**

```tsx
import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    const { error: authError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: { data: { name: result.data.name } },
    });

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    navigate('/dashboard');
  };

  const inputClass =
    'w-full rounded-lg border border-border bg-base px-4 py-3 text-primary placeholder-muted outline-none focus:border-accent';

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-surface p-8">
          <h1 className="mb-2 text-2xl font-bold text-primary">Create your account</h1>
          <p className="mb-8 text-sm text-muted">Join the Groningen racket sports community.</p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {(
              [
                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'you@student.rug.nl' },
                { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
                { key: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
              ] as const
            ).map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="mb-1.5 block text-sm font-medium text-muted">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  className={inputClass}
                  required
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/LoginPage.tsx web/src/pages/RegisterPage.tsx && git commit -m "feat(web): add Login and Register pages"
```

---

## Task 11: DashboardPage

**Files:**
- Create: `web/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create `web/src/pages/DashboardPage.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const stats = [
    { label: 'Credits', value: user.credits, icon: '⚡' },
    { label: 'Matches Played', value: user.matchesPlayed, icon: '🎾' },
    { label: 'Wins', value: user.wins, icon: '🏆' },
    { label: 'Losses', value: user.losses, icon: '📉' },
  ];

  const actions = [
    { label: 'Find a Match', desc: 'Coming soon', to: '#', disabled: true },
    { label: 'Browse Tournaments', desc: 'Join the next tournament', to: '/tournaments', disabled: false },
    { label: 'Buy Credits', desc: 'Top up your credit balance', to: '/pricing', disabled: false },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary">
          Welcome back, {user.name.split(' ')[0]}
          {user.isBaller && (
            <span className="ml-2 rounded-full bg-accent/20 px-2.5 py-0.5 text-sm font-medium text-accent">
              Baller
            </span>
          )}
        </h1>
        <p className="mt-1 text-muted">{user.email}</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-1 text-2xl">{s.icon}</div>
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-primary">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {actions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className={`rounded-xl border bg-surface p-5 transition-colors ${
                a.disabled
                  ? 'cursor-not-allowed border-border opacity-50'
                  : 'border-border hover:border-accent'
              }`}
              onClick={a.disabled ? (e) => e.preventDefault() : undefined}
            >
              <div className="font-semibold text-primary">{a.label}</div>
              <div className="mt-1 text-sm text-muted">{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-primary">Recent Activity</h2>
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-muted">No recent activity yet.</p>
          <p className="mt-1 text-sm text-muted">Play your first match to see it here.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/DashboardPage.tsx && git commit -m "feat(web): add DashboardPage"
```

---

## Task 12: PricingPage

**Files:**
- Create: `web/src/pages/PricingPage.tsx`

- [ ] **Step 1: Create `web/src/pages/PricingPage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface CheckoutResponse {
  checkoutUrl: string;
}

const creditPacks = [
  { packSize: 10, label: 'Starter', credits: 10, price: '€2.99', popular: false },
  { packSize: 25, label: 'Popular', credits: 25, price: '€6.99', popular: true },
  { packSize: 50, label: 'Best Value', credits: 50, price: '€12.99', popular: false },
] as const;

const ballerBenefits = [
  'Unlimited competitive matches',
  'Baller badge on your profile',
  'Priority matchmaking',
];

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreditPurchase = async (packSize: 10 | 25 | 50) => {
    if (!user) { navigate('/login'); return; }
    setLoadingKey(`credits_${packSize}`);
    setError('');
    try {
      const res = await api.post<CheckoutResponse>('/api/monetization/buy-credits', { packSize });
      window.location.href = res.data.checkoutUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoadingKey(null);
    }
  };

  const handleBallerSubscribe = async () => {
    if (!user) { navigate('/login'); return; }
    setLoadingKey('baller');
    setError('');
    try {
      const res = await api.post<CheckoutResponse>('/api/monetization/subscribe');
      window.location.href = res.data.checkoutUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoadingKey(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-primary sm:text-4xl">Get Credits or Go Baller</h1>
        <p className="mt-3 text-muted">
          Credits let you play competitive matches. Go Baller for unlimited play.
        </p>
      </div>

      {error && (
        <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Credit packs */}
      <h2 className="mb-6 text-xl font-semibold text-primary">Credit Packs</h2>
      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        {creditPacks.map((pack) => {
          const key = `credits_${pack.packSize}`;
          const isLoading = loadingKey === key;

          return (
            <div
              key={pack.packSize}
              className={`relative rounded-xl border p-6 ${
                pack.popular ? 'border-accent' : 'border-border'
              } bg-surface`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
                    Popular
                  </span>
                </div>
              )}
              <h3 className="text-lg font-semibold text-primary">{pack.label}</h3>
              <div className="my-4">
                <span className="text-3xl font-bold text-primary">{pack.credits}</span>
                <span className="ml-1 text-muted">credits</span>
              </div>
              <div className="mb-6 text-2xl font-bold text-accent">{pack.price}</div>
              <button
                onClick={() => void handleCreditPurchase(pack.packSize)}
                disabled={isLoading}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  pack.popular
                    ? 'bg-accent text-white hover:bg-green-600'
                    : 'border border-border text-primary hover:border-accent'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Redirecting…
                  </span>
                ) : (
                  `Buy ${pack.credits} Credits`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Baller subscription */}
      <h2 className="mb-6 text-xl font-semibold text-primary">Balling Baller</h2>
      <div className="rounded-xl border border-accent bg-surface p-8">
        {user?.isBaller ? (
          <div className="text-center">
            <div className="mb-3 text-3xl">🎾</div>
            <h3 className="text-xl font-bold text-accent">You&apos;re a Baller!</h3>
            {user.ballerExpiresAt && (
              <p className="mt-2 text-sm text-muted">
                Active until {new Date(user.ballerExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl font-bold text-primary">Balling Baller</h3>
              <p className="mt-1 text-muted">
                <span className="text-2xl font-bold text-accent">€7.99</span>
                <span className="text-sm"> / month</span>
              </p>
              <ul className="mt-4 space-y-2">
                {ballerBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-muted">
                    <span className="text-accent">✓</span> {b}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => void handleBallerSubscribe()}
              disabled={loadingKey === 'baller'}
              className="rounded-lg bg-accent px-8 py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {loadingKey === 'baller' ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Redirecting…
                </span>
              ) : (
                'Go Baller'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/PricingPage.tsx && git commit -m "feat(web): add PricingPage with credit packs and Baller subscription"
```

---

## Task 13: Payment Pages

**Files:**
- Create: `web/src/pages/PaymentSuccessPage.tsx`
- Create: `web/src/pages/PaymentCancelPage.tsx`

- [ ] **Step 1: Create `web/src/pages/PaymentSuccessPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { BalanceResponse } from '../lib/types';

export default function PaymentSuccessPage() {
  const { refetch } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const reload = async () => {
      try {
        const res = await api.get<BalanceResponse>('/api/monetization/balance');
        setCredits(res.data.totalCredits);
        await refetch();
      } catch {
        // non-fatal — page still shows success
      }
    };
    void reload();
  }, [refetch]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl">🎾</div>
        <h1 className="mb-3 text-3xl font-bold text-primary">Payment successful!</h1>
        <p className="mb-2 text-muted">Your account has been updated.</p>
        {credits !== null && (
          <p className="mb-8 text-lg font-semibold text-accent">⚡ {credits} credits available</p>
        )}
        <Link
          to="/dashboard"
          className="inline-block rounded-lg bg-accent px-8 py-3 font-semibold text-white hover:bg-green-600"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `web/src/pages/PaymentCancelPage.tsx`**

```tsx
import { Link } from 'react-router-dom';

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl">❌</div>
        <h1 className="mb-3 text-3xl font-bold text-primary">Payment cancelled</h1>
        <p className="mb-8 text-muted">No charges were made. You can try again whenever you&apos;re ready.</p>
        <Link
          to="/pricing"
          className="inline-block rounded-lg bg-accent px-8 py-3 font-semibold text-white hover:bg-green-600"
        >
          Back to Pricing
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/PaymentSuccessPage.tsx web/src/pages/PaymentCancelPage.tsx && git commit -m "feat(web): add PaymentSuccess and PaymentCancel pages"
```

---

## Task 14: TournamentsPage

**Files:**
- Create: `web/src/pages/TournamentsPage.tsx`

- [ ] **Step 1: Create `web/src/pages/TournamentsPage.tsx`**

```tsx
import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TournamentCard from '../components/TournamentCard';
import { useTournaments } from '../hooks/useTournaments';
import { useAuth } from '../context/AuthContext';
import type { Sport, TournamentStatus } from '../lib/types';

export default function TournamentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [sport, setSport] = useState<Sport | ''>((searchParams.get('sport') as Sport) ?? '');
  const [status, setStatus] = useState<TournamentStatus | ''>((searchParams.get('status') as TournamentStatus) ?? '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const filters = useMemo(
    () => ({ sport: sport || undefined, status: status || undefined, search: search || undefined }),
    [sport, status, search]
  );

  const { tournaments, loading, error } = useTournaments(filters);

  const updateParams = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    value ? next.set(key, value) : next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const selectClass =
    'rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-accent';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-primary">Tournaments</h1>
        {user?.role === 'ORGANIZER' && (
          <Link
            to="/tournaments/new"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            + Create Tournament
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row">
        <select value={sport} onChange={(e) => { setSport(e.target.value as Sport | ''); updateParams('sport', e.target.value); }} className={selectClass}>
          <option value="">All Sports</option>
          <option value="PADEL">Padel</option>
          <option value="TENNIS">Tennis</option>
          <option value="SQUASH">Squash</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value as TournamentStatus | ''); updateParams('status', e.target.value); }} className={selectClass}>
          <option value="">All Statuses</option>
          <option value="REGISTRATION_OPEN">Registration Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); updateParams('search', e.target.value); }}
          placeholder="Search tournaments…"
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder-muted outline-none focus:border-accent"
        />
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-muted">No tournaments found.</p>
          <p className="mt-1 text-sm text-muted">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/TournamentsPage.tsx && git commit -m "feat(web): add TournamentsPage with filters"
```

---

## Task 15: TournamentDetailPage

**Files:**
- Create: `web/src/pages/TournamentDetailPage.tsx`

- [ ] **Step 1: Create `web/src/pages/TournamentDetailPage.tsx`**

```tsx
import { useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTournament } from '../hooks/useTournaments';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SportIcon from '../components/SportIcon';
import Countdown from '../components/Countdown';
import BracketView from '../components/BracketView';
import RoundRobinView from '../components/RoundRobinView';
import { formatCentsToEuros } from '../components/TournamentCard';

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ROUND_ROBIN: 'Round Robin',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  REGISTRATION_OPEN: { label: 'Registration Open', color: 'text-accent' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-400' },
  COMPLETED: { label: 'Completed', color: 'text-muted' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { tournament, loading, error } = useTournament(id!);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const rawPaymentStatus = searchParams.get('payment');
  const paymentStatus =
    rawPaymentStatus === 'success' || rawPaymentStatus === 'cancelled'
      ? rawPaymentStatus
      : null;

  const playerMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (tournament?.registrations) {
      for (const reg of tournament.registrations) {
        if (reg.user) map[reg.userId] = reg.user.name;
      }
    }
    return map;
  }, [tournament?.registrations]);

  const isRegistered = useMemo(
    () => !!user && !!tournament?.registrations?.some((r) => r.userId === user.id),
    [user, tournament?.registrations]
  );

  const spotsUsed = tournament?._count?.registrations ?? tournament?.registrations?.length ?? 0;
  const isFull = tournament ? spotsUsed >= tournament.maxPlayers : false;

  const handleJoin = async () => {
    if (!tournament) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await api.post<{ url: string }>(`/api/tournaments/${tournament.id}/join`);
      const parsed = new URL(res.data.url, window.location.origin);
      const isSameOrigin = parsed.origin === window.location.origin;
      const isTrustedPayment = parsed.hostname.endsWith('.stripe.com');
      if (!isSameOrigin && !isTrustedPayment) throw new Error('Unexpected redirect URL');
      window.location.href = res.data.url;
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-red-400">{error ?? 'Tournament not found'}</p>
        <Link to="/tournaments" className="mt-4 inline-block text-accent hover:underline">
          ← Back to Tournaments
        </Link>
      </div>
    );
  }

  const statusInfo = statusLabels[tournament.status] ?? statusLabels.COMPLETED;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Payment banner */}
      {paymentStatus === 'success' && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          Payment successful! You are now registered.
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-400">
          Payment was cancelled. You can try joining again.
        </div>
      )}

      <Link to="/tournaments" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        ← Back to Tournaments
      </Link>

      {/* Info card */}
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SportIcon sport={tournament.sport} className="text-3xl" />
            <div>
              <h1 className="text-2xl font-bold text-primary sm:text-3xl">{tournament.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                <span className="rounded border border-border px-2 py-0.5 text-xs text-muted">
                  {formatLabels[tournament.format] ?? tournament.format}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-accent">
              {tournament.entryFee === 0 ? 'Free' : formatCentsToEuros(tournament.entryFee)}
            </p>
            <p className="text-xs text-muted">entry fee</p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-primary">{formatDate(tournament.date)}</p>
            <p className="text-xs text-muted">Date &amp; Time</p>
          </div>
          <div>
            <p className="text-sm font-medium text-primary">{tournament.location}</p>
            {tournament.venue && <p className="text-xs text-muted">{tournament.venue}</p>}
          </div>
        </div>

        {tournament.description && (
          <div className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-muted">About</h3>
            <p className="text-sm leading-relaxed text-primary">{tournament.description}</p>
          </div>
        )}

        {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'IN_PROGRESS') && (
          <div className="mb-6"><Countdown targetDate={tournament.date} /></div>
        )}

        {/* Spots progress */}
        <div className="mb-6">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-primary">{spotsUsed} / {tournament.maxPlayers} spots filled</span>
            <span className="text-muted">{tournament.maxPlayers - spotsUsed} remaining</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min((spotsUsed / tournament.maxPlayers) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Players */}
        {tournament.registrations && tournament.registrations.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-muted">Registered Players</h3>
            <div className="flex flex-wrap gap-2">
              {tournament.registrations.slice(0, 8).map((reg) => (
                <span key={reg.id} className="rounded-full border border-border bg-base px-3 py-1 text-sm text-primary">
                  {reg.user?.name ?? 'Player'}
                </span>
              ))}
              {tournament.registrations.length > 8 && (
                <span className="rounded-full border border-border bg-base px-3 py-1 text-sm text-muted">
                  +{tournament.registrations.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Join action */}
        <div className="border-t border-border pt-6">
          {joinError && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {joinError}
            </div>
          )}
          {tournament.status === 'REGISTRATION_OPEN' && (
            <>
              {!user && (
                <Link to="/login" className="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-green-600">
                  Log in to Join
                </Link>
              )}
              {user && isRegistered && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-6 py-3 font-semibold text-accent">
                  ✓ You&apos;re Registered
                </span>
              )}
              {user && !isRegistered && !isFull && (
                <button
                  onClick={() => void handleJoin()}
                  disabled={joining}
                  className="rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-60"
                >
                  {joining ? 'Redirecting to payment…' : `Join — ${tournament.entryFee === 0 ? 'Free' : formatCentsToEuros(tournament.entryFee)}`}
                </button>
              )}
              {user && !isRegistered && isFull && (
                <span className="rounded-lg border border-border px-6 py-3 font-semibold text-muted">
                  Tournament Full
                </span>
              )}
            </>
          )}
          {tournament.status === 'CANCELLED' && (
            <p className="text-sm font-medium text-red-400">This tournament has been cancelled.</p>
          )}
        </div>
      </div>

      {/* Bracket */}
      {(tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') &&
        tournament.matches && tournament.matches.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="mb-6 text-xl font-bold text-primary">
              {tournament.status === 'COMPLETED' ? 'Final Results' : 'Live Bracket'}
            </h2>
            {tournament.format === 'ROUND_ROBIN' ? (
              <RoundRobinView matches={tournament.matches} players={playerMap} />
            ) : (
              <BracketView matches={tournament.matches} players={playerMap} highlightPlayerId={user?.id} />
            )}
          </div>
        )}

      {tournament.organizer && (
        <div className="mt-6 text-center text-sm text-muted">
          Organized by <span className="font-medium text-primary">{tournament.organizer.name}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/TournamentDetailPage.tsx && git commit -m "feat(web): add TournamentDetailPage with bracket and join flow"
```

---

## Task 16: CreateTournamentPage

**Files:**
- Create: `web/src/pages/CreateTournamentPage.tsx`

- [ ] **Step 1: Create `web/src/pages/CreateTournamentPage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../api/client';
import type { Tournament } from '../lib/types';

const createSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  sport: z.enum(['PADEL', 'TENNIS', 'SQUASH']),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(2, 'Location is required'),
  venue: z.string().optional(),
  maxPlayers: z.coerce.number().min(4).max(128),
  entryFeeEuros: z.coerce.number().min(0),
  description: z.string().optional(),
});

// Keep form state as strings; Zod coerce handles conversion at submit time
interface FormState {
  name: string;
  sport: 'PADEL' | 'TENNIS' | 'SQUASH';
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';
  date: string;
  location: string;
  venue: string;
  maxPlayers: string;
  entryFeeEuros: string;
  description: string;
}

const inputClass =
  'w-full rounded-lg border border-border bg-base px-4 py-3 text-primary placeholder-muted outline-none focus:border-accent';
const labelClass = 'mb-1.5 block text-sm font-medium text-muted';
const selectClass =
  'w-full rounded-lg border border-border bg-base px-4 py-3 text-primary outline-none focus:border-accent';

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    name: '', sport: 'PADEL', format: 'SINGLE_ELIMINATION',
    date: '', location: '', venue: '', maxPlayers: '16',
    entryFeeEuros: '0', description: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = createSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    const { entryFeeEuros, venue, description, ...rest } = result.data;

    setSubmitting(true);
    try {
      const res = await api.post<Tournament>('/api/tournaments', {
        ...rest,
        entryFee: Math.round(entryFeeEuros * 100), // convert to cents
        venue: venue || undefined,
        description: description || undefined,
      });
      navigate(`/tournaments/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link to="/organizer" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        ← Back to Organizer Dashboard
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-primary">Create Tournament</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <label className={labelClass}>Tournament Name</label>
          <input type="text" value={form.name} onChange={set('name')} placeholder="Spring Padel Championship" className={inputClass} required />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Sport</label>
            <select value={form.sport} onChange={set('sport')} className={selectClass}>
              <option value="PADEL">Padel</option>
              <option value="TENNIS">Tennis</option>
              <option value="SQUASH">Squash</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Format</label>
            <select value={form.format} onChange={set('format')} className={selectClass}>
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="DOUBLE_ELIMINATION">Double Elimination</option>
              <option value="ROUND_ROBIN">Round Robin</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Date &amp; Time</label>
          <input type="datetime-local" value={form.date} onChange={set('date')} className={inputClass} required />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Location (City)</label>
            <input type="text" value={form.location} onChange={set('location')} placeholder="Groningen" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Venue (optional)</label>
            <input type="text" value={form.venue} onChange={set('venue')} placeholder="Padel Park Noord" className={inputClass} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Max Players</label>
            <input type="number" value={form.maxPlayers} onChange={set('maxPlayers')} min={4} max={128} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Entry Fee (€, 0 = free)</label>
            <input type="number" value={form.entryFeeEuros} onChange={set('entryFeeEuros')} min={0} step={0.01} className={inputClass} required />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description (optional)</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Tell players what to expect…"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Tournament'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/CreateTournamentPage.tsx && git commit -m "feat(web): add CreateTournamentPage"
```

---

## Task 17: ManageTournamentPage

**Files:**
- Create: `web/src/pages/ManageTournamentPage.tsx`

- [ ] **Step 1: Create `web/src/pages/ManageTournamentPage.tsx`**

```tsx
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTournament } from '../hooks/useTournaments';
import { api } from '../api/client';
import BracketView from '../components/BracketView';
import RoundRobinView from '../components/RoundRobinView';
import { formatCentsToEuros } from '../components/TournamentCard';
import type { Match } from '../lib/types';

export default function ManageTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tournament, loading, error, refetch } = useTournament(id!);

  const [resultForm, setResultForm] = useState<{ matchId: string; winnerId: string; score: string }>({
    matchId: '', winnerId: '', score: '',
  });
  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  const playerMap: Record<string, string> = {};
  if (tournament?.registrations) {
    for (const reg of tournament.registrations) {
      if (reg.user) playerMap[reg.userId] = reg.user.name;
    }
  }

  const doAction = async (path: string, key: string, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    setActionLoading(key);
    setActionError('');
    try {
      await api.post(`/api/tournaments/${id}/${path}`);
      await refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  const submitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultForm.matchId || !resultForm.winnerId) return;
    setActionLoading('result');
    setActionError('');
    try {
      await api.put(`/api/matches/${resultForm.matchId}/result`, {
        winnerId: resultForm.winnerId,
        score: resultForm.score || undefined,
      });
      setResultForm({ matchId: '', winnerId: '', score: '' });
      await refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save result');
    } finally {
      setActionLoading('');
    }
  };

  const selectedMatch = tournament?.matches?.find((m) => m.id === resultForm.matchId) as Match | undefined;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-red-400">{error ?? 'Tournament not found'}</p>
        <Link to="/organizer" className="mt-4 inline-block text-accent hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/organizer" className="text-sm text-muted hover:text-primary">← Organizer Dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold text-primary">{tournament.name}</h1>
          <p className="text-sm text-muted capitalize">{tournament.status.replace('_', ' ').toLowerCase()}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/tournaments/${id}`}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:border-accent hover:text-primary"
          >
            View Public Page
          </Link>
          {tournament.status === 'REGISTRATION_OPEN' && (
            <button
              onClick={() => void doAction('close-registration', 'close', 'Close registration and generate bracket?')}
              disabled={actionLoading === 'close'}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {actionLoading === 'close' ? 'Closing…' : 'Close Registration'}
            </button>
          )}
          {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'IN_PROGRESS') && (
            <button
              onClick={() => void doAction('cancel', 'cancel', 'Cancel this tournament? This cannot be undone.')}
              disabled={actionLoading === 'cancel'}
              className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:border-red-400 disabled:opacity-60"
            >
              {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Tournament'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Registrations */}
      <div className="mb-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-primary">
          Registrations ({tournament._count?.registrations ?? tournament.registrations?.length ?? 0} / {tournament.maxPlayers})
        </h2>
        {!tournament.registrations || tournament.registrations.length === 0 ? (
          <p className="text-sm text-muted">No registrations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left text-xs font-semibold uppercase text-muted">Player</th>
                  <th className="py-2 pr-4 text-left text-xs font-semibold uppercase text-muted">Email</th>
                  <th className="py-2 text-left text-xs font-semibold uppercase text-muted">Paid</th>
                </tr>
              </thead>
              <tbody>
                {tournament.registrations.map((reg) => (
                  <tr key={reg.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium text-primary">{reg.user?.name ?? '—'}</td>
                    <td className="py-2 pr-4 text-muted">{tournament.entryFee === 0 ? 'Free' : (reg.paidAt ? formatCentsToEuros(tournament.entryFee) : 'Pending')}</td>
                    <td className="py-2 text-muted">{reg.paidAt ? new Date(reg.paidAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Match result entry */}
      {tournament.status === 'IN_PROGRESS' && tournament.matches && tournament.matches.length > 0 && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-primary">Enter Match Result</h2>
          <form onSubmit={(e) => void submitResult(e)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase text-muted">Match</label>
              <select
                value={resultForm.matchId}
                onChange={(e) => setResultForm((f) => ({ ...f, matchId: e.target.value, winnerId: '' }))}
                className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-primary outline-none focus:border-accent"
              >
                <option value="">Select match…</option>
                {tournament.matches
                  .filter((m) => m.player1Id && m.player2Id && !m.winnerId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      R{m.round} P{m.position}: {playerMap[m.player1Id!] ?? 'TBD'} vs {playerMap[m.player2Id!] ?? 'TBD'}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase text-muted">Winner</label>
              <select
                value={resultForm.winnerId}
                onChange={(e) => setResultForm((f) => ({ ...f, winnerId: e.target.value }))}
                disabled={!selectedMatch}
                className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-50"
              >
                <option value="">Select winner…</option>
                {selectedMatch?.player1Id && (
                  <option value={selectedMatch.player1Id}>{playerMap[selectedMatch.player1Id] ?? 'Player 1'}</option>
                )}
                {selectedMatch?.player2Id && (
                  <option value={selectedMatch.player2Id}>{playerMap[selectedMatch.player2Id] ?? 'Player 2'}</option>
                )}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-muted">Score (optional)</label>
              <input
                type="text"
                value={resultForm.score}
                onChange={(e) => setResultForm((f) => ({ ...f, score: e.target.value }))}
                placeholder="6-3, 6-4"
                className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-primary outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading === 'result' || !resultForm.matchId || !resultForm.winnerId}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {actionLoading === 'result' ? 'Saving…' : 'Save Result'}
            </button>
          </form>
        </div>
      )}

      {/* Bracket */}
      {tournament.matches && tournament.matches.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-primary">Bracket</h2>
          {tournament.format === 'ROUND_ROBIN' ? (
            <RoundRobinView matches={tournament.matches} players={playerMap} />
          ) : (
            <BracketView matches={tournament.matches} players={playerMap} />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/ManageTournamentPage.tsx && git commit -m "feat(web): add ManageTournamentPage"
```

---

## Task 18: OrganizerDashboardPage

**Files:**
- Create: `web/src/pages/OrganizerDashboardPage.tsx`

- [ ] **Step 1: Create `web/src/pages/OrganizerDashboardPage.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useMyTournaments } from '../hooks/useTournaments';
import { useAuth } from '../context/AuthContext';
import SportIcon from '../components/SportIcon';
import { formatCentsToEuros } from '../components/TournamentCard';

const statusColors: Record<string, string> = {
  REGISTRATION_OPEN: 'text-accent',
  IN_PROGRESS: 'text-yellow-400',
  COMPLETED: 'text-muted',
  CANCELLED: 'text-red-400',
};

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const { tournaments, loading, error } = useMyTournaments();

  const totalPlayers = tournaments.reduce((sum, t) => sum + (t._count?.registrations ?? 0), 0);
  const totalRevenue = tournaments.reduce((sum, t) => sum + (t._count?.registrations ?? 0) * t.entryFee, 0);

  const stats = [
    { label: 'Tournaments', value: tournaments.length },
    { label: 'Total Players', value: totalPlayers },
    { label: 'Revenue', value: formatCentsToEuros(totalRevenue) },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Organizer Dashboard</h1>
          <p className="mt-1 text-muted">{user?.name}</p>
        </div>
        <Link
          to="/tournaments/new"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-600"
        >
          + New Tournament
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-5 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tournament list */}
      <h2 className="mb-4 text-lg font-semibold text-primary">Your Tournaments</h2>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-12 text-center">
          <p className="text-muted">No tournaments yet.</p>
          <Link to="/tournaments/new" className="mt-3 inline-block text-sm text-accent hover:underline">
            Create your first tournament
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <SportIcon sport={t.sport} className="text-xl" />
                <div>
                  <p className="font-semibold text-primary">{t.name}</p>
                  <p className={`text-xs ${statusColors[t.status] ?? 'text-muted'}`}>
                    {t.status.replace('_', ' ')} · {t._count?.registrations ?? 0}/{t.maxPlayers} players
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">{formatCentsToEuros(t.entryFee)}</span>
                <Link
                  to={`/tournaments/${t.id}/manage`}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-primary"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/OrganizerDashboardPage.tsx && git commit -m "feat(web): add OrganizerDashboardPage"
```

---

## Task 19: Final Build Verification & Root Update

**Files:**
- Modify: `/Users/fernandoorteganuez/Desktop/Balling/package.json`

- [ ] **Step 1: Run TypeScript build**

```bash
cd web && npm run build
```

Expected: no TypeScript errors. If errors appear, fix them in the relevant files before proceeding.

- [ ] **Step 2: Run all tests**

```bash
cd web && npm test
```

Expected: all 4 tests pass.

- [ ] **Step 3: Start dev server and verify all pages load**

```bash
cd web && npm run dev
```

Manually verify in browser:
- [ ] `/` — HomePage renders with hero section
- [ ] `/login` — LoginPage renders, form submits (test with real Supabase credentials or skip if no test account)
- [ ] `/register` — RegisterPage renders
- [ ] `/dashboard` — redirects to `/login` when not authenticated
- [ ] `/pricing` — 3 credit pack cards + Baller card visible
- [ ] `/tournaments` — loads tournament list (may be empty if DB is empty, that's fine)
- [ ] `/payment/cancel` — shows cancel message
- [ ] All pages render at 375px width (toggle in browser devtools)
- [ ] Navbar shows "Log in" / "Sign up" buttons when logged out

- [ ] **Step 4: Update root `package.json` to include `web/`**

Open `/Users/fernandoorteganuez/Desktop/Balling/package.json` and add web scripts alongside the existing ones:

```json
{
  "name": "balling",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\" \"npm run dev:web\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "dev:web": "cd web && npm run dev",
    "install:all": "npm install && cd server && npm install && cd ../client && npm install && cd ../web && npm install",
    "db:migrate": "cd server && npx prisma migrate dev",
    "db:seed": "cd server && npx prisma db seed"
  }
}
```

- [ ] **Step 5: Final commit**

```bash
git add package.json && git commit -m "feat(web): complete web client — 12 pages, dark design system, Supabase auth, Stripe payments"
```

---

## Verification Checklist

After all tasks complete:

1. `cd web && npm run build` — TypeScript compiles with zero errors
2. `cd web && npm test` — 4 tests pass
3. `npm run dev:web` — server starts on port 5174
4. Auth flow: register → email confirm → login → redirect to `/dashboard`
5. Credit purchase: `/pricing` → click "Buy 25 Credits" → spinner → Stripe Checkout URL
6. Baller check: if user is Baller, `/pricing` shows "You're a Baller 🎾"
7. Tournament join: `/tournaments/:id` → "Join Tournament" → Stripe or free redirect
8. Bracket renders on `/tournaments/:id` for IN_PROGRESS or COMPLETED tournaments
9. Organizer flow: `/tournaments/new` → create → `/organizer` shows it → `/tournaments/:id/manage` works
10. All pages responsive at 375px width
11. Navbar credits pill shows `⚡ N credits` when logged in
