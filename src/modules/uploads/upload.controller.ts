import { Request, Response } from "express";
import { success, error } from "../../utils/response";
import path from "path";

export const uploadFiles = (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return error(res, "No files uploaded", 400);
    }

    const uploadedFiles = files.map(file => {
      // Return relative path for storage in DB
      return {
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        size: file.size,
        type: file.mimetype
      };
    });

    return success(res, "Files uploaded successfully", uploadedFiles);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
};
