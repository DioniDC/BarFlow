import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const { customerId, status } = req.query;
  const where = {};
  if (customerId) where.customerId = Number(customerId);
  if (status) where.status = String(status);
  const items = await prisma.receivable.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

const receivableSchema = z.object({
  customerId: z.coerce.number(),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

router.post('/', requireRole('ADMIN', 'MANAGER', 'CASHIER'), async (req, res) => {
  const parsed = receivableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.receivable.create({ data: parsed.data });
  res.status(201).json(created);
});

const paySchema = z.object({
  amount: z.coerce.number().positive(),
});

router.post('/:id/pay', requireRole('ADMIN', 'MANAGER', 'CASHIER'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = paySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { amount } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const r = await tx.receivable.findUnique({ where: { id } });
    if (!r) throw Object.assign(new Error('Não encontrado'), { code: 'NF' });
    const newPaid = Number(r.paid) + amount;
    const totalAmount = Number(r.amount);
    let status = 'PARTIAL';
    let paidAt = null;
    if (newPaid >= totalAmount) {
      status = 'PAID';
      paidAt = new Date();
    }
    return tx.receivable.update({
      where: { id },
      data: { paid: newPaid, status, paidAt },
    });
  });

  res.json(result);
});

router.post('/:id/cancel', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.receivable.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
  res.json(updated);
});

export default router;
