import { Request, Response } from "express";
import { pool } from "../../config/db";
import { success, error } from "../../utils/response";
import { createActivity } from "../activity/activity.service";

// ==============================
// CREATE EXPENSE
// ==============================

export const createExpense = async (req: any, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      category,
      description,
      totalAmount,
      date,
      allocationType,
      division,
      vendor,
      paymentMethod,
      taxRate,
      taxAmount,
      referenceId,
      attachment,
      notes,
      allocations = [],
      expenseType
    } = req.body;

    const role = req.user?.role;
    if (role === 'CLIENT') {
      return error(res, "Clients do not have access to the expense module", 403);
    }
    if (role === 'PROJECT_MANAGER' && expenseType !== 'project') {
      return error(res, "Project Managers can only create project-related expenses", 403);
    }

    if (!category || !totalAmount || totalAmount <= 0) {
      return error(res, "Invalid expense data", 400);
    }

    await client.query("BEGIN");

    // 🔥 SMART VALIDATION
    if (allocationType === "SMART") {
      const totalPercent = allocations.reduce(
        (sum: number, a: any) => sum + a.percentage,
        0
      );

      if (totalPercent !== 100) {
        await client.query("ROLLBACK");
        return error(res, "Allocation must total 100%", 400);
      }

      const divisions = allocations.map((a: any) => a.division);
      if (new Set(divisions).size !== divisions.length) {
        await client.query("ROLLBACK");
        return error(res, "Duplicate divisions not allowed", 400);
      }
    }

    // 🔹 Insert expense — Rule 2: always starts as PENDING until approved by Accountant/Admin
    const result = await client.query(
      `INSERT INTO internal_expenses
      (category, description, total_amount, date, allocation_type, approval_status, vendor, payment_method, tax_rate, tax_amount, reference_id, attachment, notes, user_id, expense_type)
      VALUES ($1,$2,$3,$4,$5,'PENDING_APPROVAL',$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [category, description, totalAmount, date, allocationType, vendor, paymentMethod, taxRate || 0, taxAmount || 0, referenceId || null, attachment, notes, req.user?.id, expenseType || null]
    );

    const expense = result.rows[0];

    // 🔹 Insert allocations
    if (allocationType === "CENTRAL") {
      // ✅ "The Brain" - 70/20/10 Rule
      const centralAllocations = [
        { division: "CONTRACTING", percentage: 75 },
        { division: "TRADING", percentage: 25 },
      ];

      for (const alloc of centralAllocations) {
        const amount = (alloc.percentage / 100) * totalAmount;
        await client.query(
          `INSERT INTO expense_allocations
          (expense_id, division, percentage, amount)
          VALUES ($1, $2, $3, $4)`,
          [expense.id, alloc.division, alloc.percentage, amount]
        );
      }
    } else if (allocationType === "SMART") {
      for (const alloc of allocations) {
        const amount = (alloc.percentage / 100) * totalAmount;

        await client.query(
          `INSERT INTO expense_allocations
          (expense_id, division, percentage, amount)
          VALUES ($1,$2,$3,$4)`,
          [expense.id, alloc.division, alloc.percentage, amount]
        );
      }
    } else {
      await client.query(
        `INSERT INTO expense_allocations
        (expense_id, division, percentage, amount)
        VALUES ($1,$2,100,$3)`,
        [expense.id, division, totalAmount]
      );
    }

    await client.query("COMMIT");

    await createActivity({
      userId: req.user.id,
      action: "CREATE_EXPENSE",
      module: "EXPENSE",
      entityId: expense.id,
      entityType: "EXPENSE",
      details: { totalAmount },
      ipAddress: req.ip || "",
      userAgent: (req.headers["user-agent"] as string) || ""
    });

    return success(res, "Expense created successfully", {
      expenseId: expense.id
    });

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("CREATE EXPENSE ERROR:", err);
    return error(res, err.message, 500);
  } finally {
    client.release();
  }
};
// ==============================
// GET EXPENSES
// ==============================
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "1000" } = req.query as any;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    const result = await pool.query(
      `SELECT e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'division', ea.division,
              'percentage', ea.percentage,
              'amount', ea.amount
            )
          ) FILTER (WHERE ea.id IS NOT NULL),
          '[]'::json
        ) as allocations
       FROM internal_expenses e
       LEFT JOIN expense_allocations ea ON ea.expense_id = e.id
       WHERE e.is_deleted = false
       GROUP BY e.id
       ORDER BY e.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limitNumber, offset]
    );

    return success(res, "Expenses fetched", result.rows);

  } catch (err) {
    console.error("GET EXPENSE ERROR:", err);
    return error(res, "Server error", 500);
  }
};
// ==============================
// GET SINGLE EXPENSE
// ==============================
export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params as { expenseId: string };

    const result = await pool.query(
      `SELECT e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'division', ea.division,
              'percentage', ea.percentage,
              'amount', ea.amount
            )
          ) FILTER (WHERE ea.id IS NOT NULL),
          '[]'::json
        ) as allocations
       FROM internal_expenses e
       LEFT JOIN expense_allocations ea ON ea.expense_id = e.id
       WHERE e.id = $1 AND e.is_deleted = false
       GROUP BY e.id`,
      [expenseId]
    );

    if (!result.rows.length) {
      return error(res, "Expense not found", 404);
    }

    return success(res, "Expense fetched", result.rows[0]);

  } catch (err) {
    console.error("GET BY ID ERROR:", err);
    return error(res, "Server error", 500);
  }
};
// ==============================
// UPDATE EXPENSE
// ==============================
export const updateExpense = async (req: any, res: Response) => {
  const client = await pool.connect();

  try {
    const { expenseId } = req.params as { expenseId: string };
    const {
      category,
      description,
      totalAmount,
      date,
      allocationType,
      division,
      vendor,
      paymentMethod,
      taxRate,
      taxAmount,
      referenceId,
      attachment,
      notes,
      allocations = [],
      approval_status
    } = req.body;

    await client.query("BEGIN");

    // check exists
    const check = await client.query(
      `SELECT * FROM internal_expenses WHERE id = $1 AND is_deleted = false`,
      [expenseId]
    );

    if (!check.rows.length) {
      await client.query("ROLLBACK");
      return error(res, "Expense not found", 404);
    }

    // update main
    await client.query(
      `UPDATE internal_expenses
   SET category = COALESCE($1, category),

       description = COALESCE($2, description),

       total_amount = COALESCE($3, total_amount),

       date = COALESCE($4, date),

       allocation_type = COALESCE($5, allocation_type),

       vendor = COALESCE($6, vendor),

       payment_method = COALESCE($7, payment_method),

       tax_rate = COALESCE($8, tax_rate),

       tax_amount = COALESCE($9, tax_amount),

       reference_id = COALESCE($10, reference_id),

       attachment = COALESCE($11, attachment),

       notes = COALESCE($12, notes),

       approval_status = COALESCE($13, approval_status)

   WHERE id = $14`,
      [
        category,

        description,

        totalAmount,

        date,

        allocationType,

        vendor,

        paymentMethod,

        taxRate,

        taxAmount,

        referenceId,

        attachment,

        notes,

        approval_status,

        expenseId
      ]
    );
    // delete old allocations
    await client.query(
      `DELETE FROM expense_allocations WHERE expense_id = $1`,
      [expenseId]
    );

    // reinsert allocations
    if (allocationType === "SMART") {
      for (const alloc of allocations) {
        const amount = (alloc.percentage / 100) * totalAmount;

        await client.query(
          `INSERT INTO expense_allocations
          (expense_id, division, percentage, amount)
          VALUES ($1,$2,$3,$4)`,
          [expenseId, alloc.division, alloc.percentage, amount]
        );
      }
    } else {
      await client.query(
        `INSERT INTO expense_allocations
        (expense_id, division, percentage, amount)
        VALUES ($1,$2,100,$3)`,
        [expenseId, division, totalAmount]
      );
    }

    await client.query("COMMIT");

    return success(res, "Expense updated");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE ERROR:", err);
    return error(res, "Update failed", 500);
  } finally {
    client.release();
  }
};
// ==============================
// DELETE EXPENSE
// ==============================
export const deleteExpense = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { expenseId } = req.params as { expenseId: string };

    await client.query("BEGIN");

    // 1. Delete dependent allocations first
    await client.query(
      `DELETE FROM expense_allocations WHERE expense_id = $1`,
      [expenseId]
    );

    // 2. Delete the main expense record (Hard Delete)
    const result = await client.query(
      `DELETE FROM internal_expenses
       WHERE id = $1
       RETURNING *`,
      [expenseId]
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return error(res, "Expense not found", 404);
    }

    await client.query("COMMIT");

    await createActivity({
      userId: (req as any).user.id,
      action: "DELETE_EXPENSE",
      module: "EXPENSE",
      entityId: expenseId,
      entityType: "EXPENSE",
      details: { deleted: true },
      ipAddress: req.ip || "",
      userAgent: (req.headers["user-agent"] as string) || ""
    });

    return success(res, "Expense deleted completely from database");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE ERROR:", err);
    return error(res, "Delete failed", 500);
  } finally {
    client.release();
  }
};
// ==============================
// DIVISION EXPENSE REPORT
// ==============================
export const getDivisionExpenseReport = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query as any;

    let conditions = ["e.is_deleted = false"];
    let values: any[] = [];
    let index = 1;

    if (fromDate) {
      conditions.push(`e.date >= $${index++}`);
      values.push(fromDate);
    }

    if (toDate) {
      conditions.push(`e.date <= $${index++}`);
      values.push(toDate);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const result = await pool.query(
      `
      SELECT 
        ea.division,
        SUM(ea.amount) as total
      FROM internal_expenses e
      JOIN expense_allocations ea ON ea.expense_id = e.id
      ${whereClause}
      GROUP BY ea.division
      `,
      values
    );

    // format response
    const response: any = {
      CON: 0,
      TRD: 0,
    };

    result.rows.forEach((row: any) => {
      response[row.division] = Number(row.total);
    });

    return success(res, "Division report fetched", response);

  } catch (err) {
    console.error("DIVISION REPORT ERROR:", err);
    return error(res, "Server error", 500);
  }
};
// ==============================
// CATEGORY EXPENSE REPORT
// ==============================
export const getCategoryExpenseReport = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate } = req.query as any;

    let conditions = ["is_deleted = false"];
    let values: any[] = [];
    let index = 1;

    if (fromDate) {
      conditions.push(`date >= $${index++}`);
      values.push(fromDate);
    }

    if (toDate) {
      conditions.push(`date <= $${index++}`);
      values.push(toDate);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const result = await pool.query(
      `
      SELECT 
        category,
        SUM(total_amount) as total
      FROM internal_expenses
      ${whereClause}
      GROUP BY category
      `,
      values
    );

    // format response (ensure all categories present)
    const response: any = {
      SALARY: 0,
      TRANSPORT: 0,
      OFFICE: 0,
      DOCUMENT: 0
    };

    result.rows.forEach((row: any) => {
      response[row.category] = Number(row.total);
    });

    return success(res, "Category report fetched", response);

  } catch (err) {
    console.error("CATEGORY REPORT ERROR:", err);
    return error(res, "Server error", 500);
  }
};

// ==============================
// APPROVE EXPENSE (Super Admin)
// ==============================
export const approveExpense = async (req: any, res: Response) => {
  const role = req.user?.role;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return error(res, "Only Super Admins can approve expenses", 403);
  }

  const { expenseId } = req.params;
  const { allocations = [] } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Allocate if provided
    if (allocations.length > 0) {
      await client.query(`DELETE FROM expense_allocations WHERE expense_id = $1`, [expenseId]);
      const { rows } = await client.query(`SELECT total_amount FROM internal_expenses WHERE id = $1`, [expenseId]);
      const totalAmount = rows[0]?.total_amount || 0;

      for (const alloc of allocations) {
        const amount = (alloc.percentage / 100) * totalAmount;
        await client.query(
          `INSERT INTO expense_allocations (expense_id, division, percentage, amount) VALUES ($1,$2,$3,$4)`,
          [expenseId, alloc.division, alloc.percentage, amount]
        );
      }
    }

    await client.query(`UPDATE internal_expenses SET approval_status = 'APPROVED' WHERE id = $1`, [expenseId]);

    await createActivity({
      userId: req.user.id,
      action: "APPROVE_EXPENSE",
      module: "EXPENSE",
      entityId: expenseId,
      entityType: "EXPENSE",
      details: { status: 'APPROVED' },
      ipAddress: req.ip || "",
      userAgent: (req.headers["user-agent"] as string) || ""
    });

    await client.query("COMMIT");
    return success(res, "Expense approved successfully");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("APPROVE EXPENSE ERROR:", err);
    return error(res, "Server error", 500);
  } finally {
    client.release();
  }
};

// ==============================
// REJECT EXPENSE (Super Admin)
// ==============================
export const rejectExpense = async (req: any, res: Response) => {
  const role = req.user?.role;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return error(res, "Only Super Admins can reject expenses", 403);
  }

  const { expenseId } = req.params;
  try {
    await pool.query(`UPDATE internal_expenses SET approval_status = 'REJECTED' WHERE id = $1`, [expenseId]);

    await createActivity({
      userId: req.user.id,
      action: "REJECT_EXPENSE",
      module: "EXPENSE",
      entityId: expenseId,
      entityType: "EXPENSE",
      details: { status: 'REJECTED' },
      ipAddress: req.ip || "",
      userAgent: (req.headers["user-agent"] as string) || ""
    });

    return success(res, "Expense rejected successfully");
  } catch (err: any) {
    console.error("REJECT EXPENSE ERROR:", err);
    return error(res, "Server error", 500);
  }
};