import type { DishSummary, DishFull } from '@make-me-menu/shared';
import { COOK_LABELS } from '@make-me-menu/shared';
import { Info } from 'lucide-react';
import './DishCard.css';

interface DishCardProps {
  dish: DishSummary | DishFull;
  mealTypeLabel: string;
  onClick: () => void;
  actionButton?: React.ReactNode;
}

export function DishCard({ dish, mealTypeLabel, onClick, actionButton }: DishCardProps) {
  return (
    <div className="card dish-card">
      <div className="dish-card__header">
        <span className="dish-card__meal-type">{mealTypeLabel}</span>
        <button
          className="dish-card__info-btn"
          onClick={onClick}
          title="Подробнее о блюде"
        >
          <Info size={18} />
        </button>
      </div>

      <h4 className="dish-card__name">{dish.name}</h4>

      <div className="dish-card__meta">
        <span className="dish-card__category">
          {dish.category?.name || 'Без категории'}
        </span>
        <span className="dish-card__difficulty">• {dish.difficulty}</span>
        <span className="dish-card__cook">
          {COOK_LABELS[dish.cook] || 'Юля и Миша'}
        </span>
      </div>

      <div className="dish-card__footer">
        {actionButton}
      </div>
    </div>
  );
}
