import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";


// ================================
// REGISTER SUPER ADMIN
// ================================
export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body; // ✅ FIXED

    if (!name || !email || !password) {
      return error(res, "All fields are required", 400);
    }

    // ✅ Check if admin already exists
    const existingAdmin = await pool.query(
      `SELECT * FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'SUPER_ADMIN'`
    );

    if (existingAdmin.rows.length > 0) {
      return error(res, "Super Admin already exists", 400);
    }

    // ✅ Get SUPER_ADMIN role id
    const roleResult = await pool.query(
      `SELECT id FROM roles WHERE name = 'SUPER_ADMIN'`
    );

    if (roleResult.rows.length === 0) {
      return error(res, "SUPER_ADMIN role not found", 500);
    }

    const role_id = roleResult.rows[0].id; // ✅ FIXED

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insert admin
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role_id)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email`,
      [name, email, hashedPassword, role_id]
    );

    return success(res, "Super Admin registered", result.rows[0]);

  } catch (err) {
    console.error(err);
    return error(res, "Server error", 500);
  }
};


// ================================
// LOGIN
// ================================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, "Email and password are required", 400);
    }

    // ✅ Fetch user with role
    const result = await pool.query(
      `
  SELECT u.*, r.name as role
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.email = $1
  `,
      [email]
    );

    if (result.rows.length === 0) {
      return error(res, "Invalid credentials", 401);
    }

    const user = result.rows[0];

    if (user.role === "CLIENT") {
      return error(res, "Client login is disabled. Please contact your system administrator.", 403);
    }

    // ✅ Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return error(res, "Invalid credentials", 401);
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        client_id: user.client_id, // ✅ REQUIRED for portal
        division: user.division, // ✅ REQUIRED for scoping
        sector: user.sector // ✅ REQUIRED for scoping clients
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    return success(res, "Login successful", { token });

  } catch (err) {
    console.error(err);
    return error(res, "Server error", 500);
  }
};