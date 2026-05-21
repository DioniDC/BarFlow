import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'CASHIER', label: 'Caixa' },
  { value: 'WAITER', label: 'Garçom' },
];

const empty = { username: '', password: '', name: '', role: 'WAITER', active: true };

export default function Users() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await api.get('/users');
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
  function openEdit(u) {
    setForm({ username: u.username, password: '', name: u.name, role: u.role, active: u.active });
    setEditingId(u.id);
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (editingId) {
        const data = { ...form };
        if (!data.password) delete data.password;
        delete data.username;
        await api.put(`/users/${editingId}`, data);
      } else {
        await api.post('/users', form);
      }
      setOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <button onClick={openNew} className="btn-primary">
          + Novo Usuário
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-slate-500">
            <tr>
              <th className="py-2">Usuário</th>
              <th>Nome</th>
              <th>Função</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-2 font-mono">{u.username}</td>
                <td>{u.name}</td>
                <td>{ROLES.find((r) => r.value === u.role)?.label || u.role}</td>
                <td>
                  {u.active ? (
                    <span className="badge bg-emerald-100 text-emerald-700">ativo</span>
                  ) : (
                    <span className="badge bg-red-100 text-red-700">inativo</span>
                  )}
                </td>
                <td className="text-right">
                  <button
                    className="text-brand-600 hover:underline"
                    onClick={() => openEdit(u)}
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
        title={editingId ? 'Editar Usuário' : 'Novo Usuário'}
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
          <div>
            <label className="label">Usuário</label>
            <input
              className="input"
              required
              disabled={!!editingId}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Senha {editingId && '(deixe em branco para manter)'}</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
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
            <label className="label">Função</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Ativo
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
