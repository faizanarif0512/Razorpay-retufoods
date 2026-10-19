import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getDb, verifyPassword } from '../db/index.ts';

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'retu_secret_session_key_min_32_characters_long_replace_in_prod';
const SESSION_COOKIE_NAME = 'retu_admin_token';

export interface AdminSession {
  adminId: string;
  email: string;
  role: string;
  name: string;
  expiresAt: number;
}

export function createAdminToken(session: Omit<AdminSession, 'expiresAt'>): string {
  // 7 days expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ ...session, expiresAt });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');
  return `${b64Payload}.${signature}`;
}

export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const [b64Payload, signature] = token.split('.');
    if (!b64Payload || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8')) as AdminSession;
    if (Date.now() > payload.expiresAt) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getAdminFromRequest(req: NextRequest): AdminSession | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function authenticateAdminCredentials(email: string, password: string): AdminSession | null {
  const db = getDb();
  const admin = db.prepare('SELECT * FROM admin_users WHERE LOWER(email) = ? AND is_active = 1').get(email.toLowerCase().trim());
  if (!admin) return null;

  const valid = verifyPassword(password, admin.password_hash, admin.password_salt);
  if (!valid) return null;

  // Update last login
  const now = new Date().toISOString();
  db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(now, admin.id);

  return {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
}

export { SESSION_COOKIE_NAME };

