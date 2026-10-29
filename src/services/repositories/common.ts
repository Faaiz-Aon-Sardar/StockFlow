/**
 * Common Repository Helpers & PostgREST Error Formatter
 */

export class DatabaseError extends Error {
  public code?: string;
  public details?: string;
  public hint?: string;

  constructor(message: string, code?: string, details?: string, hint?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
}

/**
 * Transforms PostgreSQL / PostgREST error objects into clear, actionable user messages
 */
export function formatDatabaseError(error: any): DatabaseError {
  if (!error) return new DatabaseError('Unknown database error occurred.');
  
  if (error instanceof DatabaseError) return error;

  const code = error.code || error.status;
  const message = error.message || 'Operation failed';
  const details = error.details || '';
  const hint = error.hint || '';

  // 23505: Unique violation (e.g. duplicate SKU or code)
  if (code === '23505') {
    if (message.includes('sku') || details.includes('sku')) {
      return new DatabaseError('A product with this SKU already exists in this business.', code, details, 'Use a unique SKU code.');
    }
    if (message.includes('code') || details.includes('code')) {
      return new DatabaseError('A party with this code already exists.', code, details, 'Please choose another unique code.');
    }
    if (message.includes('invoice_number')) {
      return new DatabaseError('Invoice number conflict detected under concurrent requests.', code, details, 'Retry to acquire next sequence number.');
    }
    return new DatabaseError('A duplicate record already exists in the database.', code, details, hint);
  }

  // 42501: RLS / insufficient privilege
  if (code === '42501') {
    return new DatabaseError(
      'Access Denied: You do not have permission to perform this operation in this business.',
      code,
      details,
      'Check your assigned role permissions.'
    );
  }

  // 23503: Foreign key violation
  if (code === '23503') {
    return new DatabaseError(
      'Referenced record was not found or is in use by historical records.',
      code,
      details,
      'Ensure related customer/product exists and is not archived.'
    );
  }

  // Custom trigger exceptions
  if (code === 'P0001') {
    return new DatabaseError(message, code, details, hint);
  }

  return new DatabaseError(message, code, details, hint);
}
