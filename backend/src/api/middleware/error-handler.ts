import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error(`[API ERROR] ${req.method} ${req.url}:`, err.message || err);

  const statusCode = err.status || (err.message && err.message.includes('not found') ? 404 : 400);

  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred.',
    details: err.details || undefined
  });
}
