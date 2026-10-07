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
} from '@make-me-menu/shared';

const API_BASE = '/api';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

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
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            onRefreshed(data.accessToken);
          } else {
            // Refresh failed, logout
            window.dispatchEvent(new Event('auth:logout'));
            return new Promise<T>(() => {}); // pending promise to avoid unhandled rejection during unmount
          }
        } catch (e) {
          window.dispatchEvent(new Event('auth:logout'));
          return new Promise<T>(() => {}); // pending promise
        } finally {
          isRefreshing = false;
        }
      }

      // Wait for refresh to complete, then retry the request
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken: string) => {
          try {
            headers.set('Authorization', `Bearer ${newToken}`);
            const retryRes = await fetch(`${API_BASE}${url}`, { ...options, headers });
            if (!retryRes.ok) {
              const errData = await retryRes.json().catch(() => ({}));
              return reject(new Error(errData.message || `API error: ${retryRes.status}`));
            }
            if (retryRes.status === 204) return resolve({} as T);
            resolve(await retryRes.json());
          } catch (err) {
            reject(err);
          }
        });
      });
    } else {
      // No refresh token, force logout
      window.dispatchEvent(new Event('auth:logout'));
      return new Promise<T>(() => {}); // pending promise
    }
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
