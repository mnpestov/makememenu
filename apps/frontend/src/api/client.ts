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
  UpdateShoppingItemDto,
  ReviewDishDto
} from '@make-me-menu/shared';

const API_BASE = '/api';

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('Войдите в приложение снова');
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) throw new Error('Сессия завершена. Войдите снова');
      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken as string;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let token = localStorage.getItem('accessToken');
  
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const reqOptions: RequestInit = {
    ...options,
    headers,
  };

  let response = await fetch(`${API_BASE}${url}`, reqOptions);

  if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
    try {
      headers.set('Authorization', `Bearer ${await refreshAccessToken()}`);
    } catch (error) {
      window.dispatchEvent(new Event('auth:logout'));
      throw error;
    }
    response = await fetch(`${API_BASE}${url}`, { ...options, headers });
    if (response.status === 401) window.dispatchEvent(new Event('auth:logout'));
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

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
    update: (id: number, data: any) => fetchJson<Ingredient>(`/ingredients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    searchStore: (query: string) => fetchJson<any>(`/ingredients/search-store?q=${encodeURIComponent(query)}`),
  },
  dishes: {
    review: (id: number, data: ReviewDishDto) => fetchJson<DishFull>(`/dishes/${id}/review`, {
      method: 'POST', body: JSON.stringify(data),
    }),
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
    getNext: () => fetchJson<WeeklyMenuFull>('/menus/next'),
    deleteNext: () => fetchJson<void>('/menus/next', { method: 'DELETE' }),
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
    estimateShoppingList: (menuId: number) =>
      fetchJson<any>(`/menus/${menuId}/shopping/estimate`),
    updateShoppingItem: (menuId: number, itemId: number, data: UpdateShoppingItemDto) =>
      fetchJson<ShoppingItem>(`/menus/${menuId}/shopping/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  auth: {
    login: (credentials: any) => fetchJson<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  }
};
