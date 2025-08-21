import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prismaClient.js";
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "90d",
  });
  return { accessToken, refreshToken };
};

// ✅ Signup
router.post("/signup", async (req, res) => {
  try {
    const { email, name, password, role } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }    

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: role || "viewer",
      },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.refreshToken.create({
      data: {
        tokenHash: bcrypt.hashSync(refreshToken, 10),
        userId: user.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken, refreshToken, user });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }    

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.refreshToken.create({
      data: {
        tokenHash: bcrypt.hashSync(refreshToken, 90),
        userId: user.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken, refreshToken, user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Refresh Token
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = decoded.userId;

    // Check DB for stored tokens
    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId },
    });

    if (!storedTokens || storedTokens.length === 0) {
      return res.status(401).json({ error: "Refresh token not found" });
    }

    let isValid = false;
    for (let stored of storedTokens) {
      const match = await bcrypt.compare(refreshToken, stored.tokenHash);
      if (match && stored.expiresAt > new Date()) {
        isValid = true;
        break;
      }
    }

    if (!isValid) return res.status(401).json({ error: "Invalid or expired refresh token" });

    // Generate new tokens
    const { accessToken, refreshToken: newRefresh } = generateTokens(userId);

    await prisma.refreshToken.create({
      data: {
        tokenHash: bcrypt.hashSync(newRefresh, 90),
        userId,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});
// Refresh token end

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});


export default router;
