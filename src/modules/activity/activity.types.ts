export interface CreateActivityDTO {
  userId?: string;
  action: string;
  module: string;
  details?: Record<string, any>;
  entityId?: string | null;
  entityType?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityQuery {
  userId?: string;
  module?: string;
  fromDate?: string;
  toDate?: string;
  page?: string;
  limit?: string;
}