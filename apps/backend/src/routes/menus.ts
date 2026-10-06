import { Router } from 'express';
import { menuService } from '../services/menuService';
import { shoppingService } from '../services/shoppingService';
import { catchAsync } from '../utils/catchAsync';
import { validateBody } from '../middleware/validate';
import { 
  GenerateMenuSchema, 
  ReplaceMenuItemSchema, 
  RandomReplaceMenuItemSchema,
  UpdateShoppingItemSchema
} from '@make-me-menu/shared';
import { NotFoundError } from '../utils/errors';

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

// --- Menus ---

router.get('/current', catchAsync(async (_req, res) => {
  const menu = await menuService.getCurrentMenu();
  if (!menu) {
    throw new NotFoundError('No current menu found');
  }
  res.json(menu);
}));

router.delete('/current', catchAsync(async (_req, res) => {
  await menuService.deleteCurrentMenu();
  res.status(204).send();
}));

router.get('/:id', catchAsync(async (req, res) => {
  const menu = await menuService.getById(parseInt(req.params.id!, 10));
  res.json(menu);
}));

router.post('/generate', validateBody(GenerateMenuSchema), catchAsync(async (req, res) => {
  const menu = await menuService.generate(req.body);
  res.status(201).json(menu);
}));

// --- Menu Items ---

router.get('/:menuId/items/:itemId/replacements', catchAsync(async (req, res) => {
  const candidates = await menuService.getReplacementCandidates(
    parseInt(req.params.menuId!, 10),
    parseInt(req.params.itemId!, 10)
  );
  res.json(candidates);
}));

router.put('/:menuId/items/:itemId', validateBody(ReplaceMenuItemSchema), catchAsync(async (req, res) => {
  const menu = await menuService.replaceItem(
    parseInt(req.params.menuId!, 10),
    parseInt(req.params.itemId!, 10),
    req.body
  );
  res.json(menu);
}));

router.post('/:menuId/items/:itemId/replace', validateBody(RandomReplaceMenuItemSchema), catchAsync(async (req, res) => {
  const menu = await menuService.randomReplaceItem(
    parseInt(req.params.menuId!, 10),
    parseInt(req.params.itemId!, 10),
    req.body
  );
  res.json(menu);
}));

// --- Shopping ---

router.get('/:menuId/shopping', catchAsync(async (req, res) => {
  // Ensure history sync and verification that menu exists first
  await menuService.getById(parseInt(req.params.menuId!, 10));
  const list = await shoppingService.getShoppingList(parseInt(req.params.menuId!, 10));
  res.json(list);
}));

router.patch('/:menuId/shopping/:itemId', validateBody(UpdateShoppingItemSchema), catchAsync(async (req, res) => {
  const item = await shoppingService.updateShoppingItem(
    parseInt(req.params.menuId!, 10),
    parseInt(req.params.itemId!, 10),
    req.body
  );
  res.json(item);
}));

export default router;
