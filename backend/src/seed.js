import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

async function main() {
  const adminUser = process.env.SEED_ADMIN_USER || 'admin';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  const exists = await prisma.user.findUnique({ where: { username: adminUser } });
  if (!exists) {
    await prisma.user.create({
      data: {
        username: adminUser,
        password: await bcrypt.hash(adminPass, 10),
        name: 'Administrador',
        role: 'ADMIN',
      },
    });
    console.log(`[seed] usuário admin criado: ${adminUser} / ${adminPass}`);
  } else {
    console.log('[seed] admin já existe, ignorando');
  }

  const totalTables = await prisma.table.count();
  if (totalTables === 0) {
    const tables = Array.from({ length: 10 }).map((_, i) => ({
      number: String(i + 1),
      type: 'TABLE',
    }));
    await prisma.table.createMany({ data: tables });
    console.log('[seed] 10 mesas iniciais criadas');
  }

  const totalProducts = await prisma.product.count();
  if (totalProducts === 0) {
    const samples = [
      { name: 'Cerveja Long Neck', price: 8.0, stock: 100, category: 'Bebidas', barcodes: ['7891000100103'] },
      { name: 'Chopp 300ml', price: 6.5, stock: 200, category: 'Bebidas' },
      { name: 'Refrigerante Lata', price: 5.0, stock: 80, category: 'Bebidas', barcodes: ['7894900011517'] },
      { name: 'Porção Batata Frita', price: 25.0, stock: 50, category: 'Petiscos' },
    ];
    let code = 1000;
    for (const s of samples) {
      await prisma.product.create({
        data: {
          internalCode: code++,
          name: s.name,
          price: s.price,
          stock: s.stock,
          category: s.category,
          barcodes: { create: (s.barcodes || []).map((c) => ({ code: c, quantity: 1 })) },
        },
      });
    }
    console.log('[seed] produtos de exemplo criados');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
