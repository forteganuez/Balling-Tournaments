import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return undefined;
}

async function resolveUser(token: string): Promise<{ id: string; email: string; role: string } | null> {
  const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !supabaseUser || !supabaseUser.email) return null;

  // Look up or create user in our Prisma database
  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { providerId: supabaseUser.id },
        { email: supabaseUser.email },
      ],
    },
    select: { id: true, email: true, role: true, providerId: true },
  });

  if (dbUser) {
    // Ensure providerId is linked
    if (!dbUser.providerId) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { providerId: supabaseUser.id },
      });
    }
  } else {
    // Auto-create user from Supabase auth
    const meta = supabaseUser.user_metadata ?? {};
    const provider = supabaseUser.app_metadata?.provider ?? 'email';
    const authProvider = provider === 'google' ? 'GOOGLE' : provider === 'apple' ? 'APPLE' : 'LOCAL';

    dbUser = await prisma.user.create({
      data: {
        name: meta.name || meta.full_name || supabaseUser.email!.split('@')[0],
        email: supabaseUser.email!,
        authProvider,
        providerId: supabaseUser.id,
        avatarUrl: meta.avatar_url || meta.picture || null,
      },
      select: { id: true, email: true, role: true, providerId: true },
    });
  }

  return { id: dbUser.id, email: dbUser.email, role: dbUser.role };
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const user = await resolveUser(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    logger.warn('Unexpected auth failure in authenticate', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const user = await resolveUser(token);
    if (user) {
      req.user = user;
    }
  } catch (err: unknown) {
    logger.warn('Unexpected auth failure in optionalAuth', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Token invalid — proceed without user
  }

  next();
}
