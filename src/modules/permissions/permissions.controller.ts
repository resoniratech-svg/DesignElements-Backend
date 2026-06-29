import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";

export const getPermissions = async (req: Request, res: Response) => {
  try {
    // Disable any browser or intermediate proxy caching
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    console.log("[DEBUG] GET /permissions - Reading directly from database...");
    const result = await pool.query("SELECT section_name, roles, updated_at FROM role_permissions");
    console.log("[DEBUG] GET /permissions - database values:", result.rows);

    const permissions: Record<string, string[]> = {};
    result.rows.forEach((row) => {
      permissions[row.section_name] = row.roles;
    });

    console.log("[DEBUG] GET /permissions - API response payload:", permissions);
    return success(res, "Permissions fetched", permissions);
  } catch (err: any) {
    console.error("[DEBUG] GET /permissions - error:", err);
    return error(res, err.message || "Server error", 500);
  }
};

export const savePermissions = async (req: Request, res: Response) => {
  try {
    // Disable caching for write operations as well
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const permissions = req.body;
    console.log("[DEBUG] savePermissions - incoming payload:", permissions);

    if (!permissions || typeof permissions !== "object") {
      console.error("[DEBUG] savePermissions - invalid payload type:", typeof permissions);
      return error(res, "Invalid permissions payload", 400);
    }

    console.log("[DEBUG] savePermissions - BEGIN transaction");
    await pool.query("BEGIN");

    for (const [sectionName, roles] of Object.entries(permissions)) {
      if (!Array.isArray(roles)) {
        console.error(`[DEBUG] savePermissions - rollback: Roles for section ${sectionName} is not an array`);
        await pool.query("ROLLBACK");
        return error(res, `Roles for section ${sectionName} must be an array`, 400);
      }

      console.log(`[DEBUG] savePermissions - SQL update/insert for "${sectionName}":`, roles);
      await pool.query(
        `INSERT INTO role_permissions (section_name, roles, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (section_name)
         DO UPDATE SET roles = EXCLUDED.roles, updated_at = CURRENT_TIMESTAMP`,
        [sectionName, roles]
      );
    }

    await pool.query("COMMIT");
    console.log("[DEBUG] savePermissions - COMMIT transaction success");

    // Fetch and log the database state after commit to verify updates
    const afterCommit = await pool.query("SELECT section_name, roles, updated_at FROM role_permissions");
    console.log("[DEBUG] savePermissions - database values after commit:", afterCommit.rows);

    return success(res, "Permissions saved successfully", permissions);
  } catch (err: any) {
    console.error("[DEBUG] savePermissions - error, executing ROLLBACK:", err);
    try {
      await pool.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("[DEBUG] savePermissions - ROLLBACK error:", rollbackErr);
    }
    return error(res, err.message || "Server error", 500);
  }
};
