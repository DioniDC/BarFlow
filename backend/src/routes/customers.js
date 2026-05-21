import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const { q } = req.query;
  const where = { active: true };
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' } },
      { document: { contains: String(q) } },
      { phone: { contains: String(q) } },
    ];
  }
  const items = await prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      receivables: { orderBy: { createdAt: 'desc' } },
      tables: { where: { status: { not: 'CLOSED' } } },
    },
  });
  if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' });

  const totals = await prisma.receivable.aggregate({
    where: { customerId: id, status: { in: ['OPEN', 'PARTIAL'] } },
    _sum: { amount: true, paid: true },
  });
  const open = Number(totals._sum.amount || 0) - Number(totals._sum.paid || 0);

  res.json({ ...customer, openBalance: open });
});

const customerSchema = z.object({
  name: z.string().min(1),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post('/', async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.customer.create({ data: parsed.data });
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const parsed = customerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updated = await prisma.customer.update({ where: { id }, data: parsed.data });
  res.json(updated);
});

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.customer.update({ where: { id }, data: { active: false } });
  res.json({ ok: true });
});

export default router;
