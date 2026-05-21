import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import tableRoutes from './routes/tables.js';
import orderRoutes from './routes/orders.js';
import receivableRoutes from './routes/receivables.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/receivables', receivableRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || (err.code === 'NF' ? 404 : err.code === 'BAD' ? 400 : 500);
  res.status(status).json({ error: err.message || 'Erro interno' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`[bar-api] rodando em http://localhost:${port}`);
});
