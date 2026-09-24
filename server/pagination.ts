import type { Request } from "express";

/** Page size used when the caller does not ask for one. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Upper bound on a single page.
 *
 * List endpoints previously returned every row, so response size grew without
 * limit as tables filled. A hard ceiling means a client cannot reintroduce that
 * by asking for an enormous page.
 */
export const MAX_PAGE_SIZE = 100;

export interface PageParams {
  limit: number;
  offset: number;
}

/** Reads and clamps `limit` and `offset`, ignoring anything unparseable. */
export function readPageParams(req: Request): PageParams {
  const rawLimit = Number(req.query.limit);
  const rawOffset = Number(req.query.offset);

  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const offset = Number.isFinite(rawOffset) && rawOffset > 0
    ? Math.floor(rawOffset)
    : 0;

  return { limit, offset };
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function buildPage<T>(items: T[], total: number, params: PageParams): Page<T> {
  return {
    items,
    total,
    limit: params.limit,
    offset: params.offset,
    hasMore: params.offset + items.length < total,
  };
}
