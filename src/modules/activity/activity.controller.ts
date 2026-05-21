import { Request, Response } from "express";
import { createActivity, getActivities } from "./activity.service";
import { validateCreateActivity } from "./activity.validation";

// ================================
// CREATE ACTIVITY
// ================================
export const createActivityLog = async (req: Request, res: Response) => {
  try {
    const errorMsg = validateCreateActivity(req.body);
    if (errorMsg) {
      return res.status(400).json({
        success: false,
        message: errorMsg,
      });
    }

    const activity = await createActivity({
      userId: req.user?.id,
      action: req.body.action,
      module: req.body.module,
      details: req.body.details,
      entityId: req.body.details?.invoiceId || null,
      entityType: req.body.entityType || null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (err: any) {
    console.error("CREATE ACTIVITY ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to create activity log",
    });
  }
};

// ================================
// GET ACTIVITIES
// ================================
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const result = await getActivities(req.query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("GET ACTIVITY ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch activity logs",
    });
  }
};