import dotenv from 'dotenv';
import app from './app.js';
import prisma from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
    app.listen(PORT, () => console.log(`🚀 Backend listening on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
