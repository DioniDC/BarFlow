import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

const empty = { name: '', document: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);
  const [detail, setDetail] = useState(null);

  async function load() {
    const { data } = await api.get('/customers', { params: q ? { q } : {} });
    setItems(data);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(empty);
    setEditingId(null);
    setOpen(true);
  }
  function openEdit(c) {
    setForm({
      name: c.name,
      document: c.document || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
    });
    setEditingId(c.id);
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.email) delete payload.email;
    try {
      if (editingId) await api.put(`/customers/${editingId}`, payload);
      else await api.post('/customers', payload);
      setOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  async function showDetail(id) {
    const { data } = await api.get(`/customers/${id}`);
    setDetail(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button onClick={openNew} className="btn-primary">
          + Novo Cliente
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Buscar..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="btn-secondary" onClick={load}>
          Buscar
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-slate-500">
            <tr>
              <th className="py-2">Nome</th>
              <th>CPF/CNPJ</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-2 font-medium">{c.name}</td>
                <td>{c.document || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.email || '—'}</td>
                <td className="text-right">
                  <button
                    className="text-brand-600 hover:underline mr-3"
                    onClick={() => showDetail(c.id)}
                  >
                    detalhes
                  </button>
                  <button
                    className="text-brand-600 hover:underline"
                    onClick={() => openEdit(c)}
                  >
                    editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={save}>
              Salvar
            </button>
          </>
        }
      >
        <form className="grid grid-cols-2 gap-3" onSubmit={save}>
          <div className="col-span-2">
            <label className="label">Nome</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">CPF / CNPJ</label>
            <input
              className="input"
              value={form.document}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">E-mail</label>
            <input
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Endereço</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Observações</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Cliente: ${detail.name}` : ''}
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Documento:</span> {detail.document || '—'}
              </div>
              <div>
                <span className="text-slate-500">Telefone:</span> {detail.phone || '—'}
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Saldo aberto:</span>{' '}
                <span className="font-semibold text-rose-600">
                  R$ {Number(detail.openBalance).toFixed(2)}
                </span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Contas a Receber</h4>
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Pago</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.receivables.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-1">{r.description || '—'}</td>
                      <td>R$ {Number(r.amount).toFixed(2)}</td>
                      <td>R$ {Number(r.paid).toFixed(2)}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                  {detail.receivables.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-slate-500 py-2">
                        Nenhuma conta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
