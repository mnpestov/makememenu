import { Router } from 'express';
import { ingredientService } from '../services/ingredientService';
import { catchAsync } from '../utils/catchAsync';
import { validateBody } from '../middleware/validate';
import { CreateIngredientSchema } from '@make-me-menu/shared';

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.get('/', catchAsync(async (req, res) => {
  const search = req.query.search as string | undefined;
  const ingredients = await ingredientService.getAll(search);
  res.json(ingredients);
}));

router.post('/', validateBody(CreateIngredientSchema), catchAsync(async (req, res) => {
  const ingredient = await ingredientService.create(req.body);
  res.status(201).json(ingredient);
}));

router.patch('/:id', catchAsync(async (req, res) => {
  const ingredient = await ingredientService.update(parseInt(req.params.id!, 10), req.body);
  res.json(ingredient);
}));

router.get('/search-store', catchAsync(async (req, res) => {
  const q = req.query.q as string;
  try {
    const response = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(q)}`);
    if (!response.ok) throw new Error('Store search failed');
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: error.message });
  }
}));

export default router;
