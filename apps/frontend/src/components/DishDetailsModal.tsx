import type { DishFull } from '@make-me-menu/shared';
import { UNIT_LABELS, COOK_LABELS } from '@make-me-menu/shared';
import { X } from 'lucide-react';
import './DishDetailsModal.css';

interface DishDetailsModalProps {
  dish: DishFull;
  onClose: () => void;
}

export function DishDetailsModal({ dish, onClose }: DishDetailsModalProps) {
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

        <div className="dish-modal__stats">
          <div className="dish-modal__stat">
            <p className="dish-modal__stat-label">Базовые порции (для рецепта)</p>
            <p className="dish-modal__stat-value">{dish.servings}</p>
          </div>
          <div className="dish-modal__stat">
            <p className="dish-modal__stat-label">КБЖУ (К/Б/Ж/У)</p>
            <p className="dish-modal__stat-value">
              {dish.calories || '-'} / {dish.protein || '-'} / {dish.fat || '-'} / {dish.carbs || '-'}
            </p>
          </div>
        </div>

        <div className="dish-modal__section">
          <h3 className="dish-modal__section-title">Ингредиенты</h3>
          {dish.ingredients.length === 0 ? (
            <p className="dish-modal__empty-text">Ингредиенты не указаны.</p>
          ) : (
            <ul className="dish-modal__ingredients">
              {dish.ingredients.map(ing => (
                <li key={ing.ingredient.id} className="dish-modal__ingredient">
                  <span className="dish-modal__ingredient-name">{ing.ingredient.name}</span>
                  <span className="dish-modal__ingredient-amount">
                    {ing.amount} {UNIT_LABELS?.[ing.unit as keyof typeof UNIT_LABELS] || ing.unit}
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
