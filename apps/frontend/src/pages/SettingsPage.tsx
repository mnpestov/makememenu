import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Difficulty, 
  DayOfWeek, 
  WEEK_DAYS, 
  CookPerson,
  COOK_PERSON_LABELS,
  type AppSettings, 
  type UpdateSettingsDto 
} from '@family-menu/shared';

const dayNamesRu: Record<DayOfWeek, string> = {
  MONDAY: 'Понедельник',
  TUESDAY: 'Вторник',
  WEDNESDAY: 'Среда',
  THURSDAY: 'Четверг',
  FRIDAY: 'Пятница',
  SATURDAY: 'Суббота',
  SUNDAY: 'Воскресенье',
};

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.settings.get();
      setSettings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDifficultyToggle = (day: DayOfWeek, diff: Difficulty) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      const currentDay = prev.daySettings?.[day] || { 
        allowedDifficulties: [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD],
        availableCooks: [CookPerson.YULIA, CookPerson.MISHA] 
      };
      const hasDiff = currentDay.allowedDifficulties.includes(diff);
      let newDiffs = [...currentDay.allowedDifficulties];
      
      if (hasDiff) {
        newDiffs = newDiffs.filter(d => d !== diff);
      } else {
        newDiffs.push(diff);
      }
      
      // Prevent selecting 0 difficulties
      if (newDiffs.length === 0) newDiffs = [Difficulty.EASY];
      
      return {
        ...prev,
        daySettings: {
          ...prev.daySettings,
          [day]: { 
            ...currentDay,
            allowedDifficulties: newDiffs 
          }
        }
      };
    });
  };

  const handleCookToggle = (day: DayOfWeek, person: CookPerson) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      const currentDay = prev.daySettings?.[day] || { 
        allowedDifficulties: [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD],
        availableCooks: [CookPerson.YULIA, CookPerson.MISHA] 
      };
      const currentCooks = currentDay.availableCooks || [CookPerson.YULIA, CookPerson.MISHA];
      const hasPerson = currentCooks.includes(person);
      let newCooks = [...currentCooks];

      if (hasPerson) {
        newCooks = newCooks.filter(p => p !== person);
      } else {
        newCooks.push(person);
      }

      // Prevent selecting 0 cooks (at least one cook must remain selected)
      if (newCooks.length === 0) {
        return prev;
      }

      return {
        ...prev,
        daySettings: {
          ...prev.daySettings,
          [day]: {
            ...currentDay,
            availableCooks: newCooks,
          }
        }
      };
    });
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const payload: UpdateSettingsDto = {
        familySize: settings.familySize,
        mealsPerDay: settings.mealsPerDay,
        daySettings: settings.daySettings,
      };
      
      const updated = await api.settings.update(payload);
      setSettings(updated);
      setSaveMessage('Настройки успешно сохранены!');
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-body">
        <p>Загрузка настроек...</p>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="page-body">
        <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
          <h2 style={{ color: 'var(--color-danger)' }}>Ошибка загрузки</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadSettings} style={{ marginTop: '1rem' }}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Настройки семьи</h1>
      </header>
      <div className="page-body">
        <div className="card" style={{ maxWidth: '680px' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="familySize" style={{ fontWeight: 500 }}>
                Количество человек в семье
              </label>
              <input
                id="familySize"
                type="number"
                min="1"
                max="20"
                value={settings?.familySize || 1}
                onChange={(e) => setSettings(s => s ? { ...s, familySize: parseInt(e.target.value, 10) } : s)}
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-base)'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="mealsPerDay" style={{ fontWeight: 500 }}>
                Приёмов пищи в день (завтрак, обед и т.д.)
              </label>
              <input
                id="mealsPerDay"
                type="number"
                min="1"
                max="5"
                value={settings?.mealsPerDay || 1}
                onChange={(e) => setSettings(s => s ? { ...s, mealsPerDay: parseInt(e.target.value, 10) } : s)}
                style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: 'var(--font-size-base)'
                }}
              />
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Итоговое количество порций для каждого рецепта будет пересчитано автоматически ({settings?.familySize} × {settings?.mealsPerDay} = {settings?.targetServings} порций).
              </p>
            </div>

            <h2 style={{ marginTop: '1.25rem', fontSize: 'var(--font-size-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              Настройки по дням недели
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Укажите, кто может готовить (Юля, Миша) и какая сложность блюд допускается в каждый день недели.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {settings && WEEK_DAYS.map(day => {
                const daySetting = settings.daySettings?.[day];
                const allowed = daySetting?.allowedDifficulties ?? [Difficulty.EASY];
                const cooks = daySetting?.availableCooks ?? [CookPerson.YULIA, CookPerson.MISHA];
                return (
                  <div 
                    key={day} 
                    style={{ 
                      padding: '0.75rem', 
                      backgroundColor: 'var(--color-bg-primary)', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{dayNamesRu[day]}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                      {/* Кто готовит */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', minWidth: '90px' }}>
                          Кто готовит:
                        </span>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          {Object.values(CookPerson).map(person => (
                            <label 
                              key={person} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.25rem', 
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 500
                              }}
                            >
                              <input 
                                type="checkbox" 
                                checked={cooks.includes(person)} 
                                onChange={() => handleCookToggle(day, person)} 
                              />
                              <span>{COOK_PERSON_LABELS[person]}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Сложность */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', minWidth: '75px' }}>
                          Сложность:
                        </span>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          {Object.values(Difficulty).map(diff => (
                            <label key={diff} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={allowed.includes(diff)} 
                                onChange={() => handleDifficultyToggle(day, diff)} 
                              />
                              <span style={{ fontSize: 'var(--font-size-sm)' }}>{diff}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
                Ошибка: {error}
              </div>
            )}

            {saveMessage && (
              <div style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-sm)' }}>
                {saveMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
