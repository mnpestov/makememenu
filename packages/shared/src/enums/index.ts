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
  TEASPOON: 'TEASPOON',
  TABLESPOON: 'TABLESPOON',
  CUP: 'CUP',
  PACK: 'PACK',
  CLOVE: 'CLOVE',
  PINCH: 'PINCH',
  SPRIG: 'SPRIG',
  SLICE: 'SLICE',
  TO_TASTE: 'TO_TASTE',
  CAN: 'CAN',
  LEAF: 'LEAF',
  HEAD: 'HEAD',
  RING: 'RING',
} as const;

export type Unit = (typeof Unit)[keyof typeof Unit];

export const UNIT_LABELS: Record<Unit, string> = {
  GRAM: 'гр',
  KILOGRAM: 'кг',
  MILLILITER: 'мл',
  LITER: 'л',
  PIECE: 'шт',
  TEASPOON: 'ч.л.',
  TABLESPOON: 'ст.л.',
  CUP: 'чашка',
  PACK: 'упак.',
  CLOVE: 'зубч.',
  PINCH: 'щеп.',
  SPRIG: 'вет.',
  SLICE: 'ломт.',
  TO_TASTE: 'по вкусу',
  CAN: 'банк.',
  LEAF: 'лист.',
  HEAD: 'коч.',
  RING: 'кольц.',
};

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

/**
 * Повар блюда (кто может готовить).
 */
export const Cook = {
  YULIA: 'YULIA',
  MISHA: 'MISHA',
  BOTH: 'BOTH',
} as const;

export type Cook = (typeof Cook)[keyof typeof Cook];

export const COOK_LABELS: Record<Cook, string> = {
  YULIA: 'Юля',
  MISHA: 'Миша',
  BOTH: 'Юля и Миша',
};

/**
 * Члены семьи, которые могут быть назначены готовить в конкретный день.
 */
export const CookPerson = {
  YULIA: 'YULIA',
  MISHA: 'MISHA',
} as const;

export type CookPerson = (typeof CookPerson)[keyof typeof CookPerson];

export const COOK_PERSON_LABELS: Record<CookPerson, string> = {
  YULIA: 'Юля',
  MISHA: 'Миша',
};


export const DishStatus = { TRY: 'TRY', FAVORITE: 'FAVORITE', REJECTED: 'REJECTED' } as const;
export type DishStatus = (typeof DishStatus)[keyof typeof DishStatus];
export const DISH_STATUS_LABELS: Record<DishStatus, string> = {
  TRY: 'Хочу попробовать', FAVORITE: 'Постоянное меню', REJECTED: 'Отклонено',
};
export const NutritionBasis = { PER_SERVING: 'PER_SERVING', PER_100G: 'PER_100G' } as const;
export type NutritionBasis = (typeof NutritionBasis)[keyof typeof NutritionBasis];
export const IngredientScaling = { LINEAR: 'LINEAR', DAMPED: 'DAMPED', FIXED: 'FIXED' } as const;
export type IngredientScaling = (typeof IngredientScaling)[keyof typeof IngredientScaling];
