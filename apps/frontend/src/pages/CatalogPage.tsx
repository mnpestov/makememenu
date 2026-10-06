import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DishSummary } from '@make-me-menu/shared';
import { COOK_LABELS } from '@make-me-menu/shared';
import { Search, Plus } from 'lucide-react';
import { DishFormModal } from '../components/DishFormModal';

export function CatalogPage() {
  const [dishes, setDishes] = useState<DishSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  useEffect(() => {
    loadDishes();
  }, []);

  const filteredDishes = dishes.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (COOK_LABELS[d.cook] || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setEditingDishId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    setEditingDishId(id);
    setIsModalOpen(true);
  };

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
    if (saved) {
      loadDishes();
    }
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
        
        <div style={{ marginBottom: '1.25rem', position: 'relative', width: '100%', maxWidth: '500px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Поиск по названию, категории или повару..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-base)',
              backgroundColor: 'var(--color-bg-secondary)'
            }}
          />
        </div>

        {error && (
          <div className="card" style={{ borderColor: 'var(--color-danger)', marginBottom: '1rem' }}>
            <p style={{ color: 'var(--color-danger)' }}>{error}</p>
          </div>
        )}

        {loading ? (
          <p>Загрузка каталога...</p>
        ) : filteredDishes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>Блюда не найдены.</p>
          </div>
        ) : (
          <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredDishes.map(dish => (
              <div key={dish.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {dish.name}
                  </h3>
                  <span style={{ 
                    display: 'inline-block',
                    backgroundColor: 'var(--color-bg-primary)', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {dish.category?.name || 'Без категории'}
                  </span>
                </div>
                
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p><strong>Сложность:</strong> {dish.difficulty}</p>
                  <p><strong>Повар:</strong> {COOK_LABELS[dish.cook] || 'Юля и Миша'}</p>
                  <p>
                    <strong>Подходит для:</strong>{' '}
                    {[
                      dish.forBreakfast ? 'Завтрака' : null, 
                      dish.forLunch ? 'Обеда' : null
                    ].filter(Boolean).join(', ') || 'Ничего'}
                  </p>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleEdit(dish.id)}>
                    Редактировать
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, color: 'var(--color-danger)', borderColor: 'var(--color-border)' }}
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

      {isModalOpen && (
        <DishFormModal dishId={editingDishId} onClose={handleModalClose} />
      )}
    </>
  );
}
