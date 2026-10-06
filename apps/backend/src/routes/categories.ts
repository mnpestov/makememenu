import { Router } from 'express';
import { categoryService } from '../services/categoryService';
import { catchAsync } from '../utils/catchAsync';
import { validateBody } from '../middleware/validate';
import { CreateCategorySchema } from '@family-menu/shared';

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.get('/', catchAsync(async (_req, res) => {
  const categories = await categoryService.getAll();
  res.json(categories);
}));

router.post('/', validateBody(CreateCategorySchema), catchAsync(async (req, res) => {
  const category = await categoryService.create(req.body);
  res.status(201).json(category);
}));

router.delete('/:id', catchAsync(async (req, res) => {
  await categoryService.delete(parseInt(req.params.id!, 10));
  res.sendStatus(204);
}));

export default router;
