import * as authService from '../services/authService.js';

function setRefreshCookie(res, refreshPlain) {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10);
  res.cookie('jid', refreshPlain, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: 1000 * 60 * 60 * 24 * days
  });
}

export async function signup(req, res) {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await authService.registerUser({ email, password, name, role });
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function refresh(req, res) {
  try {
    const token = req.cookies?.jid;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const { user, accessToken, refreshToken } = await authService.rotateRefreshToken(token);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function logout(req, res) {
  try {
    const token = req.cookies?.jid;
    if (token) await authService.revokeRefreshToken(token);
    res.clearCookie('jid', { path: '/api/auth/refresh' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
