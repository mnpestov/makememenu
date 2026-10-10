import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ShoppingItem } from '@make-me-menu/shared';
import { ShoppingCart, Calendar, CheckCircle2, Circle } from 'lucide-react';

const dayNamesShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function formatQuantity(amount: number, unit: string): string {
  if (unit === 'GRAM' && amount >= 1000) {
    return `${Number((amount / 1000).toFixed(2))} кг`;
  }
  if (unit === 'GRAM') {
    return `${Number(amount.toFixed(0))} гр`;
  }
  if (unit === 'MILLILITER' && amount >= 1000) {
    return `${Number((amount / 1000).toFixed(2))} л`;
  }
  if (unit === 'MILLILITER') {
    return `${Number(amount.toFixed(0))} мл`;
  }
  if (unit === 'PIECE') {
    return `${Number(amount.toFixed(1))} шт`;
  }
  if (unit === 'TEASPOON') {
    return `${Number(amount.toFixed(1))} ч.л.`;
  }
  if (unit === 'TABLESPOON') {
    return `${Number(amount.toFixed(1))} ст.л.`;
  }
  if (unit === 'CUP') {
    return `${Number(amount.toFixed(1))} чашка`;
  }
  return `${amount} ${unit}`;
}

function formatDates(dates: { neededAt: string }[]): string {
  if (!dates || !Array.isArray(dates) || dates.length === 0) return '';
  const days = dates
    .filter(d => d && d.neededAt)
    .map(d => {
      const dateObj = new Date(d.neededAt);
      return dayNamesShort[dateObj.getDay()];
    });
  // Unique and sort
  const uniqueDays = Array.from(new Set(days));
  // Keep original order, just deduplicate and join
  return uniqueDays.join(' · ');
}

export function ShoppingListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  
  // Track loading state for individual items being checked/unchecked
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());



  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const menu = await api.menus.getCurrent();
      setMenuId(menu.id);
      
      const shoppingList = await api.menus.getShoppingList(menu.id);
      setItems(shoppingList);
    } catch (err: any) {
      if (err.message.includes('404') || err.message.includes('No current menu found')) {
        setMenuId(null);
      } else {
        setError(err.message || 'Ошибка загрузки данных');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (item: ShoppingItem) => {
    if (!menuId || updatingItems.has(item.id)) return;

    const newPurchasedState = !item.isPurchased;
    
    // Optimistic UI update could be done here, but let's wait for network as per requirements ("после успешного ответа обновить состояние")
    setUpdatingItems(prev => new Set(prev).add(item.id));
    
    try {
      const updatedItem = await api.menus.updateShoppingItem(menuId, item.id, { isPurchased: newPurchasedState });
      setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    } catch (err: any) {
      alert(`Ошибка при обновлении: ${err.message}`);
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };



  if (loading) {
    return (
      <div className="page-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Загрузка списка покупок...</p>
      </div>
    );
  }

  if (error && !menuId) {
    return (
      <div className="page-body">
        <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Ошибка</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadData} style={{ marginTop: '1rem' }}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!menuId) {
    return (
      <div className="page-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '500px' }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', color: 'var(--color-text-secondary)' }} />
          <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '1rem' }}>Меню не составлено</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Список покупок формируется автоматически на основе меню текущей недели. Похоже, вы ещё не составили меню.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Перейти к меню
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '500px' }}>
          <ShoppingCart size={48} style={{ margin: '0 auto 1rem', color: 'var(--color-text-secondary)' }} />
          <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '1rem' }}>Список пуст</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Для выбранных блюд не указаны ингредиенты.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Вернуться к меню
          </button>
        </div>
      </div>
    );
  }

  // Sort: unchecked first, checked last. Secondary sort by ingredient name.
  const sortedItems = [...items].sort((a, b) => {
    if (a.isPurchased === b.isPurchased) {
      return a.ingredient.name.localeCompare(b.ingredient.name);
    }
    return a.isPurchased ? 1 : -1;
  });

  return (
    <>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Список покупок</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            На текущую неделю
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <Calendar size={18} /> К меню
          </button>
        </div>
      </header>

      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '800px', margin: '0 auto' }}>
          

          {sortedItems.map(item => {
            const isUpdating = updatingItems.has(item.id);
            const isPurchased = item.isPurchased;
            
            return (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)',
                  opacity: isUpdating ? 0.6 : 1,
                  transition: 'opacity 0.2s, background-color 0.2s',
                  gap: '1rem',
                  border: '1px solid',
                  borderColor: isPurchased ? 'transparent' : 'var(--color-border)',
                }}
              >
                <div 
                  onClick={() => handleToggle(item)}
                  style={{ color: isPurchased ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)', flexShrink: 0, cursor: isUpdating ? 'wait' : 'pointer' }}
                >
                  {isPurchased ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ 
                      fontSize: 'var(--font-size-lg)', 
                      fontWeight: 500,
                      color: isPurchased ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                      textDecoration: isPurchased ? 'line-through' : 'none',
                    }}>
                      {item.ingredient.name}
                    </span>
                    <span style={{ 
                      fontSize: 'var(--font-size-base)', 
                      fontWeight: 600,
                      color: isPurchased ? 'var(--color-text-secondary)' : 'var(--color-brand-primary)',
                      whiteSpace: 'nowrap',
                      marginLeft: '1rem'
                    }}>
                      {formatQuantity(item.totalAmount, item.unit)}
                    </span>
                  </div>
                  
                  <div style={{ marginTop: '0.25rem', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    Нужно: {formatDates(item.neededDates)}
                  </div>


                </div>
              </div>
            );
          })}
        </div>
      </div>


    </>
  );
}
