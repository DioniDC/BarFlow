import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [tables, setTables] = useState([]);
  const [receivables, setReceivables] = useState([]);

  async function load() {
    const [{ data: t }, { data: r }] = await Promise.all([
      api.get('/tables'),
      api.get('/receivables', { params: { status: 'OPEN' } }),
    ]);
    setTables(t);
    setReceivables(r);
  }

  useEffect(() => {
    load();
  }, []);

  const occupied = tables.filter((t) => t.status === 'OCCUPIED');
  const free = tables.filter((t) => t.status === 'FREE');
  const totalOpen = occupied.reduce((acc, t) => acc + Number(t.balance || 0), 0);
  const totalReceivable = receivables.reduce(
    (acc, r) => acc + (Number(r.amount) - Number(r.paid)),
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Painel</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Mesas Ocupadas" value={occupied.length} color="bg-amber-500" />
        <Stat label="Mesas Livres" value={free.length} color="bg-emerald-500" />
        <Stat
          label="Aberto em mesas"
          value={`R$ ${totalOpen.toFixed(2)}`}
          color="bg-blue-500"
        />
        <Stat
          label="A receber"
          value={`R$ ${totalReceivable.toFixed(2)}`}
          color="bg-rose-500"
        />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mesas em uso</h2>
          <Link to="/mesas" className="text-sm text-brand-600 hover:underline">
            Ver todas →
          </Link>
        </div>
        {occupied.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma mesa aberta.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {occupied.map((t) => (
              <Link
                key={t.id}
                to={`/mesas/${t.id}`}
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 hover:bg-amber-100"
              >
                <div className="text-xs uppercase text-amber-700">
                  {t.type === 'TAB' ? 'Comanda' : 'Mesa'}
                </div>
                <div className="text-lg font-bold">{t.number}</div>
                <div className="truncate text-sm text-slate-600">
                  {t.customerName || t.customer?.name || '—'}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">
                  R$ {Number(t.balance).toFixed(2)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`h-12 w-2 rounded-full ${color}`} />
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}
