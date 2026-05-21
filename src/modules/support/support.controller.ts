import { Request, Response } from "express";
import pool from "../../config/db";

export const getChannels = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM support_channels ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching support channels:", error);
    res.status(500).json({ success: false, message: "Failed to fetch channels" });
  }
};

export const createChannel = async (req: Request, res: Response) => {
  try {
    const { title, desc, icon, email, phone, color, sector } = req.body;
    const result = await pool.query(
      `INSERT INTO support_channels (title, "desc", icon, email, phone, color, sector)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, desc, icon, email, phone, color, sector]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error creating support channel:", error);
    res.status(500).json({ success: false, message: "Failed to create channel" });
  }
};

export const updateChannel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, desc, icon, email, phone, color, sector } = req.body;
    const result = await pool.query(
      `UPDATE support_channels 
       SET title = $1, "desc" = $2, icon = $3, email = $4, phone = $5, color = $6, sector = $7
       WHERE id = $8 RETURNING *`,
      [title, desc, icon, email, phone, color, sector, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error updating support channel:", error);
    res.status(500).json({ success: false, message: "Failed to update channel" });
  }
};

export const deleteChannel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM support_channels WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }
    res.json({ success: true, message: "Channel deleted successfully" });
  } catch (error) {
    console.error("Error deleting support channel:", error);
    res.status(500).json({ success: false, message: "Failed to delete channel" });
  }
};
