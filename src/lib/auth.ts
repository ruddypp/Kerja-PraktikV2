import { sign, verify } from 'jsonwebtoken';

export interface UserData {
  id: number;
  email: string;
  name?: string;
  role: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Menghasilkan token JWT dengan payload pengguna
 */
export function generateToken(payload: UserData): string {
  return sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

/**
 * Memverifikasi token JWT
 */
export function verifyToken(token: string): UserData | null {
  try {
    return verify(token, JWT_SECRET) as UserData;
  } catch {
    return null;
  }
}

/**
 * Mendekode token tanpa verifikasi (untuk middleware)
 */
export function decodeToken(token: string): UserData | null {
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return decoded as UserData;
  } catch {
    return null;
  }
}

/**
 * Fungsi untuk mendapatkan user dari token
 */
export function getUserFromToken(token: string): UserData | null {
  return verifyToken(token);
}

/**
 * Mengecek apakah user adalah admin
 */
export function isAdmin(user: UserData | null): boolean {
  return user?.role === 'Admin';
}

/**
 * Fungsi untuk mendapatkan route berdasarkan role
 */
export function getRedirectPathByRole(role: string): string {
  if (role === 'Admin') {
    return '/admin-dashboard';
  }
  return '/user/barang';
} 