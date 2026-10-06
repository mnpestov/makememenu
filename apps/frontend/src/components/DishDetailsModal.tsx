import type { DishFull } from '@family-menu/shared';
import { UNIT_LABELS, COOK_LABELS } from '@family-menu/shared';
import { X } from 'lucide-react';

interface DishDetailsModalProps {
  dish: DishFull;
  onClose: () => void;
}

export function DishDetailsModal({ dish, onClose }: DishDetailsModalProps) {
  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
    >
      <div 
        className="card modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
        >
          <X size={24} />
        </button>

        <div style={{ marginBottom: '1.5rem', paddingRight: '2rem' }}>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, marginBottom: '0.5rem' }}>{dish.name}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge">{dish.category?.name || 'Без категории'}</span>
            <span className="badge badge-outline">Сложность: {dish.difficulty}</span>
            <span className="badge badge-outline">Повар: {COOK_LABELS[dish.cook] || 'Юля и Миша'}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'var(--color-bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Базовые порции (для рецепта)</p>
            <p style={{ fontWeight: 500 }}>{dish.servings}</p>
          </div>
          <div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>КБЖУ (К/Б/Ж/У)</p>
            <p style={{ fontWeight: 500 }}>
              {dish.calories || '-'} / {dish.protein || '-'} / {dish.fat || '-'} / {dish.carbs || '-'}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem' }}>
            Ингредиенты
          </h3>
          {dish.ingredients.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>Ингредиенты не указаны.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dish.ingredients.map(ing => (
                <li key={ing.ingredient.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-bg-primary)', paddingBottom: '0.25rem' }}>
                  <span>{ing.ingredient.name}</span>
                  <span style={{ fontWeight: 500 }}>{ing.amount} {UNIT_LABELS?.[ing.unit as keyof typeof UNIT_LABELS] || ing.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem' }}>
            Рецепт
          </h3>
          {dish.recipe ? (
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{dish.recipe}</p>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)' }}>Рецепт не описан.</p>
          )}
        </div>

      </div>
      <style>{`
        .badge {
          display: inline-flex;
          align-items: center;
          background-color: var(--color-brand-subtle);
          color: var(--color-brand-primary);
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 500;
        }
        .badge-outline {
          background-color: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
