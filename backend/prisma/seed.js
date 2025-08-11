// backend/prisma/seed.js
import bcrypt from 'bcrypt';
import prisma from '../src/prismaClient.js';

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail }});

  if (!existing) {
    const pw = process.env.SEED_ADMIN_PW || 'Admin@123';
    const passwordHash = await bcrypt.hash(pw, 12);
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrator',
        passwordHash,
        role: 'admin',
        isActive: true,
      },
    });
    console.log('Created admin:', user.email);
  } else {
    console.log('Admin already exists');
  }

  await prisma.$disconnect();
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
