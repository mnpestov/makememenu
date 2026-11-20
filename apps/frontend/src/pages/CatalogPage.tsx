import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DishSummary, DishFull } from '@make-me-menu/shared';
import { COOK_LABELS, DishStatus, DISH_STATUS_LABELS } from '@make-me-menu/shared';
import { Search, Plus } from 'lucide-react';
import { DishFormModal } from '../components/DishFormModal';
import './CatalogPage.css';
import { DishDetailsModal } from '../components/DishDetailsModal';

export function CatalogPage() {
  const [dishes, setDishes] = useState<DishSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<DishStatus>(DishStatus.FAVORITE);
  const [selectedDish, setSelectedDish] = useState<DishFull | null>(null);
  const handleView = async (id: number) => {
    try { setSelectedDish(await api.dishes.getById(id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось открыть рецепт'); }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDishId, setEditingDishId] = useState<number | null>(null);

  const loadDishes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.dishes.getAll();
      setDishes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDishes(); }, []);

  const filteredDishes = dishes.filter(d => d.status === activeStatus).filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (COOK_LABELS[d.cook] || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => { setEditingDishId(null); setIsModalOpen(true); };
  const handleEdit = (id: number) => { setEditingDishId(id); setIsModalOpen(true); };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это блюдо?')) return;
    try {
      await api.dishes.delete(id);
      setDishes(dishes.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления блюда');
    }
  };

  const handleModalClose = (saved: boolean) => {
    setIsModalOpen(false);
    if (saved) loadDishes();
  };

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Каталог блюд</h1>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={18} />
          <span>Добавить блюдо</span>
        </button>
      </header>

      <div className="page-body">
        <div className="recipe-actions" role="group" aria-label="Разделы каталога">
          {Object.values(DishStatus).map(status => (
            <button key={status} className={`btn ${activeStatus === status ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={activeStatus === status} onClick={() => setActiveStatus(status)}>
              {DISH_STATUS_LABELS[status]} ({dishes.filter(d => d.status === status).length})
            </button>
          ))}
        </div>
        <p className="catalog__hint">Недельное меню генерируется из постоянных блюд. Рецепт на пробу можно выбрать через замену блюда в меню.</p>
        <div className="catalog__search-wrap">
          <Search className="catalog__search-icon" size={18} />
          <input
            className="catalog__search-input"
            type="text"
            placeholder="Поиск по названию, категории или повару..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {error && (
          <div className="card catalog__error">
            <p className="catalog__error-text">{error}</p>
          </div>
        )}

        {loading ? (
          <p>Загрузка каталога...</p>
        ) : filteredDishes.length === 0 ? (
          <div className="card catalog__empty">
            <p className="catalog__empty-text">Блюда не найдены.</p>
          </div>
        ) : (
          <div className="catalog__grid">
            {filteredDishes.map(dish => (
              <div key={dish.id} className="card catalog__dish">
                <div className="catalog__dish-head">
                  <h3 className="catalog__dish-name">{dish.name}</h3>
                  <span className="catalog__dish-category">
                    {dish.category?.name || 'Без категории'}
                  </span>
                </div>

                <div className="catalog__dish-meta">
                  {dish.rating !== null && <p><strong>Оценка семьи:</strong> {dish.rating}/5</p>}
                  <p><strong>Сложность:</strong> {dish.difficulty}</p>
                  <p><strong>Повар:</strong> {COOK_LABELS[dish.cook] || 'Юля и Миша'}</p>
                  <p>
                    <strong>Подходит для:</strong>{' '}
                    {[
                      dish.forBreakfast ? 'Завтрака' : null,
                      dish.forLunch ? 'Обеда' : null,
                    ].filter(Boolean).join(', ') || 'Ничего'}
                  </p>
                </div>

                <div className="catalog__dish-actions">
                  <button className="btn btn-primary catalog__dish-btn" onClick={() => handleView(dish.id)}>Рецепт и оценка</button>
                  <button
                    className="btn btn-secondary catalog__dish-btn"
                    onClick={() => handleEdit(dish.id)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="btn btn-secondary catalog__dish-btn catalog__dish-btn--danger"
                    onClick={() => handleDelete(dish.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDish && <DishDetailsModal key={selectedDish.id} dish={selectedDish}
        onClose={() => setSelectedDish(null)} onUpdated={() => { void loadDishes(); }} />}
      {isModalOpen && (
        <DishFormModal dishId={editingDishId} onClose={handleModalClose} />
      )}
    </>
  );
}
