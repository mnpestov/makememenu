import type { DishSummary, DishFull } from '@make-me-menu/shared';
import { COOK_LABELS } from '@make-me-menu/shared';
import { Info } from 'lucide-react';

interface DishCardProps {
  dish: DishSummary | DishFull;
  mealTypeLabel: string;
  onClick: () => void;
  actionButton?: React.ReactNode;
}

export function DishCard({ dish, mealTypeLabel, onClick, actionButton }: DishCardProps) {
  return (
    <div className="card dish-card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ 
          fontSize: 'var(--font-size-xs)', 
          fontWeight: 600, 
          color: 'var(--color-brand-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {mealTypeLabel}
        </span>
        <button 
          onClick={onClick} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          title="Подробнее о блюде"
        >
          <Info size={18} />
        </button>
      </div>
      
      <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: '0.25rem', lineHeight: 1.2 }}>
        {dish.name}
      </h4>
      
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          {dish.category?.name || 'Без категории'}
        </span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          • {dish.difficulty}
        </span>
        <span style={{ 
          fontSize: 'var(--font-size-xs)', 
          color: 'var(--color-brand-primary)',
          backgroundColor: 'var(--color-brand-subtle)',
          padding: '0.1rem 0.4rem',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 500
        }}>
          {COOK_LABELS[dish.cook] || 'Юля и Миша'}
        </span>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', gap: '0.5rem' }}>
        {actionButton}
      </div>
      
      <style>{`
        .dish-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .dish-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
      `}</style>
    </div>
  );
}
