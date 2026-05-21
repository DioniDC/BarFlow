import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';

const statusColor = {
  FREE: 'border-emerald-300 bg-emerald-50',
  OCCUPIED: 'border-amber-300 bg-amber-50',
  CLOSED: 'border-slate-300 bg-slate-100',
};
const statusBadge = {
  FREE: 'bg-emerald-100 text-emerald-700',
  OCCUPIED: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-slate-200 text-slate-700',
};

const emptyForm = { number: '', label: '', type: 'TABLE', notes: '' };

export default function Tables() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const { data } = await api.get('/tables');
    setItems(data);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/tables', form);
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  const filtered =
    filter === 'ALL'
      ? items
      : filter === 'TABLE' || filter === 'TAB'
        ? items.filter((i) => i.type === filter)
        : items.filter((i) => i.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mesas / Comandas</h1>
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Cadastrar Mesa/Comanda
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['ALL', 'Todas'],
          ['FREE', 'Livres'],
          ['OCCUPIED', 'Ocupadas'],
          ['CLOSED', 'Fechadas'],
          ['TABLE', 'Apenas Mesas'],
          ['TAB', 'Apenas Comandas'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`btn ${filter === k ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-800'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filtered.map((t) => (
          <Link
            key={t.id}
            to={`/mesas/${t.id}`}
            className={`block rounded-xl border-2 p-3 transition hover:scale-[1.02] ${
              statusColor[t.status]
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="text-xs uppercase text-slate-600">
                {t.type === 'TAB' ? 'Comanda' : 'Mesa'}
              </div>
              <span className={`badge ${statusBadge[t.status]}`}>
                {t.status === 'FREE' ? 'livre' : t.status === 'OCCUPIED' ? 'aberta' : 'fechada'}
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold">{t.number}</div>
            {t.label && <div className="text-xs text-slate-600">{t.label}</div>}
            <div className="mt-2 text-sm text-slate-700 truncate">
              {t.customerName || t.customer?.name || '—'}
            </div>
            {t.status !== 'FREE' && (
              <div className="mt-1 text-sm font-semibold">
                R$ {Number(t.balance).toFixed(2)}
              </div>
            )}
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8">
            Nenhuma mesa/comanda nesse filtro.
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cadastrar Mesa/Comanda"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={create}>
              Salvar
            </button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={create}>
          <div>
            <label className="label">Tipo</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="TABLE">Mesa</option>
              <option value="TAB">Comanda</option>
            </select>
          </div>
          <div>
            <label className="label">Número / Identificação</label>
            <input
              className="input"
              required
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Rótulo (opcional)</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
