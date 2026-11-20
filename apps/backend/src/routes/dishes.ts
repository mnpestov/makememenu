import { Router } from 'express';
import { importUnitools } from '../services/recipeImportService';
import { dishService } from '../services/dishService';
import { catchAsync } from '../utils/catchAsync';
import { validateBody } from '../middleware/validate';
import { CreateDishSchema, UpdateDishSchema, ReviewDishSchema } from '@make-me-menu/shared';
import { ValidationError } from '../utils/errors';

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.param('id', (_req, _res, next, value: string) => {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    next(new ValidationError('Некорректный ID блюда'));
    return;
  }
  next();
});

router.get('/', catchAsync(async (_req, res) => {
  const dishes = await dishService.getAll();
  res.json(dishes);
}));

router.post('/import/unitools', catchAsync(async (_req, res) => {
  res.json(await importUnitools());
}));

router.post('/:id/review', validateBody(ReviewDishSchema), catchAsync(async (req, res) => {
  res.json(await dishService.review(parseInt(req.params.id!, 10), req.body));
}));

router.get('/:id', catchAsync(async (req, res) => {
  const dish = await dishService.getById(parseInt(req.params.id!, 10));
  res.json(dish);
}));

router.post('/', validateBody(CreateDishSchema), catchAsync(async (req, res) => {
  const dish = await dishService.create(req.body);
  res.status(201).json(dish);
}));

router.put('/:id', validateBody(UpdateDishSchema), catchAsync(async (req, res) => {
  const dish = await dishService.update(parseInt(req.params.id!, 10), req.body);
  res.json(dish);
}));

router.delete('/:id', catchAsync(async (req, res) => {
  await dishService.delete(parseInt(req.params.id!, 10));
  res.sendStatus(204);
}));

export default router;
