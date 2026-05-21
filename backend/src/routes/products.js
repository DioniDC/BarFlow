import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

const INITIAL_INTERNAL_CODE = 1000;

async function nextInternalCode() {
  const max = await prisma.product.aggregate({ _max: { internalCode: true } });
  const current = max._max.internalCode;
  return current && current >= INITIAL_INTERNAL_CODE ? current + 1 : INITIAL_INTERNAL_CODE;
}

router.get('/', async (req, res) => {
  const { q, active } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: 'insensitive' } },
      { description: { contains: String(q), mode: 'insensitive' } },
      { barcodes: { some: { code: { contains: String(q) } } } },
    ];
    if (/^\d+$/.test(String(q))) {
      where.OR.push({ internalCode: Number(q) });
    }
  }
  const items = await prisma.product.findMany({
    where,
    include: { barcodes: true },
    orderBy: { internalCode: 'asc' },
  });
  res.json(items);
});

router.get('/by-code/:code', async (req, res) => {
  const code = req.params.code;
  let product = null;
  if (/^\d+$/.test(code)) {
    product = await prisma.product.findUnique({
      where: { internalCode: Number(code) },
      include: { barcodes: true },
    });
  }
  if (!product) {
    const barcode = await prisma.barcode.findUnique({
      where: { code },
      include: { product: { include: { barcodes: true } } },
    });
    if (barcode) {
      product = { ...barcode.product, scannedBarcode: barcode };
    }
  }
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { barcodes: true },
  });
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
});

const barcodeSchema = z.object({
  code: z.string().min(1),
  quantity: z.coerce.number().positive().default(1),
});

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().default(0),
  unit: z.string().default('UN'),
  category: z.string().optional().nullable(),
  active: z.boolean().optional(),
  barcodes: z.array(barcodeSchema).default([]),
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const code = await nextInternalCode();

  try {
    const product = await prisma.product.create({
      data: {
        internalCode: code,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        cost: data.cost ?? null,
        stock: data.stock,
        unit: data.unit,
        category: data.category ?? null,
        active: data.active ?? true,
        barcodes: { create: data.barcodes },
      },
      include: { barcodes: true },
    });
    res.status(201).json(product);
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Código de barras já cadastrado' });
    }
    throw e;
  }
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = productSchema.partial({ barcodes: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description ?? null,
          price: data.price,
          cost: data.cost ?? null,
          stock: data.stock,
          unit: data.unit,
          category: data.category ?? null,
          active: data.active,
        },
      });
      if (Array.isArray(data.barcodes)) {
        await tx.barcode.deleteMany({ where: { productId: id } });
        if (data.barcodes.length > 0) {
          await tx.barcode.createMany({
            data: data.barcodes.map((b) => ({ ...b, productId: id })),
          });
        }
      }
      return tx.product.findUnique({ where: { id }, include: { barcodes: true } });
    });
    res.json(product);
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Código de barras já cadastrado' });
    }
    throw e;
  }
});

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.product.update({ where: { id }, data: { active: false } });
  res.json({ ok: true });
});

const stockSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number(),
  reason: z.string().optional(),
});

router.post('/:id/stock', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = stockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { type, quantity, reason } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) throw Object.assign(new Error('not_found'), { code: 'NF' });

    let newStock = Number(product.stock);
    if (type === 'IN') newStock += quantity;
    else if (type === 'OUT') newStock -= quantity;
    else newStock = quantity;

    await tx.stockMovement.create({
      data: { productId: id, type, quantity, reason, userId: req.user.id },
    });
    return tx.product.update({
      where: { id },
      data: { stock: newStock },
      include: { barcodes: true },
    });
  });
  res.json(result);
});

export default router;
