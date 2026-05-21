import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authRequired);

router.get('/', requireRole('ADMIN', 'MANAGER'), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { id: 'asc' },
  });
  res.json(users);
});

const userSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'WAITER', 'CASHIER']),
  active: z.boolean().optional(),
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const exists = await prisma.user.findUnique({ where: { username: data.username } });
  if (exists) return res.status(409).json({ error: 'Usuário já existe' });

  const created = await prisma.user.create({
    data: { ...data, password: await bcrypt.hash(data.password, 10) },
    select: { id: true, username: true, name: true, role: true, active: true },
  });
  res.status(201).json(created);
});

const updateSchema = z.object({
  password: z.string().min(4).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'WAITER', 'CASHIER']).optional(),
  active: z.boolean().optional(),
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = { ...parsed.data };
  if (data.password) data.password = await bcrypt.hash(data.password, 10);
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true, active: true },
  });
  res.json(updated);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.update({ where: { id }, data: { active: false } });
  res.json({ ok: true });
});

export default router;
