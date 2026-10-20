import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: any;
}

export const sendSuccess = <T>(res: Response, data: T, message?: string, meta?: any, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    meta,
  });
};

export const sendError = (res: Response, error: string, statusCode = 400, details?: any) => {
  return res.status(statusCode).json({
    success: false,
    error,
    details,
  });
};
