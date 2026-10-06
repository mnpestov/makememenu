import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { WeeklyMenuFull, DishFull } from '@make-me-menu/shared';
import { Calendar, RefreshCw, RefreshCcw, Trash2 } from 'lucide-react';
import { DishCard } from '../components/DishCard';
import { DishDetailsModal } from '../components/DishDetailsModal';
import { ReplacementModal } from '../components/ReplacementModal';

function getCurrentWeekStart(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString();
}

const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function WeeklyMenuPage() {
  const [menu, setMenu] = useState<WeeklyMenuFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDish, setSelectedDish] = useState<DishFull | null>(null);
  const [loadingDishId, setLoadingDishId] = useState<number | null>(null);
  const [replacingItemId, setReplacingItemId] = useState<number | null>(null);

  const currentWeekStart = getCurrentWeekStart();

  const loadMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.menus.getCurrent();
      setMenu(data);
    } catch (err: any) {
      if (err.message.includes('404') || err.message.includes('No current menu found')) {
        setMenu(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.menus.generate({ weekStart: currentWeekStart });
      setMenu(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка при генерации меню');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteMenu = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить текущее меню на эту неделю?')) return;
    try {
      await api.menus.deleteCurrent();
      setMenu(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка при удалении меню');
    }
  };

  const handleViewDish = async (dishId: number) => {
    setLoadingDishId(dishId);
    try {
      const fullDish = await api.dishes.getById(dishId);
      setSelectedDish(fullDish);
    } catch (err: any) {
      alert('Ошибка при загрузке данных блюда: ' + err.message);
    } finally {
      setLoadingDishId(null);
    }
  };

  // Group items by date for display
  const groupedItems = (() => {
    if (!menu) return [];
    
    // Create a map of date string -> items
    const map = new Map<string, typeof menu.items>();
    menu.items.forEach(item => {
      // Date in ISO format from backend, keep only YYYY-MM-DD for grouping
      const dateKey = item.date.split('T')[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(item);
    });

    // Convert map to sorted array
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, items]) => {
        const d = new Date(dateStr);
        const dayOfWeek = dayNames[d.getDay()];
        const breakfast = items.find(i => i.mealType === 'BREAKFAST');
        const lunch = items.find(i => i.mealType === 'LUNCH');
        
        return {
          dateStr,
          dateLabel: `${dayOfWeek}, ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`,
          breakfast,
          lunch,
        };
      });
  })();

  if (loading) {
    return (
      <div className="page-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Загрузка меню...</p>
      </div>
    );
  }

  if (error && !menu) {
    return (
      <div className="page-body">
        <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Ошибка</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadMenu} style={{ marginTop: '1rem' }}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="page-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '500px' }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', color: 'var(--color-text-secondary)' }} />
          <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '1rem' }}>Меню не составлено</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            На текущую неделю меню ещё не было сгенерировано. Хотите сгенерировать его сейчас на основе ваших настроек?
          </p>
          
          {error && <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</p>}
          
          <button 
            className="btn btn-primary" 
            onClick={handleGenerate} 
            disabled={generating}
            style={{ padding: '0.75rem 2rem', fontSize: 'var(--font-size-base)' }}
          >
            {generating ? <RefreshCw className="animate-spin" size={20} /> : <Calendar size={20} />}
            {generating ? 'Генерация...' : 'Сгенерировать меню'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Меню на неделю</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            {new Date(menu.weekStart).toLocaleDateString('ru-RU')} — {new Date(new Date(menu.weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')}
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={handleDeleteMenu}
          title="Сбросить текущее меню и сгенерировать заново"
          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
        >
          <Trash2 size={18} />
          <span>Сбросить меню</span>
        </button>
      </header>
      
      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {groupedItems.map(day => (
            <div key={day.dateStr}>
              <h3 style={{ 
                fontSize: 'var(--font-size-lg)', 
                fontWeight: 600, 
                marginBottom: '0.75rem',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '0.5rem',
                color: 'var(--color-text-primary)'
              }}>
                {day.dateLabel}
              </h3>
              
              <div className="menu-day-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {day.breakfast && (
                  <DishCard 
                    dish={day.breakfast.dish} 
                    mealTypeLabel="Завтрак" 
                    onClick={() => handleViewDish(day.breakfast!.dish.id)}
                    actionButton={
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }} onClick={() => setReplacingItemId(day.breakfast!.id)}>
                        <RefreshCcw size={14} /> Заменить
                      </button>
                    }
                  />
                )}
                
                {day.lunch && (
                  <DishCard 
                    dish={day.lunch.dish} 
                    mealTypeLabel="Обед и ужин" 
                    onClick={() => handleViewDish(day.lunch!.dish.id)}
                    actionButton={
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }} onClick={() => setReplacingItemId(day.lunch!.id)}>
                        <RefreshCcw size={14} /> Заменить
                      </button>
                    }
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDish && (
        <DishDetailsModal 
          dish={selectedDish} 
          onClose={() => setSelectedDish(null)} 
        />
      )}

      {/* Loading overlay for dish fetch */}
      {loadingDishId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.7)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 2000
        }}>
          <p style={{ fontWeight: 500 }}>Загрузка рецепта...</p>
        </div>
      )}

      {replacingItemId && menu && (
        <ReplacementModal 
          menuId={menu.id} 
          itemId={replacingItemId} 
          onClose={() => setReplacingItemId(null)} 
          onSuccess={(newMenu) => {
            setMenu(newMenu);
            setReplacingItemId(null);
          }} 
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}
