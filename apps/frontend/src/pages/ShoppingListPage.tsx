import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ShoppingItem } from '@make-me-menu/shared';
import { ShoppingCart, Calendar, CheckCircle2, Circle } from 'lucide-react';
import './ShoppingListPage.css';

const dayNamesShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function formatQuantity(amount: number, unit: string): string {
  if (unit === 'GRAM' && amount >= 1000) return `${Number((amount / 1000).toFixed(2))} кг`;
  if (unit === 'GRAM') return `${Number(amount.toFixed(0))} гр`;
  if (unit === 'MILLILITER' && amount >= 1000) return `${Number((amount / 1000).toFixed(2))} л`;
  if (unit === 'MILLILITER') return `${Number(amount.toFixed(0))} мл`;
  if (unit === 'PIECE') return `${Number(amount.toFixed(1))} шт`;
  if (unit === 'TEASPOON') return `${Number(amount.toFixed(1))} ч.л.`;
  if (unit === 'TABLESPOON') return `${Number(amount.toFixed(1))} ст.л.`;
  if (unit === 'CUP') return `${Number(amount.toFixed(1))} чашка`;
  return `${amount} ${unit}`;
}

function formatDates(dates: { neededAt: string }[]): string {
  if (!dates || !Array.isArray(dates) || dates.length === 0) return '';
  const days = dates
    .filter(d => d && d.neededAt)
    .map(d => dayNamesShort[new Date(d.neededAt).getDay()]);
  return Array.from(new Set(days)).join(' · ');
}

export function ShoppingListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
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

  useEffect(() => { loadData(); }, []);

  const handleToggle = async (item: ShoppingItem) => {
    if (!menuId || updatingItems.has(item.id)) return;
    setUpdatingItems(prev => new Set(prev).add(item.id));
    try {
      const updatedItem = await api.menus.updateShoppingItem(menuId, item.id, {
        isPurchased: !item.isPurchased,
      });
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
      <div className="page-body shopping-list__centered">
        <p className="shopping-list__loading-text">Загрузка списка покупок...</p>
      </div>
    );
  }

  if (error && !menuId) {
    return (
      <div className="page-body">
        <div className="card shopping-list__error-card">
          <h2 className="shopping-list__error-title">Ошибка</h2>
          <p>{error}</p>
          <button className="btn btn-primary shopping-list__error-action" onClick={loadData}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!menuId) {
    return (
      <div className="page-body shopping-list__centered">
        <div className="card shopping-list__placeholder">
          <Calendar className="shopping-list__placeholder-icon" size={48} />
          <h2 className="shopping-list__placeholder-title">Меню не составлено</h2>
          <p className="shopping-list__placeholder-text">
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
      <div className="page-body shopping-list__centered">
        <div className="card shopping-list__placeholder">
          <ShoppingCart className="shopping-list__placeholder-icon" size={48} />
          <h2 className="shopping-list__placeholder-title">Список пуст</h2>
          <p className="shopping-list__placeholder-text">
            Для выбранных блюд не указаны ингредиенты.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Вернуться к меню
          </button>
        </div>
      </div>
    );
  }

  const sortedItems = [...items].sort((a, b) => {
    if (a.isPurchased === b.isPurchased) return a.ingredient.name.localeCompare(b.ingredient.name);
    return a.isPurchased ? 1 : -1;
  });

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Список покупок</h1>
          <p className="shopping-list__header-meta">На текущую неделю</p>
        </div>
        <div className="shopping-list__header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <Calendar size={18} /> К меню
          </button>
        </div>
      </header>

      <div className="page-body">
        <div className="shopping-list__items">
          {sortedItems.map(item => {
            const isUpdating = updatingItems.has(item.id);
            const isPurchased = item.isPurchased;

            const itemClass = [
              'shopping-list__item',
              isPurchased ? 'shopping-list__item--purchased' : '',
              isUpdating ? 'shopping-list__item--updating' : '',
            ].filter(Boolean).join(' ');

            const toggleClass = [
              'shopping-list__item-toggle',
              isPurchased ? 'shopping-list__item-toggle--purchased' : '',
              isUpdating ? 'shopping-list__item-toggle--waiting' : '',
            ].filter(Boolean).join(' ');

            return (
              <div key={item.id} className={itemClass}>
                <div className={toggleClass} onClick={() => handleToggle(item)}>
                  {isPurchased ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </div>

                <div className="shopping-list__item-body">
                  <div className="shopping-list__item-row">
                    <span className={`shopping-list__item-name${isPurchased ? ' shopping-list__item-name--purchased' : ''}`}>
                      {item.ingredient.name}
                    </span>
                    <span className={`shopping-list__item-amount${isPurchased ? ' shopping-list__item-amount--purchased' : ''}`}>
                      {formatQuantity(item.totalAmount, item.unit)}
                    </span>
                  </div>
                  <div className="shopping-list__item-dates">
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
