import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import Modal from '../components/Modal';

export default function TableDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [table, setTable] = useState(null);

  // add item
  const [scan, setScan] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [qty, setQty] = useState(1);

  // open
  const [openOpen, setOpenOpen] = useState(false);
  const [openForm, setOpenForm] = useState({ customerId: '', customerName: '', notes: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);

  // transfer
  const [transferOpen, setTransferOpen] = useState(false);
  const [tablesList, setTablesList] = useState([]);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferSelected, setTransferSelected] = useState([]);
  const [transferMode, setTransferMode] = useState('all');

  // close
  const [closeOpen, setCloseOpen] = useState(false);
  const [payments, setPayments] = useState([{ method: 'CASH', amount: 0 }]);
  const [useReceivable, setUseReceivable] = useState(false);
  const [receivableAmount, setReceivableAmount] = useState(0);

  async function load() {
    const { data } = await api.get(`/tables/${id}`);
    setTable(data);
    if (!useReceivable && Number(data.balance) > 0) {
      setPayments([{ method: 'CASH', amount: Number(data.balance) }]);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  async function searchProducts(q) {
    setProductSearch(q);
    if (!q) return setProductOptions([]);
    const { data } = await api.get('/products', { params: { q, active: true } });
    setProductOptions(data.slice(0, 8));
  }

  async function addByScan() {
    if (!scan) return;
    try {
      await api.post('/orders/items', {
        tableId: Number(id),
        barcode: scan,
        quantity: qty > 0 ? qty : undefined,
      });
      setScan('');
      setQty(1);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  async function addProduct(productId) {
    try {
      await api.post('/orders/items', {
        tableId: Number(id),
        productId,
        quantity: qty,
      });
      setProductSearch('');
      setProductOptions([]);
      setQty(1);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  async function removeItem(itemId) {
    if (!confirm('Cancelar este item?')) return;
    await api.delete(`/orders/items/${itemId}`);
    load();
  }

  async function searchCustomers(q) {
    setCustomerSearch(q);
    if (!q) return setCustomerOptions([]);
    const { data } = await api.get('/customers', { params: { q } });
    setCustomerOptions(data.slice(0, 8));
  }

  async function openTable() {
    await api.post(`/tables/${id}/open`, {
      customerId: openForm.customerId || null,
      customerName: openForm.customerName || null,
      notes: openForm.notes || null,
    });
    setOpenOpen(false);
    load();
  }

  async function openTransfer() {
    const { data } = await api.get('/tables');
    setTablesList(data.filter((t) => t.id !== Number(id) && t.status !== 'CLOSED'));
    setTransferTarget('');
    setTransferSelected([]);
    setTransferMode('all');
    setTransferOpen(true);
  }

  async function doTransfer() {
    if (!transferTarget) return alert('Selecione o destino');
    try {
      if (transferMode === 'all') {
        await api.post(`/tables/${id}/transfer`, {
          targetId: Number(transferTarget),
          mergeCustomer: true,
        });
        navigate(`/mesas/${transferTarget}`);
      } else {
        if (transferSelected.length === 0) return alert('Selecione itens');
        await api.post(`/tables/${id}/transfer-items`, {
          targetId: Number(transferTarget),
          itemIds: transferSelected,
        });
        setTransferOpen(false);
        load();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  function addPaymentLine() {
    setPayments([...payments, { method: 'CASH', amount: 0 }]);
  }
  function updatePayment(i, field, val) {
    const p = [...payments];
    p[i] = { ...p[i], [field]: val };
    setPayments(p);
  }
  function removePayment(i) {
    setPayments(payments.filter((_, x) => x !== i));
  }

  const totalPayments = useMemo(
    () => payments.reduce((acc, p) => acc + Number(p.amount || 0), 0),
    [payments]
  );

  async function doClose() {
    try {
      const body = {
        payments: payments.filter((p) => Number(p.amount) > 0),
      };
      if (useReceivable && receivableAmount > 0) {
        if (!table.customerId) {
          return alert('Mesa precisa de cliente vinculado para gerar conta a receber');
        }
        body.receivable = {
          customerId: table.customerId,
          amount: Number(receivableAmount),
        };
      }
      await api.post(`/tables/${id}/close`, body);
      setCloseOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  }

  if (!table) return <div>Carregando...</div>;

  const items = table.orderItems.filter((i) => i.status !== 'CANCELLED');
  const isOpen = table.status === 'OCCUPIED';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button
            onClick={() => navigate('/mesas')}
            className="text-sm text-slate-500 hover:underline"
          >
            ← voltar
          </button>
          <h1 className="text-2xl font-bold mt-1">
            {table.type === 'TAB' ? 'Comanda' : 'Mesa'} #{table.number}
          </h1>
          <div className="text-sm text-slate-600">
            {table.label && <span className="mr-2">{table.label}</span>}
            <span>Status: {table.status}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {table.status === 'FREE' && (
            <button className="btn-primary" onClick={() => setOpenOpen(true)}>
              Abrir mesa
            </button>
          )}
          {isOpen && (
            <>
              <button className="btn-secondary" onClick={openTransfer}>
                Transferir
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setPayments([{ method: 'CASH', amount: Number(table.balance) }]);
                  setUseReceivable(false);
                  setReceivableAmount(0);
                  setCloseOpen(true);
                }}
              >
                Fechar mesa
              </button>
            </>
          )}
          {table.status === 'CLOSED' && (
            <button
              className="btn-secondary"
              onClick={async () => {
                await api.post(`/tables/${id}/reopen`);
                load();
              }}
            >
              Reabrir
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 space-y-3">
          <h2 className="font-semibold">Consumo</h2>
          {isOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                className="input md:col-span-2"
                placeholder="Escanear código de barras"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addByScan()}
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.001"
                  className="input"
                  placeholder="Qtd"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
                <button className="btn-primary" onClick={addByScan}>
                  +
                </button>
              </div>
            </div>
          )}

          {isOpen && (
            <div className="relative">
              <input
                className="input"
                placeholder="Buscar produto por nome ou código interno"
                value={productSearch}
                onChange={(e) => searchProducts(e.target.value)}
              />
              {productOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
                  {productOptions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p.id)}
                      className="block w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                    >
                      <span className="font-mono text-xs text-slate-500">
                        {p.internalCode}
                      </span>{' '}
                      {p.name} — R$ {Number(p.price).toFixed(2)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="border-b text-left text-slate-500">
              <tr>
                <th className="py-2">Hora</th>
                <th>Item</th>
                <th>Qtd</th>
                <th>V. Unit.</th>
                <th>Total</th>
                <th>Garçom</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-1 text-xs text-slate-500">
                    {new Date(i.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{i.product.name}</td>
                  <td>{Number(i.quantity)}</td>
                  <td>R$ {Number(i.unitPrice).toFixed(2)}</td>
                  <td className="font-medium">R$ {Number(i.total).toFixed(2)}</td>
                  <td className="text-xs text-slate-500">{i.user?.name}</td>
                  <td>
                    {isOpen && (
                      <button
                        className="text-red-600 hover:underline text-xs"
                        onClick={() => removeItem(i.id)}
                      >
                        cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-slate-500">
                    Nenhum item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm uppercase text-slate-500">Cliente</h3>
            <div className="font-medium">
              {table.customer?.name || table.customerName || '—'}
            </div>
            {table.customer?.phone && (
              <div className="text-sm text-slate-600">{table.customer.phone}</div>
            )}
            {table.notes && (
              <div className="mt-2 text-xs text-slate-600">{table.notes}</div>
            )}
          </div>

          <div className="card">
            <div className="flex justify-between text-sm">
              <span>Total consumo:</span>
              <span className="font-semibold">R$ {Number(table.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pago:</span>
              <span>R$ {Number(table.paid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
              <span>Saldo:</span>
              <span className={Number(table.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                R$ {Number(table.balance).toFixed(2)}
              </span>
            </div>
          </div>

          {table.payments.length > 0 && (
            <div className="card">
              <h3 className="text-sm uppercase text-slate-500 mb-2">Pagamentos</h3>
              <div className="space-y-1 text-sm">
                {table.payments.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span>{p.method}</span>
                    <span>R$ {Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={openOpen}
        onClose={() => setOpenOpen(false)}
        title="Abrir mesa/comanda"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpenOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={openTable}>
              Abrir
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Cliente (opcional)</label>
            <div className="relative">
              <input
                className="input"
                placeholder="Buscar cliente cadastrado..."
                value={customerSearch}
                onChange={(e) => searchCustomers(e.target.value)}
              />
              {customerOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
                  {customerOptions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setOpenForm({
                          ...openForm,
                          customerId: c.id,
                          customerName: c.name,
                        });
                        setCustomerSearch(c.name);
                        setCustomerOptions([]);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-slate-100 text-sm"
                    >
                      {c.name} {c.phone && `— ${c.phone}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="label">Nome no cabeçalho (se sem cadastro)</label>
            <input
              className="input"
              value={openForm.customerName}
              onChange={(e) =>
                setOpenForm({ ...openForm, customerName: e.target.value, customerId: '' })
              }
            />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea
              className="input"
              rows={2}
              value={openForm.notes}
              onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transferir mesa / comanda"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setTransferOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={doTransfer}>
              Transferir
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Destino</label>
            <select
              className="input"
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
            >
              <option value="">Selecione...</option>
              {tablesList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.type === 'TAB' ? 'Comanda' : 'Mesa'} {t.number}
                  {t.customerName ? ` — ${t.customerName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={transferMode === 'all'}
                onChange={() => setTransferMode('all')}
              />
              Transferir tudo (libera esta mesa)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={transferMode === 'items'}
                onChange={() => setTransferMode('items')}
              />
              Transferir apenas itens selecionados
            </label>
          </div>
          {transferMode === 'items' && (
            <div className="border rounded-lg p-2 max-h-72 overflow-auto">
              {items.map((i) => (
                <label
                  key={i.id}
                  className="flex items-center gap-2 py-1 text-sm border-b last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={transferSelected.includes(i.id)}
                    onChange={(e) => {
                      setTransferSelected((prev) =>
                        e.target.checked
                          ? [...prev, i.id]
                          : prev.filter((x) => x !== i.id)
                      );
                    }}
                  />
                  <span className="flex-1">
                    {i.product.name} ({Number(i.quantity)}× R$ {Number(i.unitPrice).toFixed(2)})
                  </span>
                  <span className="font-medium">R$ {Number(i.total).toFixed(2)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Fechar mesa / comanda"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCloseOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={doClose}>
              Confirmar fechamento
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Saldo a pagar:</span>
              <span className="font-semibold">R$ {Number(table.balance).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total nos pagamentos abaixo:</span>
              <span>R$ {(totalPayments + Number(receivableAmount || 0)).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label">Pagamentos</label>
              <button type="button" className="btn-secondary text-xs" onClick={addPaymentLine}>
                + linha
              </button>
            </div>
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    className="input w-44"
                    value={p.method}
                    onChange={(e) => updatePayment(i, 'method', e.target.value)}
                  >
                    <option value="CASH">Dinheiro</option>
                    <option value="CARD_DEBIT">Cartão Débito</option>
                    <option value="CARD_CREDIT">Cartão Crédito</option>
                    <option value="PIX">Pix</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={p.amount}
                    onChange={(e) => updatePayment(i, 'amount', e.target.value)}
                  />
                  <button className="btn-danger" onClick={() => removePayment(i)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useReceivable}
                onChange={(e) => setUseReceivable(e.target.checked)}
              />
              Lançar parte como conta a receber do cliente
            </label>
            {useReceivable && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Valor a receber</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={receivableAmount}
                    onChange={(e) => setReceivableAmount(e.target.value)}
                  />
                </div>
                <div className="text-xs text-slate-500 self-end">
                  Cliente:{' '}
                  {table.customer?.name || (
                    <span className="text-red-600">vincule um cliente antes</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
