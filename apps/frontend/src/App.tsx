import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom';
import { Home, ListChecks, Settings, BookOpen } from 'lucide-react';
import { SettingsPage } from './pages/SettingsPage';
import { CatalogPage } from './pages/CatalogPage';
import { WeeklyMenuPage } from './pages/WeeklyMenuPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { LoginPage } from './pages/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './index.css';

// Layout Component
function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Home size={24} />
          Make Me Menu
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            Меню недели
          </NavLink>
          <NavLink to="/shopping" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ListChecks size={20} />
            Список покупок
          </NavLink>
          <NavLink to="/catalog" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BookOpen size={20} />
            Каталог блюд
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            Настройки
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Меню</span>
        </NavLink>
        <NavLink to="/shopping" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <ListChecks size={20} />
          <span>Покупки</span>
        </NavLink>
        <NavLink to="/catalog" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} />
          <span>Каталог</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Настройки</span>
        </NavLink>
      </nav>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="app__loading">Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<WeeklyMenuPage />} />
              <Route path="shopping" element={<ShoppingListPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
