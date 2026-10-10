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
} from '@make-me-menu/shared';
import './SettingsPage.css';

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

  useEffect(() => { loadSettings(); }, []);

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
        availableCooks: [CookPerson.YULIA, CookPerson.MISHA],
      };
      const hasDiff = currentDay.allowedDifficulties.includes(diff);
      let newDiffs = hasDiff
        ? currentDay.allowedDifficulties.filter(d => d !== diff)
        : [...currentDay.allowedDifficulties, diff];
      if (newDiffs.length === 0) newDiffs = [Difficulty.EASY];
      return {
        ...prev,
        daySettings: { ...prev.daySettings, [day]: { ...currentDay, allowedDifficulties: newDiffs } },
      };
    });
  };

  const handleCookToggle = (day: DayOfWeek, person: CookPerson) => {
    if (!settings) return;
    setSettings(prev => {
      if (!prev) return prev;
      const currentDay = prev.daySettings?.[day] || {
        allowedDifficulties: [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD],
        availableCooks: [CookPerson.YULIA, CookPerson.MISHA],
      };
      const currentCooks = currentDay.availableCooks || [CookPerson.YULIA, CookPerson.MISHA];
      const newCooks = currentCooks.includes(person)
        ? currentCooks.filter(p => p !== person)
        : [...currentCooks, person];
      if (newCooks.length === 0) return prev;
      return {
        ...prev,
        daySettings: { ...prev.daySettings, [day]: { ...currentDay, availableCooks: newCooks } },
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
        familySize: Number(settings.familySize) || 1,
        mealsPerDay: Number(settings.mealsPerDay) || 1,
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
    return <div className="page-body"><p>Загрузка настроек...</p></div>;
  }

  if (error && !settings) {
    return (
      <div className="page-body">
        <div className="card settings-form__error-card">
          <h2 className="settings-form__error-title">Ошибка загрузки</h2>
          <p>{error}</p>
          <button className="btn btn-primary settings-form__error-action" onClick={loadSettings}>
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
        <div className="card settings-form">
          <form className="settings-form__body" onSubmit={handleSave}>

            <div className="settings-form__field">
              <label className="settings-form__label" htmlFor="familySize">
                Количество человек в семье
              </label>
              <input
                id="familySize"
                className="settings-form__input"
                type="number"
                min="1"
                max="20"
                value={settings?.familySize ?? ''}
                onChange={(e) => setSettings(s => s ? {
                  ...s,
                  familySize: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10),
                } : s)}
              />
            </div>

            <div className="settings-form__field">
              <label className="settings-form__label" htmlFor="mealsPerDay">
                Приёмов пищи в день (завтрак, обед и т.д.)
              </label>
              <input
                id="mealsPerDay"
                className="settings-form__input"
                type="number"
                min="1"
                max="5"
                value={settings?.mealsPerDay ?? ''}
                onChange={(e) => setSettings(s => s ? {
                  ...s,
                  mealsPerDay: e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10),
                } : s)}
              />
            </div>

            <p className="settings-form__hint">
              Итоговое количество порций для каждого рецепта будет пересчитано автоматически
              ({settings?.familySize} × {settings?.mealsPerDay} = {settings?.targetServings} порций).
            </p>

            <h2 className="settings-form__days-title">Настройки по дням недели</h2>
            <p className="settings-form__days-desc">
              Укажите, кто может готовить (Юля, Миша) и какая сложность блюд допускается в каждый день недели.
            </p>

            <div className="settings-form__days">
              {settings && WEEK_DAYS.map(day => {
                const daySetting = settings.daySettings?.[day];
                const allowed = daySetting?.allowedDifficulties ?? [Difficulty.EASY];
                const cooks = daySetting?.availableCooks ?? [CookPerson.YULIA, CookPerson.MISHA];
                return (
                  <div key={day} className="settings-form__day">
                    <span className="settings-form__day-name">{dayNamesRu[day]}</span>

                    <div className="settings-form__day-options">
                      <div className="settings-form__day-group">
                        <span className="settings-form__day-group-label">Кто готовит:</span>
                        <div className="settings-form__day-checkboxes">
                          {Object.values(CookPerson).map(person => (
                            <label key={person} className="settings-form__day-checkbox-label">
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

                      <div className="settings-form__day-group">
                        <span className="settings-form__day-group-label settings-form__day-group-label--difficulty">
                          Сложность:
                        </span>
                        <div className="settings-form__day-checkboxes">
                          {Object.values(Difficulty).map(diff => (
                            <label key={diff} className="settings-form__day-checkbox-label settings-form__day-checkbox-label--diff">
                              <input
                                type="checkbox"
                                checked={allowed.includes(diff)}
                                onChange={() => handleDifficultyToggle(day, diff)}
                              />
                              <span>{diff}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <p className="settings-form__error">Ошибка: {error}</p>}
            {saveMessage && <p className="settings-form__success">{saveMessage}</p>}

            <div className="settings-form__footer">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
