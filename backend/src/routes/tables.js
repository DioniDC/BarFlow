import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

function summarize(table) {
  const items = table.orderItems || [];
  const total = items
    .filter((i) => i.status !== 'CANCELLED')
    .reduce((acc, i) => acc + Number(i.total), 0);
  const paid = (table.payments || []).reduce((acc, p) => acc + Number(p.amount), 0);
  return { ...table, total, paid, balance: total - paid };
}

router.get('/', async (req, res) => {
  const { type, status } = req.query;
  const where = {};
  if (type) where.type = String(type);
  if (status) where.status = String(status);
  const items = await prisma.table.findMany({
    where,
    include: {
      customer: true,
      orderItems: { where: { status: { not: 'CANCELLED' } } },
      payments: true,
    },
    orderBy: [{ status: 'asc' }, { number: 'asc' }],
  });
  res.json(items.map(summarize));
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      customer: true,
      orderItems: {
        include: { product: true, user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      payments: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!table) return res.status(404).json({ error: 'Mesa/Comanda não encontrada' });
  res.json(summarize(table));
});

const tableSchema = z.object({
  number: z.string().min(1),
  label: z.string().optional().nullable(),
  type: z.enum(['TABLE', 'TAB']).default('TABLE'),
  customerId: z.coerce.number().optional().nullable(),
  customerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = tableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const created = await prisma.table.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Número já cadastrado' });
    throw e;
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const parsed = tableSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updated = await prisma.table.update({ where: { id }, data: parsed.data });
  res.json(updated);
});

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const hasItems = await prisma.orderItem.count({ where: { tableId: id } });
  if (hasItems > 0) {
    return res
      .status(400)
      .json({ error: 'Mesa/Comanda possui pedidos. Não é possível excluir.' });
  }
  await prisma.table.delete({ where: { id } });
  res.json({ ok: true });
});

// Abrir mesa/comanda (vincula cliente, define ocupada)
const openSchema = z.object({
  customerId: z.coerce.number().optional().nullable(),
  customerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post('/:id/open', async (req, res) => {
  const id = Number(req.params.id);
  const parsed = openSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const table = await prisma.table.update({
    where: { id },
    data: {
      status: 'OCCUPIED',
      openedAt: new Date(),
      closedAt: null,
      customerId: data.customerId ?? null,
      customerName: data.customerName ?? null,
      notes: data.notes ?? null,
    },
  });
  res.json(table);
});

// Transferir tudo de uma mesa para outra
const transferSchema = z.object({
  targetId: z.coerce.number(),
  mergeCustomer: z.boolean().optional(),
});

router.post('/:id/transfer', async (req, res) => {
  const fromId = Number(req.params.id);
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { targetId, mergeCustomer } = parsed.data;

  if (fromId === targetId) return res.status(400).json({ error: 'Mesma mesa/comanda' });

  const result = await prisma.$transaction(async (tx) => {
    const from = await tx.table.findUnique({ where: { id: fromId } });
    const to = await tx.table.findUnique({ where: { id: targetId } });
    if (!from || !to) throw Object.assign(new Error('not_found'), { code: 'NF' });

    await tx.orderItem.updateMany({
      where: { tableId: fromId },
      data: { tableId: targetId },
    });
    await tx.payment.updateMany({
      where: { tableId: fromId },
      data: { tableId: targetId },
    });

    const updateTo = { status: 'OCCUPIED', openedAt: to.openedAt || new Date() };
    if (mergeCustomer && !to.customerId && from.customerId) {
      updateTo.customerId = from.customerId;
      updateTo.customerName = from.customerName;
    }
    await tx.table.update({ where: { id: targetId }, data: updateTo });

    await tx.table.update({
      where: { id: fromId },
      data: {
        status: 'FREE',
        openedAt: null,
        closedAt: null,
        customerId: null,
        customerName: null,
        notes: null,
      },
    });

    return tx.table.findUnique({
      where: { id: targetId },
      include: { customer: true, orderItems: true, payments: true },
    });
  });

  res.json(summarize(result));
});

// Transferir apenas alguns itens
const transferItemsSchema = z.object({
  targetId: z.coerce.number(),
  itemIds: z.array(z.coerce.number()).min(1),
});

router.post('/:id/transfer-items', async (req, res) => {
  const fromId = Number(req.params.id);
  const parsed = transferItemsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { targetId, itemIds } = parsed.data;
  if (fromId === targetId) return res.status(400).json({ error: 'Mesma mesa/comanda' });

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.updateMany({
      where: { tableId: fromId, id: { in: itemIds } },
      data: { tableId: targetId },
    });
    await tx.table.update({
      where: { id: targetId },
      data: { status: 'OCCUPIED', openedAt: new Date() },
    });
  });
  res.json({ ok: true });
});

// Fechar mesa: registra pagamentos, gera contas a receber se necessário
const closeSchema = z.object({
  payments: z
    .array(
      z.object({
        method: z.enum(['CASH', 'CARD_CREDIT', 'CARD_DEBIT', 'PIX', 'ACCOUNT']),
        amount: z.coerce.number().positive(),
      })
    )
    .default([]),
  receivable: z
    .object({
      customerId: z.coerce.number(),
      amount: z.coerce.number().positive(),
      description: z.string().optional(),
      dueDate: z.coerce.date().optional().nullable(),
    })
    .optional()
    .nullable(),
});

router.post('/:id/close', async (req, res) => {
  const id = Number(req.params.id);
  const parsed = closeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { payments, receivable } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    for (const p of payments) {
      await tx.payment.create({
        data: {
          tableId: id,
          method: p.method,
          amount: p.amount,
          userId: req.user.id,
        },
      });
    }

    if (receivable) {
      await tx.receivable.create({
        data: {
          customerId: receivable.customerId,
          amount: receivable.amount,
          description: receivable.description || `Fechamento mesa/comanda #${id}`,
          dueDate: receivable.dueDate || null,
          tableId: id,
        },
      });
      await tx.payment.create({
        data: {
          tableId: id,
          method: 'ACCOUNT',
          amount: receivable.amount,
          userId: req.user.id,
        },
      });
    }

    return tx.table.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });
  });

  res.json(result);
});

// Reabrir mesa (volta itens para ela e marca como ocupada)
router.post('/:id/reopen', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const table = await prisma.table.update({
    where: { id },
    data: { status: 'OCCUPIED', closedAt: null, openedAt: new Date() },
  });
  res.json(table);
});

export default router;
