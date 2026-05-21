import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Painel', icon: 'home', end: true },
  { to: '/mesas', label: 'Mesas / Comandas', icon: 'tables' },
  { to: '/produtos', label: 'Produtos', icon: 'box' },
  { to: '/clientes', label: 'Clientes', icon: 'users' },
  { to: '/contas', label: 'Contas a Receber', icon: 'cash' },
  { to: '/usuarios', label: 'Usuários', icon: 'shield', roles: ['ADMIN', 'MANAGER'] },
];

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="text-lg font-bold text-brand-400">🍺 BarFlow</div>
          <div className="text-xs text-slate-400 mt-1">
            {user?.name} ({user?.role})
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links
            .filter((l) => !l.roles || hasRole(...l.roles))
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Sair
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
