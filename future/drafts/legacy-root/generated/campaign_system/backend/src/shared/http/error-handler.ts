import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details || null,
    });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Validation failed",
      details: error.flatten(),
    });
  }

  return res.status(500).json({
    message: "Internal server error",
  });
}