import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DishSummary, WeeklyMenuFull } from '@family-menu/shared';
import { X, RefreshCw } from 'lucide-react';

interface ReplacementModalProps {
  menuId: number;
  itemId: number;
  onClose: () => void;
  onSuccess: (newMenu: WeeklyMenuFull) => void;
}

export function ReplacementModal({ menuId, itemId, onClose, onSuccess }: ReplacementModalProps) {
  const [candidates, setCandidates] = useState<DishSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<number | null>(null);

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuId, itemId]);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.menus.getReplacements(menuId, itemId);
      setCandidates(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки вариантов замены');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (dishId: number) => {
    setReplacingId(dishId);
    setError(null);
    try {
      const newMenu = await api.menus.replaceItem(menuId, itemId, { dishId });
      onSuccess(newMenu);
    } catch (err: any) {
      setError(err.message || 'Ошибка при замене блюда');
      setReplacingId(null);
    }
  };

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
    >
      <div 
        className="card modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, margin: 0 }}>Выберите замену</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--color-text-secondary)' }} />
            </div>
          ) : error ? (
            <div style={{ color: 'var(--color-danger)', textAlign: 'center', padding: '1rem' }}>
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={loadCandidates} style={{ marginTop: '1rem' }}>
                Повторить
              </button>
            </div>
          ) : candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
              Подходящих вариантов для замены не найдено.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {candidates.map(dish => (
                <button
                  key={dish.id}
                  onClick={() => handleSelect(dish.id)}
                  disabled={replacingId !== null}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    cursor: replacingId ? 'not-allowed' : 'pointer',
                    opacity: replacingId && replacingId !== dish.id ? 0.5 : 1,
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                  className="candidate-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>{dish.name}</span>
                    {replacingId === dish.id && (
                      <RefreshCw className="animate-spin" size={16} style={{ color: 'var(--color-brand-primary)' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{dish.category?.name || 'Без категории'}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>• {dish.difficulty}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .candidate-card:hover:not(:disabled) {
          border-color: var(--color-brand-primary);
          background-color: var(--color-brand-subtle);
        }
      `}</style>
    </div>
  );
}
