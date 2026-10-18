export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  totalPages: number;
  page: number;
}

/**
 * Parses and validates limit and offset parameters from request query.
 * - Defaults limit to 10 (or specified defaultLimit)
 * - Clamps limit between 1 and maxLimit (default 100)
 * - Defaults offset to 0, rejects negative numbers
 */
export function parsePaginationParams(query: any, defaultLimit = 10, maxLimit = 100): PaginationParams {
  let limit = defaultLimit;
  if (query?.limit !== undefined && query?.limit !== null && query?.limit !== "") {
    const parsedLimit = parseInt(String(query.limit), 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, maxLimit);
    }
  }

  let offset = 0;
  if (query?.offset !== undefined && query?.offset !== null && query?.offset !== "") {
    const parsedOffset = parseInt(String(query.offset), 10);
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset;
    }
  }

  return { limit, offset };
}

/**
 * Builds standard pagination metadata for API responses.
 */
export function buildPaginationMeta(total: number, limit: number, offset: number): PaginationMeta {
  const safeTotal = Math.max(0, total);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  const page = Math.floor(offset / limit) + 1;
  const hasMore = offset + limit < safeTotal;

  return {
    total: safeTotal,
    limit,
    offset,
    hasMore,
    totalPages,
    page,
  };
}
