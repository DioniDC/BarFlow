import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

export default function Receivables() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('OPEN');
  const [payOpen, setPayOpen] = useState(null);
  const [payAmount, setPayAmount] = useState(0);

  async function load() {
    const { data } = await api.get('/receivables', {
      params: filter === 'ALL' ? {} : { status: filter },
    });
    setItems(data);
  }
  useEffect(() => {
    load();
  }, [filter]);

  async function pay() {
    try {
      await api.post(`/receivables/${payOpen.id}/pay`, { amount: Number(payAmount) });
      setPayOpen(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Contas a Receber</h1>

      <div className="flex gap-2">
        {[
          ['OPEN', 'Abertas'],
          ['PARTIAL', 'Parciais'],
          ['PAID', 'Pagas'],
          ['ALL', 'Todas'],
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

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-slate-500">
            <tr>
              <th className="py-2">Cliente</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Pago</th>
              <th>Saldo</th>
              <th>Status</th>
              <th>Criado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const saldo = Number(r.amount) - Number(r.paid);
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{r.customer.name}</td>
                  <td>{r.description || '—'}</td>
                  <td>R$ {Number(r.amount).toFixed(2)}</td>
                  <td>R$ {Number(r.paid).toFixed(2)}</td>
                  <td className="font-semibold">R$ {saldo.toFixed(2)}</td>
                  <td>{r.status}</td>
                  <td className="text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    {saldo > 0 && (
                      <button
                        className="text-brand-600 hover:underline"
                        onClick={() => {
                          setPayOpen(r);
                          setPayAmount(saldo);
                        }}
                      >
                        receber
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-6 text-slate-500">
                  Sem registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!payOpen}
        onClose={() => setPayOpen(null)}
        title={payOpen ? `Receber de ${payOpen.customer.name}` : ''}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPayOpen(null)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={pay}>
              Receber
            </button>
          </>
        }
      >
        <div>
          <label className="label">Valor</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
