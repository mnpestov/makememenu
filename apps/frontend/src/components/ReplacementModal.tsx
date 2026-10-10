import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DishSummary, WeeklyMenuFull } from '@make-me-menu/shared';
import { X, RefreshCw } from 'lucide-react';
import './ReplacementModal.css';

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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card modal-content replacement-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="replacement-modal__header">
          <h2 className="replacement-modal__title">Выберите замену</h2>
          <button className="replacement-modal__close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="replacement-modal__body">
          {loading ? (
            <div className="replacement-modal__loading">
              <RefreshCw className="replacement-modal__candidate-spinner" size={24} />
            </div>
          ) : error ? (
            <div className="replacement-modal__error">
              <p>{error}</p>
              <button
                className="btn btn-secondary replacement-modal__error-action"
                onClick={loadCandidates}
              >
                Повторить
              </button>
            </div>
          ) : candidates.length === 0 ? (
            <div className="replacement-modal__empty">
              Подходящих вариантов для замены не найдено.
            </div>
          ) : (
            <div className="replacement-modal__list">
              {candidates.map(dish => (
                <button
                  key={dish.id}
                  className={[
                    'replacement-modal__candidate',
                    replacingId !== null && replacingId !== dish.id
                      ? 'replacement-modal__candidate--loading'
                      : ''
                  ].join(' ')}
                  onClick={() => handleSelect(dish.id)}
                  disabled={replacingId !== null}
                >
                  <div className="replacement-modal__candidate-header">
                    <span className="replacement-modal__candidate-name">{dish.name}</span>
                    {replacingId === dish.id && (
                      <RefreshCw className="replacement-modal__candidate-spinner" size={16} />
                    )}
                  </div>
                  <div className="replacement-modal__candidate-meta">
                    <span className="replacement-modal__candidate-category">
                      {dish.category?.name || 'Без категории'}
                    </span>
                    <span className="replacement-modal__candidate-difficulty">
                      • {dish.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
