import prisma from '../db/prismaClient';
import { AppSettings, UpdateSettingsDto, DayOfWeek, Difficulty, CookPerson, DaySettings } from '@make-me-menu/shared';

const DEFAULT_COOKS: CookPerson[] = [CookPerson.YULIA, CookPerson.MISHA];

function normalizeDaySettings(rawDaySettings: any): Record<DayOfWeek, DaySettings> {
  const result: Partial<Record<DayOfWeek, DaySettings>> = {};
  const allDays = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY
  ];

  for (const day of allDays) {
    const dayData = rawDaySettings?.[day];
    result[day] = {
      allowedDifficulties: dayData?.allowedDifficulties ?? [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD],
      availableCooks: Array.isArray(dayData?.availableCooks) && dayData.availableCooks.length > 0 
        ? dayData.availableCooks 
        : [...DEFAULT_COOKS]
    };
  }

  return result as Record<DayOfWeek, DaySettings>;
}

export class SettingsService {
  private async getOrCreateDBRecord() {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      // Create defaults if not exists
      settings = await prisma.settings.create({
        data: {
          familySize: 3,
          mealsPerDay: 2,
          daySettings: {
            MONDAY:    { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: DEFAULT_COOKS },
            TUESDAY:   { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: DEFAULT_COOKS },
            WEDNESDAY: { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: DEFAULT_COOKS },
            THURSDAY:  { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: DEFAULT_COOKS },
            FRIDAY:    { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: DEFAULT_COOKS },
            SATURDAY:  { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: DEFAULT_COOKS },
            SUNDAY:    { allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'], availableCooks: DEFAULT_COOKS },
          }
        }
      });
    }
    return settings;
  }

  async get(): Promise<AppSettings> {
    const settings = await this.getOrCreateDBRecord();
    const daySettings = normalizeDaySettings(settings.daySettings);

    return {
      id: settings.id,
      familySize: settings.familySize,
      mealsPerDay: settings.mealsPerDay,
      targetServings: settings.familySize * settings.mealsPerDay,
      daySettings,
    };
  }

  async update(data: UpdateSettingsDto): Promise<AppSettings> {
    const existing = await this.getOrCreateDBRecord();
    
    const updated = await prisma.settings.update({
      where: { id: existing.id },
      data: {
        familySize: data.familySize,
        mealsPerDay: data.mealsPerDay,
        daySettings: data.daySettings as any,
      }
    });

    const daySettings = normalizeDaySettings(updated.daySettings);

    return {
      id: updated.id,
      familySize: updated.familySize,
      mealsPerDay: updated.mealsPerDay,
      targetServings: updated.familySize * updated.mealsPerDay,
      daySettings,
    };
  }
}

export const settingsService = new SettingsService();
