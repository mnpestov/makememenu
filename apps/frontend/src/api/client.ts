import type {
  AppSettings,
  UpdateSettingsDto,
  Category,
  Ingredient,
  DishSummary,
  DishFull,
  CreateDishDto,
  UpdateDishDto,
  CreateCategoryDto,
  CreateIngredientDto,
  WeeklyMenuFull,
  GenerateMenuDto,
  ReplaceMenuItemDto,
  ShoppingItem,
  UpdateShoppingItemDto
} from '@family-menu/shared';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  settings: {
    get: () => fetchJson<AppSettings>('/settings'),
    update: (data: UpdateSettingsDto) => fetchJson<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },
  categories: {
    getAll: () => fetchJson<Category[]>('/categories'),
    create: (data: CreateCategoryDto) => fetchJson<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  ingredients: {
    getAll: (search?: string) => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return fetchJson<Ingredient[]>(`/ingredients${qs}`);
    },
    create: (data: CreateIngredientDto) => fetchJson<Ingredient>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  dishes: {
    getAll: () => fetchJson<DishSummary[]>('/dishes'),
    getById: (id: number) => fetchJson<DishFull>(`/dishes/${id}`),
    create: (data: CreateDishDto) => fetchJson<DishFull>('/dishes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: UpdateDishDto) => fetchJson<DishFull>(`/dishes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/dishes/${id}`, {
      method: 'DELETE',
    }),
  },
  menus: {
    getCurrent: () => fetchJson<WeeklyMenuFull>('/menus/current'),
    deleteCurrent: () => fetchJson<void>('/menus/current', { method: 'DELETE' }),
    generate: (data: GenerateMenuDto) => fetchJson<WeeklyMenuFull>('/menus/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getReplacements: (menuId: number, itemId: number) => 
      fetchJson<DishSummary[]>(`/menus/${menuId}/items/${itemId}/replacements`),
    replaceItem: (menuId: number, itemId: number, data: ReplaceMenuItemDto) => 
      fetchJson<WeeklyMenuFull>(`/menus/${menuId}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getShoppingList: (menuId: number) =>
      fetchJson<ShoppingItem[]>(`/menus/${menuId}/shopping`),
    updateShoppingItem: (menuId: number, itemId: number, data: UpdateShoppingItemDto) =>
      fetchJson<ShoppingItem>(`/menus/${menuId}/shopping/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  }
};
