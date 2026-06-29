import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT section_name, roles FROM role_permissions");
    
    const permissions: Record<string, string[]> = {};
    result.rows.forEach((row) => {
      permissions[row.section_name] = row.roles;
    });

    return success(res, "Permissions fetched", permissions);
  } catch (err: any) {
    console.error("Get permissions error:", err);
    return error(res, err.message || "Server error", 500);
  }
};

export const savePermissions = async (req: Request, res: Response) => {
  try {
    const permissions = req.body;

    if (!permissions || typeof permissions !== "object") {
      return error(res, "Invalid permissions payload", 400);
    }

    await pool.query("BEGIN");

    for (const [sectionName, roles] of Object.entries(permissions)) {
      if (!Array.isArray(roles)) {
        await pool.query("ROLLBACK");
        return error(res, `Roles for section ${sectionName} must be an array`, 400);
      }

      await pool.query(
        `INSERT INTO role_permissions (section_name, roles)
         VALUES ($1, $2)
         ON CONFLICT (section_name)
         DO UPDATE SET roles = EXCLUDED.roles`,
        [sectionName, roles]
      );
    }

    await pool.query("COMMIT");
    return success(res, "Permissions saved successfully", permissions);
  } catch (err: any) {
    await pool.query("ROLLBACK");
    console.error("Save permissions error:", err);
    return error(res, err.message || "Server error", 500);
  }
};
