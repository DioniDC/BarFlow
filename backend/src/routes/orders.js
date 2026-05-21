import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const itemSchema = z.object({
  tableId: z.coerce.number(),
  productId: z.coerce.number().optional(),
  barcode: z.string().optional(),
  quantity: z.coerce.number().positive().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

router.post('/items', async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let product = null;
    let qty = data.quantity || 1;

    if (data.barcode) {
      const bc = await tx.barcode.findUnique({
        where: { code: data.barcode },
        include: { product: true },
      });
      if (!bc) throw Object.assign(new Error('Produto não encontrado'), { code: 'NF' });
      product = bc.product;
      if (!data.quantity) qty = Number(bc.quantity);
    } else if (data.productId) {
      product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw Object.assign(new Error('Produto não encontrado'), { code: 'NF' });
    } else {
      throw Object.assign(new Error('Informe productId ou barcode'), { code: 'BAD' });
    }

    const table = await tx.table.findUnique({ where: { id: data.tableId } });
    if (!table) throw Object.assign(new Error('Mesa/Comanda não encontrada'), { code: 'NF' });

    if (table.status === 'FREE') {
      await tx.table.update({
        where: { id: data.tableId },
        data: { status: 'OCCUPIED', openedAt: new Date() },
      });
    }

    const unitPrice = data.unitPrice ?? Number(product.price);
    const total = unitPrice * qty;

    const item = await tx.orderItem.create({
      data: {
        tableId: data.tableId,
        productId: product.id,
        quantity: qty,
        unitPrice,
        total,
        notes: data.notes,
        userId: req.user.id,
      },
      include: { product: true },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { stock: { decrement: qty } },
    });
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        type: 'OUT',
        quantity: qty,
        reason: `Mesa/Comanda ${table.number}`,
        userId: req.user.id,
      },
    });

    return item;
  });

  res.status(201).json(result);
});

router.delete('/items/:id', async (req, res) => {
  const id = Number(req.params.id);

  await prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({ where: { id } });
    if (!item) throw Object.assign(new Error('Item não encontrado'), { code: 'NF' });
    if (item.status === 'CANCELLED') return;

    await tx.orderItem.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: Number(item.quantity) } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        type: 'IN',
        quantity: Number(item.quantity),
        reason: `Cancelamento item #${id}`,
        userId: req.user.id,
      },
    });
  });
  res.json({ ok: true });
});

router.put('/items/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!['PENDING', 'DELIVERED'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  const updated = await prisma.orderItem.update({ where: { id }, data: { status } });
  res.json(updated);
});

export default router;
