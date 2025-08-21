import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '1d';
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '90', 90);

export function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function generateRefreshPlain() {
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefresh(tokenPlain) {
  return crypto.createHash('sha256').update(tokenPlain).digest('hex');
}

export function refreshExpiryDate() {
  return new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
}
