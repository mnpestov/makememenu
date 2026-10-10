import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { WeeklyMenuFull, DishFull } from '@make-me-menu/shared';
import { Calendar, RefreshCw, RefreshCcw, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { DishCard } from '../components/DishCard';
import { DishDetailsModal } from '../components/DishDetailsModal';
import { ReplacementModal } from '../components/ReplacementModal';
import './WeeklyMenuPage.css';

type ActiveWeek = 'current' | 'next';

function getCurrentWeekStart(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString();
}

function getNextWeekStart(): string {
  const current = new Date(getCurrentWeekStart());
  return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function WeeklyMenuPage() {
  const [activeWeek, setActiveWeek] = useState<ActiveWeek>('current');
  const [currentMenu, setCurrentMenu] = useState<WeeklyMenuFull | null>(null);
  const [nextMenu, setNextMenu] = useState<WeeklyMenuFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDish, setSelectedDish] = useState<DishFull | null>(null);
  const [loadingDishId, setLoadingDishId] = useState<number | null>(null);
  const [replacingItemId, setReplacingItemId] = useState<number | null>(null);

  const menu = activeWeek === 'current' ? currentMenu : nextMenu;
  const weekStart = activeWeek === 'current' ? getCurrentWeekStart() : getNextWeekStart();

  const loadMenus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [curr, next] = await Promise.allSettled([
        api.menus.getCurrent(),
        api.menus.getNext(),
      ]);

      setCurrentMenu(curr.status === 'fulfilled' ? curr.value : null);
      setNextMenu(next.status === 'fulfilled' ? next.value : null);

      for (const result of [curr, next]) {
        if (result.status === 'rejected') {
          const msg: string = result.reason?.message ?? '';
          if (!msg.includes('404') && !msg.includes('No') && !msg.includes('not found')) {
            setError(msg);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.menus.generate({ weekStart });
      if (activeWeek === 'current') {
        setCurrentMenu(data);
      } else {
        setNextMenu(data);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при генерации меню');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteMenu = async () => {
    const label = activeWeek === 'current' ? 'текущую неделю' : 'следующую неделю';
    if (!window.confirm(`Вы уверены, что хотите удалить меню на ${label}?`)) return;
    try {
      if (activeWeek === 'current') {
        await api.menus.deleteCurrent();
        setCurrentMenu(null);
      } else {
        await api.menus.deleteNext();
        setNextMenu(null);
      }
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

  const handleWeekSwitch = (week: ActiveWeek) => {
    setActiveWeek(week);
    setError(null);
    setReplacingItemId(null);
  };

  const weekRangeLabel = (start: string) => {
    const from = new Date(start);
    const to = new Date(new Date(start).getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${from.toLocaleDateString('ru-RU')} — ${to.toLocaleDateString('ru-RU')}`;
  };

  const groupedItems = (() => {
    if (!menu) return [];
    const map = new Map<string, typeof menu.items>();
    menu.items.forEach(item => {
      const dateKey = item.date.split('T')[0]!;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(item);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, items]) => {
        const d = new Date(dateStr);
        return {
          dateStr,
          dateLabel: `${dayNames[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`,
          breakfast: items.find(i => i.mealType === 'BREAKFAST'),
          lunch: items.find(i => i.mealType === 'LUNCH'),
        };
      });
  })();

  if (loading) {
    return (
      <div className="page-body weekly-menu__loading">
        <p className="weekly-menu__loading-text">Загрузка меню...</p>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Меню на неделю</h1>
          {menu && (
            <p className="weekly-menu__subtitle">{weekRangeLabel(menu.weekStart)}</p>
          )}
        </div>
        {menu && (
          <button
            className="btn btn-secondary"
            onClick={handleDeleteMenu}
            title="Сбросить меню"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
          >
            <Trash2 size={18} />
            <span>Сбросить меню</span>
          </button>
        )}
      </header>

      <div className="weekly-menu__switcher">
        <div className="weekly-menu__switcher-tabs">
          <button
            className={`weekly-menu__switcher-btn${activeWeek === 'current' ? ' weekly-menu__switcher-btn--active' : ''}`}
            onClick={() => handleWeekSwitch('current')}
          >
            <ChevronLeft size={14} />
            Текущая неделя
            {currentMenu && <span className="weekly-menu__switcher-dot" />}
          </button>
          <button
            className={`weekly-menu__switcher-btn${activeWeek === 'next' ? ' weekly-menu__switcher-btn--active' : ''}`}
            onClick={() => handleWeekSwitch('next')}
          >
            Следующая неделя
            {nextMenu && <span className="weekly-menu__switcher-dot" />}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="card weekly-menu__error">
            <p className="weekly-menu__error-text">{error}</p>
          </div>
        )}

        {!menu ? (
          <div className="weekly-menu__empty-wrap">
            <div className="card weekly-menu__empty">
              <Calendar className="weekly-menu__empty-icon" size={48} />
              <h2 className="weekly-menu__empty-title">Меню не составлено</h2>
              <p className="weekly-menu__empty-dates">{weekRangeLabel(weekStart)}</p>
              <p className="weekly-menu__empty-text">
                Меню ещё не было сгенерировано. Хотите сгенерировать его сейчас?
              </p>
              <button
                className="btn btn-primary weekly-menu__empty-btn"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating
                  ? <RefreshCw className="weekly-menu__spinner" size={20} />
                  : <Calendar size={20} />}
                {generating ? 'Генерация...' : 'Сгенерировать меню'}
              </button>
            </div>
          </div>
        ) : (
          <div className="weekly-menu__days">
            {groupedItems.map(day => (
              <div key={day.dateStr} className="weekly-menu__day">
                <h3 className="weekly-menu__day-title">{day.dateLabel}</h3>
                <div className="weekly-menu__day-grid">
                  {day.breakfast && (
                    <DishCard
                      dish={day.breakfast.dish}
                      mealTypeLabel="Завтрак"
                      onClick={() => handleViewDish(day.breakfast!.dish.id)}
                      actionButton={
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                          onClick={() => setReplacingItemId(day.breakfast!.id)}
                        >
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
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                          onClick={() => setReplacingItemId(day.lunch!.id)}
                        >
                          <RefreshCcw size={14} /> Заменить
                        </button>
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDish && (
        <DishDetailsModal dish={selectedDish} onClose={() => setSelectedDish(null)} />
      )}

      {loadingDishId && (
        <div className="weekly-menu__dish-overlay">
          <p className="weekly-menu__dish-overlay-text">Загрузка рецепта...</p>
        </div>
      )}

      {replacingItemId && menu && (
        <ReplacementModal
          menuId={menu.id}
          itemId={replacingItemId}
          onClose={() => setReplacingItemId(null)}
          onSuccess={(newMenu) => {
            if (activeWeek === 'current') setCurrentMenu(newMenu);
            else setNextMenu(newMenu);
            setReplacingItemId(null);
          }}
        />
      )}
    </>
  );
}
