import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

const empty = {
  name: '',
  description: '',
  price: 0,
  cost: 0,
  stock: 0,
  unit: 'UN',
  category: '',
  barcodes: [],
};

export default function Products() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await api.get('/products', { params: q ? { q } : {} });
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

  function openEdit(p) {
    setForm({
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      cost: p.cost ? Number(p.cost) : 0,
      stock: Number(p.stock),
      unit: p.unit,
      category: p.category || '',
      barcodes: p.barcodes.map((b) => ({ code: b.code, quantity: Number(b.quantity) })),
    });
    setEditingId(p.id);
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, form);
      } else {
        await api.post('/products', form);
      }
      setOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  async function remove(id) {
    if (!confirm('Inativar este produto?')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  function addBarcode() {
    setForm({ ...form, barcodes: [...form.barcodes, { code: '', quantity: 1 }] });
  }

  function updateBarcode(i, field, val) {
    const b = [...form.barcodes];
    b[i] = { ...b[i], [field]: val };
    setForm({ ...form, barcodes: b });
  }

  function removeBarcode(i) {
    setForm({ ...form, barcodes: form.barcodes.filter((_, x) => x !== i) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <button onClick={openNew} className="btn-primary">
          + Novo Produto
        </button>
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Buscar por nome ou código..."
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
              <th className="py-2">Cód.</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Códigos de Barras</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-2 font-mono">{p.internalCode}</td>
                <td className="font-medium">
                  {p.name}
                  {!p.active && (
                    <span className="ml-2 badge bg-red-100 text-red-700">inativo</span>
                  )}
                </td>
                <td className="text-slate-600">{p.category || '—'}</td>
                <td>R$ {Number(p.price).toFixed(2)}</td>
                <td>
                  {Number(p.stock).toFixed(p.unit === 'UN' ? 0 : 3)} {p.unit}
                </td>
                <td className="text-xs text-slate-600">
                  {p.barcodes.map((b) => `${b.code}×${Number(b.quantity)}`).join(', ') || '—'}
                </td>
                <td className="text-right">
                  <button
                    className="text-brand-600 hover:underline mr-3"
                    onClick={() => openEdit(p)}
                  >
                    editar
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => remove(p.id)}
                  >
                    inativar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Nenhum produto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Editar Produto' : 'Novo Produto'}
        size="lg"
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
            <label className="label">Preço Venda</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Custo</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Estoque</label>
            <input
              type="number"
              step="0.001"
              className="input"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Unidade</label>
            <input
              className="input"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Categoria</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Descrição</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Códigos de Barras</label>
              <button type="button" className="btn-secondary text-xs" onClick={addBarcode}>
                + adicionar
              </button>
            </div>
            <div className="space-y-2">
              {form.barcodes.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Código"
                    value={b.code}
                    onChange={(e) => updateBarcode(i, 'code', e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.001"
                    className="input w-32"
                    placeholder="Qtd. baixa"
                    value={b.quantity}
                    onChange={(e) => updateBarcode(i, 'quantity', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => removeBarcode(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {form.barcodes.length === 0 && (
                <div className="text-xs text-slate-500">
                  Você pode cadastrar vários códigos com quantidades diferentes (ex.: pack de 6).
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
