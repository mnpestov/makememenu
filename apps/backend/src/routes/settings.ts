import { Router } from 'express';
import { settingsService } from '../services/settingsService';
import { catchAsync } from '../utils/catchAsync';
import { validateBody } from '../middleware/validate';
import { UpdateSettingsSchema } from '@family-menu/shared';

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.get('/', catchAsync(async (_req, res) => {
  const settings = await settingsService.get();
  res.json(settings);
}));

router.put('/', validateBody(UpdateSettingsSchema), catchAsync(async (req, res) => {
  const settings = await settingsService.update(req.body);
  res.json(settings);
}));

export default router;
