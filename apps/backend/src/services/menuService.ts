import prisma from '../db/prismaClient';
import { 
  GenerateMenuDto, 
  ReplaceMenuItemDto, 
  RandomReplaceMenuItemDto,
  WeeklyMenuFull,
  MenuItem,
  DayOfWeek,
  Difficulty,
  DaySettings,
  CookPerson
} from '@make-me-menu/shared';
import { ConflictError, NotFoundError, AppError } from '../utils/errors';
import { generateMenu, GenerationContext, DayConfig, MenuGenerationError, isCookSuitable } from '../domain/menuGenerator';
import { dishService } from './dishService';
import { settingsService } from './settingsService';
import { shoppingService } from './shoppingService';
import { calculateWeights, weightedRandomSelect } from '../domain/historyWeighter';
import { DishSummary } from '@make-me-menu/shared';

// Helper to get day of week enum from Date
function getDayOfWeek(date: Date): DayOfWeek {
  const days = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY
  ];
  return days[date.getUTCDay()]!;
}

// Helper to calculate current week's Monday
function getCurrentWeekStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
}

export class MenuService {
  /**
   * Automatically updates CookingHistory based on past MenuItems without history.
   * Updates Dish.lastCookedAt as cache.
   */
  async syncCookingHistory(menuId: number): Promise<void> {
    const now = new Date();
    
    // Find past menu items that don't have cooking history recorded yet
    const pastItems = await prisma.menuItem.findMany({
      where: {
        menuId,
        date: { lt: now },
        cookingHistory: { none: {} }
      }
    });

    if (pastItems.length === 0) return;

    await prisma.$transaction(async (tx) => {
      for (const item of pastItems) {
        // Create history record
        const history = await tx.cookingHistory.create({
          data: {
            dishId: item.dishId,
            menuItemId: item.id,
            cookedAt: item.date
          }
        });

        // Update Dish cache
        await tx.dish.update({
          where: { id: item.dishId },
          data: { lastCookedAt: history.cookedAt }
        });
      }
    });
  }

  async getById(id: number): Promise<WeeklyMenuFull> {
    await this.syncCookingHistory(id);

    const menu = await prisma.weeklyMenu.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            dish: {
              include: { category: true }
            }
          },
          orderBy: [
            { date: 'asc' },
            { mealType: 'asc' }
          ]
        }
      }
    });

    if (!menu) throw new NotFoundError('Menu not found');

    return {
      id: menu.id,
      weekStart: menu.weekStart.toISOString(),
      createdAt: menu.createdAt.toISOString(),
      updatedAt: menu.updatedAt.toISOString(),
      items: menu.items.map(item => ({
        id: item.id,
        menuId: item.menuId,
        mealType: item.mealType,
        date: item.date.toISOString(),
        dish: {
          id: item.dish.id,
          name: item.dish.name,
          category: item.dish.category ? {
            id: item.dish.category.id,
            name: item.dish.category.name,
            createdAt: item.dish.category.createdAt.toISOString(),
          } : null,
          difficulty: item.dish.difficulty,
          cook: item.dish.cook,
          servings: item.dish.servings,
          forBreakfast: item.dish.forBreakfast,
          forLunch: item.dish.forLunch,
          lastCookedAt: item.dish.lastCookedAt?.toISOString() ?? null,
          createdAt: item.dish.createdAt.toISOString(),
          updatedAt: item.dish.updatedAt.toISOString(),
        }
      }))
    };
  }

  async getCurrentMenu(): Promise<WeeklyMenuFull | null> {
    const weekStart = getCurrentWeekStart();
    const current = await prisma.weeklyMenu.findUnique({
      where: { weekStart }
    });

    if (!current) return null;
    return this.getById(current.id);
  }

  async deleteCurrentMenu(): Promise<void> {
    const weekStart = getCurrentWeekStart();
    await prisma.weeklyMenu.deleteMany({
      where: { weekStart }
    });
  }

  async generate(data: GenerateMenuDto): Promise<WeeklyMenuFull> {
    const weekStart = new Date(data.weekStart);
    
    const existing = await prisma.weeklyMenu.findUnique({
      where: { weekStart }
    });

    if (existing) {
      throw new ConflictError('Menu for this week already exists. Use explicit regeneration if intended.');
    }

    const settings = await settingsService.get();
    const dishes = await dishService.getAll();
    const daySettingsMap = settings.daySettings as Record<DayOfWeek, DaySettings>;

    // Construct DayConfigs for 7 days
    const days: DayConfig[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      const dayOfWeek = getDayOfWeek(d);
      const daySetting = daySettingsMap[dayOfWeek];
      
      days.push({
        date: d.toISOString(),
        dayOfWeek,
        allowedDifficulties: daySetting?.allowedDifficulties ?? [Difficulty.EASY],
        availableCooks: daySetting?.availableCooks ?? [CookPerson.YULIA, CookPerson.MISHA]
      });
    }

    const context: GenerationContext = {
      days,
      dishes,
      currentDateStr: new Date().toISOString(),
      randomGenerator: () => Math.random()
    };

    const generatedItems = generateMenu(context);

    // Save transaction
    const newMenu = await prisma.$transaction(async (tx) => {
      const menu = await tx.weeklyMenu.create({
        data: { weekStart }
      });

      await tx.menuItem.createMany({
        data: generatedItems.map(item => ({
          menuId: menu.id,
          dishId: item.dish.id,
          mealType: item.mealType,
          date: new Date(item.date)
        }))
      });

      return menu;
    });

    // Generate Shopping List
    await shoppingService.recalculateShoppingList(newMenu.id);

    return this.getById(newMenu.id);
  }

  async replaceItem(menuId: number, itemId: number, data: ReplaceMenuItemDto): Promise<WeeklyMenuFull> {
    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, menuId }
    });

    if (!item) throw new NotFoundError('Menu item not found');

    const dish = await prisma.dish.findUnique({ where: { id: data.dishId } });
    if (!dish) throw new NotFoundError('Dish not found');

    await prisma.cookingHistory.deleteMany({
      where: { menuItemId: itemId }
    });

    await prisma.menuItem.update({
      where: { id: itemId },
      data: { dishId: data.dishId }
    });

    await shoppingService.recalculateShoppingList(menuId);
    return this.getById(menuId);
  }

  async getReplacementCandidates(menuId: number, itemId: number): Promise<DishSummary[]> {
    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, menuId },
      include: { menu: true }
    });

    if (!item) throw new NotFoundError('Menu item not found');

    const settings = await settingsService.get();
    const daySettingsMap = settings.daySettings as Record<DayOfWeek, DaySettings>;
    const dayOfWeek = getDayOfWeek(item.date);
    const daySetting = daySettingsMap[dayOfWeek];
    const allowedDifficulties = daySetting?.allowedDifficulties ?? [Difficulty.EASY];
    const availableCooks = daySetting?.availableCooks ?? [CookPerson.YULIA, CookPerson.MISHA];

    // Get all dishes matching mealType, difficulty, and cook
    const allDishes = await dishService.getAll();
    let candidates = allDishes.filter(d => 
      (item.mealType === 'BREAKFAST' ? d.forBreakfast : d.forLunch) &&
      allowedDifficulties.includes(d.difficulty) &&
      isCookSuitable(d.cook, availableCooks) &&
      d.id !== item.dishId
    );

    // Fallback if no dishes match strict difficulty+cook: try matching cook only
    if (candidates.length === 0) {
      candidates = allDishes.filter(d => 
        (item.mealType === 'BREAKFAST' ? d.forBreakfast : d.forLunch) &&
        isCookSuitable(d.cook, availableCooks) &&
        d.id !== item.dishId
      );
    }

    // Ultimate fallback if catalog has no matching cook
    if (candidates.length === 0) {
      candidates = allDishes.filter(d => 
        (item.mealType === 'BREAKFAST' ? d.forBreakfast : d.forLunch) &&
        d.id !== item.dishId
      );
    }

    // For lunches, ideally exclude dishes already in the week's menu
    if (item.mealType === 'LUNCH') {
      const weekItems = await prisma.menuItem.findMany({
        where: { menuId, mealType: 'LUNCH' }
      });
      const weekDishIds = weekItems.map(i => i.dishId);
      const strictCandidates = candidates.filter(d => !weekDishIds.includes(d.id));
      // Fallback if we run out (shouldn't happen with enough dishes, but to be safe)
      if (strictCandidates.length > 0) {
        candidates = strictCandidates;
      }
    }

    return candidates;
  }

  async randomReplaceItem(menuId: number, itemId: number, data: RandomReplaceMenuItemDto): Promise<WeeklyMenuFull> {
    let candidates = await this.getReplacementCandidates(menuId, itemId);

    if (data.excludeDishIds && data.excludeDishIds.length > 0) {
      candidates = candidates.filter(d => !data.excludeDishIds!.includes(d.id));
    }

    if (candidates.length === 0) {
      throw new ConflictError('No suitable dishes found for replacement given the constraints.');
    }

    const weighted = calculateWeights(candidates, new Date().toISOString());
    const selected = weightedRandomSelect(weighted, Math.random());

    if (!selected) {
      throw new AppError(500, 'SELECTION_ERROR', 'Failed to select random replacement');
    }

    return this.replaceItem(menuId, itemId, { dishId: selected.id });
  }
}

export const menuService = new MenuService();
