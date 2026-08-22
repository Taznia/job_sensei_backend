import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err.name === 'ZodError') {
    const message = err.issues?.[0]?.message || 'Invalid request.';
    res.status(400).json({ success: false, error: { message } });
    return;
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})[0]?.message || 'Invalid data.';
    res.status(400).json({ success: false, error: { message } });
    return;
  }

  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      error: { message: 'A record with that value already exists.' },
    });
    return;
  }

  const status = err instanceof HttpError ? err.status : err.status || 500;
  const message =
    status >= 500 && !env.isDev ? 'Internal server error.' : err.message;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ success: false, error: { message } });
}
