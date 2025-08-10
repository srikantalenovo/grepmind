import 'dotenv/config';
import app from './app.js';
import prisma from './config/prisma.js';

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected');
    app.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}
start();
