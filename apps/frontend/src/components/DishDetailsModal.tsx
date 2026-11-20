import { useState } from 'react';
import { DishReviewModal } from './DishReviewModal';
import type { DishFull } from '@make-me-menu/shared';
import { UNIT_LABELS, COOK_LABELS, NutritionBasis, Unit, DISH_STATUS_LABELS } from '@make-me-menu/shared';
import { X } from 'lucide-react';
import './DishDetailsModal.css';

interface DishDetailsModalProps {
  dish: DishFull;
  onClose: () => void;
  onUpdated?: (dish: DishFull) => void;
}

export function DishDetailsModal({ dish: initialDish, onClose, onUpdated }: DishDetailsModalProps) {
  const [dish, setDish] = useState(initialDish);
  const [reviewing, setReviewing] = useState(false);
  if (reviewing) return <DishReviewModal dish={dish} onClose={() => setReviewing(false)} onSaved={updated => {
    setDish(updated);
    setReviewing(false);
    onUpdated?.(updated);
  }} />;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card modal-content dish-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="dish-modal__close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="dish-modal__head">
          <h2 className="dish-modal__title">{dish.name}</h2>
          <div className="dish-modal__badges">
            <span className="dish-modal__badge">
              {dish.category?.name || 'Без категории'}
            </span>
            <span className="dish-modal__badge dish-modal__badge--outline">
              Сложность: {dish.difficulty}
            </span>
            <span className="dish-modal__badge dish-modal__badge--outline">
              Повар: {COOK_LABELS[dish.cook] || 'Юля и Миша'}
            </span>
          </div>
        </div>

        <div className="dish-modal__section">
          <p>{DISH_STATUS_LABELS[dish.status]}{dish.rating !== null ? ` · Оценка семьи: ${dish.rating}/5` : ''}</p>
          {dish.reviewComment && <p>{dish.reviewComment}</p>}
          <button className="btn btn-primary" onClick={() => setReviewing(true)}>Приготовили — оценить</button>
        </div>
        <div className="dish-modal__stats">
          <div className="dish-modal__stat">
            <p className="dish-modal__stat-label">Базовые порции (для рецепта)</p>
            <p className="dish-modal__stat-value">{dish.servings}</p>
          </div>
          <div className="dish-modal__stat">
            <p className="dish-modal__stat-label">КБЖУ {dish.nutritionBasis === NutritionBasis.PER_SERVING ? 'на порцию' : 'на 100 г'} (ккал/г/г/г)</p>
            <p className="dish-modal__stat-value">
              {dish.calories ?? '—'} / {dish.protein ?? '—'} / {dish.fat ?? '—'} / {dish.carbs ?? '—'}
            </p>
          </div>
        </div>

        {dish.source === 'UNITOOLS' && (
          <p className="dish-modal__section">
            Источник: <a href="https://theunitools.com/ru/data" target="_blank" rel="noreferrer">UniTools</a>
            {' · '}<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
            {' · '}Подготовка: {dish.prepMinutes} мин, готовка: {dish.cookMinutes} мин.
          </p>
        )}

        <div className="dish-modal__section">
          <h3 className="dish-modal__section-title">Ингредиенты</h3>
          {dish.ingredients.length === 0 ? (
            <p className="dish-modal__empty-text">Ингредиенты не указаны.</p>
          ) : (
            <ul className="dish-modal__ingredients">
              {dish.ingredients.map((ing, index) => (
                <li key={`${ing.ingredient.id}-${index}`} className="dish-modal__ingredient">
                  <span className="dish-modal__ingredient-name">{ing.ingredient.name}{ing.note ? ` (${ing.note})` : ''}</span>
                  <span className="dish-modal__ingredient-amount">
                    {ing.unit !== Unit.TO_TASTE && ing.amount} {UNIT_LABELS?.[ing.unit as keyof typeof UNIT_LABELS] || ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dish-modal__section">
          <h3 className="dish-modal__section-title">Рецепт</h3>
          {dish.recipe ? (
            <p className="dish-modal__recipe">{dish.recipe}</p>
          ) : (
            <p className="dish-modal__empty-text">Рецепт не описан.</p>
          )}
        </div>
      </div>
    </div>
  );
}
