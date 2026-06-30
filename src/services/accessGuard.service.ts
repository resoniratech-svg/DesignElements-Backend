import { Request } from "express";

/**
 * AccessGuard Service
 * Provides scoped WHERE clauses for different user roles and entities.
 */
export class AccessGuard {
  /**
   * Generates a SQL fragment and updates the params array for scoping.
   * @param user Authenticated user object (req.user)
   * @param params The array of query parameters to be used in pool.query
   * @param tableAlias Optional table alias (e.g., 'p' for projects)
   * @returns SQL fragment string (e.g., "WHERE manager_id = $1")
   */
  static getScopedWhere(user: any, params: any[], tableAlias: string = ""): string {
    const prefix = tableAlias ? `${tableAlias}.` : "";
    
    // ADMIN & ACCOUNTS see everything
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "ACCOUNTS") {
      return "WHERE 1=1";
    }

    // PROJECT_MANAGER sees only their own assigned projects/items
    if (user.role === "PROJECT_MANAGER") {
      params.push(user.id);
      const managerParam = `$${params.length}`;
      return `WHERE ${prefix}manager_id = ${managerParam}`;
    }

    // CLIENT sees their own items
    if (user.role === "CLIENT") {
      params.push(user.id); // Assuming req.user.id is the client id for clients
      const clientParam = `$${params.length}`;
      
      return `WHERE ${prefix}client_id = ${clientParam}`;
    }

    // Default: Return a condition that matches nothing for safety
    return "WHERE 1=0";
  }

  /**
   * Helper for AND conditions (e.g., when a WHERE already exists)
   */
  static getScopedAnd(user: any, params: any[], tableAlias: string = ""): string {
    const scoped = this.getScopedWhere(user, params, tableAlias);
    return scoped.replace("WHERE", "AND");
  }
}
