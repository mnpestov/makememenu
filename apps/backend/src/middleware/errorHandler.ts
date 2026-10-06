import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { MenuGenerationError } from '../domain/menuGenerator';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof MenuGenerationError) {
    // Map domain error to HTTP conflict (409) or bad request (400)
    res.status(409).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
};
