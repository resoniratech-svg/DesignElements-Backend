import { Request, Response } from "express";
import {
  createClientService,
  getClientsService,
  getClientByIdService,
  updateClientService
} from "./client.service";

export const createClient = async (req: Request, res: Response) => {
  try {
    const result = await createClientService(req.body);

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      clientCode: result.clientCode,
    });
  } catch (err) {
    console.error("CREATE CLIENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to create client",
    });
  }
};

export const getClients = async (req: Request, res: Response) => {
  try {
    const result = await getClientsService(req);

    res.status(200).json({
      success: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.data,
    });
  } catch (err: any) {
    console.error("GET CLIENTS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch clients",
      error: err.message,
      stack: err.stack,
    });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);

    const data = await getClientByIdService(clientId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("GET CLIENT BY ID ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch client",
    });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);

    const result = await updateClientService(clientId, req.body);

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("UPDATE CLIENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Failed to update client",
    });
  }
};
import { deleteClientService } from "./client.service";


export const deleteClient = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    // 🔒 ROLE CHECK
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only SUPER ADMIN can delete clients",
      });
    }

    await deleteClientService(clientId);

    res.status(200).json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (err: any) {
    console.error("DELETE CLIENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete client",
    });
  }
};

import { softDeleteClientService } from "./client.service";

export const softDeleteClient = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    await softDeleteClientService(clientId);

    res.status(200).json({
      success: true,
      message: "Client soft deleted successfully",
    });
  } catch (err: any) {
    console.error("SOFT DELETE CLIENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Failed to soft delete client",
    });
  }
};
import { addLicenseService } from "./client.service";

export const addLicense = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const { licenseName } = req.body;

    const result = await addLicenseService(clientId, licenseName);

    res.status(201).json({
      success: true,
      message: "License added successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("ADD LICENSE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Failed to add license",
    });
  }
};
import { addAgreementService } from "./client.service";

export const addAgreement = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const result = await addAgreementService(clientId, req.body);

    res.status(201).json({
      success: true,
      message: "Agreement added successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("ADD AGREEMENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Failed to add agreement",
    });
  }
};
import { getAgreementsService } from "./client.service";

export const getAgreements = async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id as string);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const data = await getAgreementsService(clientId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("GET AGREEMENTS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch agreements",
    });
  }
};