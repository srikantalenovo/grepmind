import bcrypt from 'bcrypt';
import prisma from '../config/db.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/tokens.js';

const SALT_ROUNDS = 12;

export async function registerUser({ email, password, name }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  return user;
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Invalid credentials');

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshPlain = generateRefreshToken();
  const refreshHash = hashToken(refreshPlain);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: refreshHash, expiresAt } });

  return { user, accessToken, refreshToken: refreshPlain };
}

export async function refreshTokens(oldTokenPlain) {
  const oldHash = hashToken(oldTokenPlain);
  const dbToken = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!dbToken) throw new Error('Invalid token');
  if (dbToken.revokedAt || dbToken.expiresAt < new Date()) throw new Error('Token expired or revoked');

  const user = await prisma.user.findUnique({ where: { id: dbToken.userId } });
  if (!user) throw new Error('User not found');

  // rotate
  const newPlain = generateRefreshToken();
  const newHash = hashToken(newPlain);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (prismaTx) => {
    const created = await prismaTx.refreshToken.create({ data: { userId: user.id, tokenHash: newHash, expiresAt } });
    await prismaTx.refreshToken.update({ where: { id: dbToken.id }, data: { revokedAt: new Date(), replacedBy: created.id } });
  });

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  return { accessToken, refreshToken: newPlain, user };
}

export async function revokeRefreshToken(tokenPlain) {
  const hash = hashToken(tokenPlain);
  await prisma.refreshToken.updateMany({ where: { tokenHash: hash, revokedAt: null }, data: { revokedAt: new Date() } });
}
