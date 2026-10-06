import express, { Application, Request, Response, NextFunction } from 'express';

const app: Application = express();


// ─── Core Middleware ──────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────────────────────────────

import categoriesRouter from './routes/categories';
import ingredientsRouter from './routes/ingredients';
import dishesRouter from './routes/dishes';
import menusRouter from './routes/menus';
import settingsRouter from './routes/settings';

app.use('/api/categories', categoriesRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/dishes', dishesRouter);
app.use('/api/menus', menusRouter);
app.use('/api/settings', settingsRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────

import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);


export default app;
