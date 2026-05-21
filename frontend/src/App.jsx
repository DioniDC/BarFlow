import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Users from './pages/Users';
import Tables from './pages/Tables';
import TableDetail from './pages/TableDetail';
import Receivables from './pages/Receivables';

function Protected({ children, roles }) {
  const { user, hasRole } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="mesas" element={<Tables />} />
        <Route path="mesas/:id" element={<TableDetail />} />
        <Route path="produtos" element={<Products />} />
        <Route path="clientes" element={<Customers />} />
        <Route path="contas" element={<Receivables />} />
        <Route
          path="usuarios"
          element={
            <Protected roles={['ADMIN', 'MANAGER']}>
              <Users />
            </Protected>
          }
        />
      </Route>
    </Routes>
  );
}
