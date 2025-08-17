import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import prisma from "./prismaClient.js";
import adminRoutes from './routes/adminRoutes.js';
import resourcesRoutes from "./routes/resourcesRoutes.js";
import clusterRoutes from './routes/clusterRoutes.js';
import analyzerRoutes from './routes/analyzerRoutes.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Backend server is running" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/resources", resourcesRoutes);
app.use('/api/cluster', clusterRoutes);
app.use('/analyzer', analyzerRoutes);
app.use('/api/analyzer', analyzerRoutes);

// Database init + extension check
async function initDatabase() {
  try {
    console.log("📡 Connecting to database...");
    await prisma.$queryRaw`SELECT 1`; // Simple test query
    console.log("✅ Database connection successful");

    // Ensure pgcrypto extension exists
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
    console.log("🔐 pgcrypto extension ensured");

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    console.log("📋 Existing tables:", tables.map(t => t.table_name).join(", ") || "None");

  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initDatabase();
});
