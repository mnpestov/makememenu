import { useState } from 'react';
import { DishStatus, DISH_STATUS_LABELS, type DishFull } from '@make-me-menu/shared';
import { api } from '../api/client';

interface Props {
  dish: DishFull;
  onClose: () => void;
  onSaved: (dish: DishFull) => void;
}

export function DishReviewModal({ dish, onClose, onSaved }: Props) {
  const [rating, setRating] = useState(dish.rating ?? 4);
  const [status, setStatus] = useState<DishStatus>(dish.status);
  const [comment, setComment] = useState(dish.reviewComment ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.dishes.review(dish.id, { rating, status, comment }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить оценку');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <form className="card modal-content recipe-review" onSubmit={submit} onClick={e => e.stopPropagation()}>
        <h2>Как получилось: {dish.name}?</h2>
        <p>Сохраним сегодняшнее приготовление и общую оценку семьи.</p>
        <label>
          Оценка
          <select value={rating} onChange={e => setRating(Number(e.target.value))} disabled={saving}>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} из 5</option>)}
          </select>
        </label>
        <label>
          Что делаем с рецептом?
          <select value={status} onChange={e => setStatus(e.target.value as DishStatus)} disabled={saving}>
            {Object.values(DishStatus).map(value => (
              <option key={value} value={value}>{value === DishStatus.TRY ? 'Попробовать ещё' : DISH_STATUS_LABELS[value]}</option>
            ))}
          </select>
        </label>
        <label>
          Заметка для следующего приготовления
          <textarea rows={4} maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} disabled={saving} />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="recipe-actions">
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить оценку'}</button>
        </div>
      </form>
    </div>
  );
}
