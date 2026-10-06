import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Difficulty, 
  Unit, 
  UNIT_LABELS,
  Cook,
  COOK_LABELS,
  type Category, 
  type Ingredient, 
  type CreateDishDto, 
  type UpdateDishDto 
} from '@make-me-menu/shared';
import { X, Plus, Trash2 } from 'lucide-react';

interface DishFormModalProps {
  dishId: number | null; // null means create
  onClose: (saved: boolean) => void;
}

export function DishFormModal({ dishId, onClose }: DishFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredientsList, setIngredientsList] = useState<Ingredient[]>([]);

  const [formData, setFormData] = useState<{
    name: string;
    categoryName: string;
    difficulty: Difficulty;
    cook: Cook;
    servings: number;
    recipe: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    forBreakfast: boolean;
    forLunch: boolean;
    ingredients: { name: string; amount: number; unit: Unit }[];
  }>({
    name: '',
    categoryName: '',
    difficulty: Difficulty.EASY,
    cook: Cook.BOTH,
    servings: 1,
    recipe: '',
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    forBreakfast: false,
    forLunch: false,
    ingredients: []
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, ings] = await Promise.all([
        api.categories.getAll(),
        api.ingredients.getAll()
      ]);
      setCategories(cats);
      setIngredientsList(ings);

      if (dishId) {
        const dish = await api.dishes.getById(dishId);
        setFormData({
          name: dish.name,
          categoryName: dish.category?.name || '',
          difficulty: dish.difficulty as Difficulty,
          cook: (dish.cook as Cook) || Cook.BOTH,
          servings: dish.servings,
          recipe: dish.recipe || '',
          calories: dish.calories || 0,
          protein: dish.protein || 0,
          fat: dish.fat || 0,
          carbs: dish.carbs || 0,
          forBreakfast: dish.forBreakfast,
          forLunch: dish.forLunch,
          ingredients: dish.ingredients.map(i => ({
            name: i.ingredient.name,
            amount: i.amount,
            unit: i.unit as Unit
          }))
        });
      } else {
        if (cats.length > 0) {
          setFormData(prev => ({ ...prev, categoryName: cats[0].name }));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients, 
        { name: '', amount: 1, unit: Unit.GRAM }
      ]
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newIngs = [...prev.ingredients];
      newIngs[index] = { ...newIngs[index], [field]: value };
      return { ...prev, ingredients: newIngs };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Resolve Category
      let categoryId: number | undefined;
      if (formData.categoryName.trim()) {
        categoryId = categories.find(c => c.name.toLowerCase() === formData.categoryName.trim().toLowerCase())?.id;
        if (!categoryId) {
          const newCat = await api.categories.create({ name: formData.categoryName.trim() });
          categoryId = newCat.id;
        }
      }

      // Resolve Ingredients
      const finalIngredients = [];
      for (const ing of formData.ingredients) {
        if (!ing.name.trim()) continue;
        let ingId = ingredientsList.find(i => i.name.toLowerCase() === ing.name.trim().toLowerCase())?.id;
        if (!ingId) {
          const newIng = await api.ingredients.create({ name: ing.name.trim() });
          ingId = newIng.id;
        }
        finalIngredients.push({ ingredientId: ingId, amount: ing.amount, unit: ing.unit });
      }

      const payload = {
        name: formData.name,
        categoryId,
        difficulty: formData.difficulty,
        cook: formData.cook,
        servings: formData.servings,
        forBreakfast: formData.forBreakfast,
        forLunch: formData.forLunch,
        recipe: formData.recipe || null,
        calories: formData.calories || null,
        protein: formData.protein || null,
        fat: formData.fat || null,
        carbs: formData.carbs || null,
        ingredients: finalIngredients,
      };

      if (dishId) {
        await api.dishes.update(dishId, payload as UpdateDishDto);
      } else {
        await api.dishes.create(payload as CreateDishDto);
      }
      onClose(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="modal-overlay"
      onClick={() => onClose(false)}
    >
      <div 
        className="card modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px' }}
      >
        <button 
          onClick={() => onClose(false)}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '1.5rem', fontSize: 'var(--font-size-xl)' }}>
          {dishId ? 'Редактировать блюдо' : 'Создать блюдо'}
        </h2>

        {loading ? (
          <p>Загрузка данных...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <datalist id="ingredients-list">
              {ingredientsList.map(inf => <option key={inf.id} value={inf.name} />)}
            </datalist>
            <datalist id="categories-list">
              {categories.map(c => <option key={c.id} value={c.name} />)}
            </datalist>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
                {error}
              </div>
            )}

            <div className="form-grid-2" style={{ gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Название</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Категория</label>
                <input 
                  list="categories-list"
                  value={formData.categoryName} 
                  onChange={e => setFormData({...formData, categoryName: e.target.value})} 
                  style={inputStyle}
                  placeholder="Выберите или введите новую..."
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Сложность</label>
                <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value as Difficulty})} style={inputStyle}>
                  {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Повар (кто может готовить)</label>
                <select value={formData.cook} onChange={e => setFormData({...formData, cook: e.target.value as Cook})} style={inputStyle}>
                  {Object.values(Cook).map(c => <option key={c} value={c}>{COOK_LABELS[c]}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Базовые порции (для расчёта)</label>
                <input type="number" required min="1" value={formData.servings} onChange={e => setFormData({...formData, servings: Number(e.target.value)})} style={inputStyle} />
              </div>
            </div>

            <div className="checkbox-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.forBreakfast} onChange={e => setFormData({...formData, forBreakfast: e.target.checked})} />
                Подходит для завтрака
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.forLunch} onChange={e => setFormData({...formData, forLunch: e.target.checked})} />
                Подходит для обеда (или ужина)
              </label>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Рецепт</label>
              <textarea 
                rows={4}
                value={formData.recipe} 
                onChange={e => setFormData({...formData, recipe: e.target.value})} 
                style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
              />
            </div>

            <div className="form-grid-4" style={{ gap: '1rem' }}>
              <div>
                <label>Ккал</label>
                <input type="number" min="0" value={formData.calories} onChange={e => setFormData({...formData, calories: Number(e.target.value)})} style={inputStyle} />
              </div>
              <div>
                <label>Белки</label>
                <input type="number" min="0" value={formData.protein} onChange={e => setFormData({...formData, protein: Number(e.target.value)})} style={inputStyle} />
              </div>
              <div>
                <label>Жиры</label>
                <input type="number" min="0" value={formData.fat} onChange={e => setFormData({...formData, fat: Number(e.target.value)})} style={inputStyle} />
              </div>
              <div>
                <label>Углеводы</label>
                <input type="number" min="0" value={formData.carbs} onChange={e => setFormData({...formData, carbs: Number(e.target.value)})} style={inputStyle} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)' }}>Ингредиенты</h3>
                <button type="button" className="btn btn-secondary" onClick={handleAddIngredient}>
                  <Plus size={16} /> Добавить
                </button>
              </div>
              
              {formData.ingredients.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Нет ингредиентов.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {formData.ingredients.map((ing, i) => (
                    <div key={i} className="ingredient-row">
                      <input 
                        list="ingredients-list"
                        required
                        placeholder="Название ингредиента..."
                        value={ing.name} 
                        onChange={e => handleIngredientChange(i, 'name', e.target.value)} 
                        style={{ ...inputStyle, flex: 2 }}
                      />
                      
                      <input 
                        type="number" 
                        min="0.1" 
                        step="0.1"
                        value={ing.amount} 
                        onChange={e => handleIngredientChange(i, 'amount', Number(e.target.value))} 
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      
                      <select 
                        value={ing.unit} 
                        onChange={e => handleIngredientChange(i, 'unit', e.target.value as Unit)} 
                        style={{ ...inputStyle, flex: 1 }}
                      >
                        {Object.values(Unit).map(u => <option key={u} value={u}>{UNIT_LABELS?.[u as Unit] || u}</option>)}
                      </select>

                      <button type="button" onClick={() => handleRemoveIngredient(i)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.5rem' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => onClose(false)} disabled={saving}>
                Отмена
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '0.5rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--font-size-base)',
  width: '100%'
};
