import * as authService from '../services/authService.js';

export async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await authService.registerUser({ email, password, name });
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });

    // set refresh token as HttpOnly cookie
    res.cookie('jid', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

export async function refresh(req, res) {
  try {
    const token = req.cookies?.jid;
    if (!token) return res.status(401).json({ error: 'No token' });

    const { accessToken, refreshToken, user } = await authService.refreshTokens(token);

    res.cookie('jid', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(401).json({ error: err.message });
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
