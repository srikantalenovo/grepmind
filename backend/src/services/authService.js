import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { generateAccessToken, generateRefreshPlain, hashRefresh, refreshExpiryDate } from '../utils/tokens.js';

const SALT_ROUNDS = 12;

export async function registerUser({ email, password, name, role = 'viewer' }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const e = new Error('Email already registered');
    e.status = 400;
    throw e;
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role }
  });
  return user;
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const e = new Error('Invalid credentials');
    e.status = 400;
    throw e;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const e = new Error('Invalid credentials');
    e.status = 400;
    throw e;
  }

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshPlain = generateRefreshPlain();
  const refreshHash = hashRefresh(refreshPlain);
  const expiresAt = refreshExpiryDate();

  await prisma.refreshToken.create({
    data: { tokenHash: refreshHash, userId: user.id, expiresAt }
  });

  return { user, accessToken, refreshToken: refreshPlain };
}

export async function rotateRefreshToken(oldPlain) {
  const oldHash = hashRefresh(oldPlain);
  const dbToken = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!dbToken) {
    const e = new Error('Invalid refresh token');
    e.status = 401;
    throw e;
  }
  if (dbToken.revokedAt || dbToken.expiresAt < new Date()) {
    const e = new Error('Refresh token expired or revoked');
    e.status = 401;
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { id: dbToken.userId } });

  const newPlain = generateRefreshPlain();
  const newHash = hashRefresh(newPlain);
  const expiresAt = refreshExpiryDate();

  await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({ data: { tokenHash: newHash, userId: user.id, expiresAt } });
    await tx.refreshToken.update({ where: { id: dbToken.id }, data: { revokedAt: new Date(), replacedBy: created.id } });
  });

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  return { user, accessToken, refreshToken: newPlain };
}

export async function revokeRefreshToken(plain) {
  const hash = hashRefresh(plain);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}
