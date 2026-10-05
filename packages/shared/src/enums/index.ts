/**
 * Тип приёма пищи.
 * Ужин не является отдельной сущностью — он автоматически равен обеду.
 */
export const MealType = {
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
} as const;

export type MealType = (typeof MealType)[keyof typeof MealType];

/**
 * Сложность блюда. Задаётся пользователем вручную.
 * Приложение не определяет сложность автоматически.
 */
export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

/**
 * Единица измерения ингредиента.
 * Расширяемый список — добавление новой единицы не требует переработки генератора.
 */
export const Unit = {
  GRAM: 'GRAM',
  KILOGRAM: 'KILOGRAM',
  MILLILITER: 'MILLILITER',
  LITER: 'LITER',
  PIECE: 'PIECE',
} as const;

export type Unit = (typeof Unit)[keyof typeof Unit];

/**
 * День недели для настроек генерации.
 */
export const DayOfWeek = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY',
} as const;

export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

/**
 * Упорядоченный список дней недели (понедельник → воскресенье).
 */
export const WEEK_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

/**
 * Стартовые категории блюд.
 * Хранятся в БД как обычные записи Category.
 * Это значения для seed-скрипта — не enum в бизнес-логике.
 */
export const DEFAULT_CATEGORIES = [
  'Завтрак',
  'Суп',
  'Мясо',
  'Птица',
  'Рыба',
  'Паста',
  'Гарнир',
  'Салат',
  'Выпечка',
  'Другое',
] as const;

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];
