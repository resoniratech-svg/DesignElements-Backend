import { Request, Response } from "express";
import * as proposalService from "./proposals.service";
import { generatePdf } from "./proposalPdf.service";

// GET ALL PROPOSALS
export const getProposals = async (req: Request, res: Response) => {
  try {
    const proposals = await proposalService.getProposals();

    res.status(200).json({
      success: true,
      data: proposals
    });

  } catch (error: any) {
    console.error("❌ ERROR FETCHING PROPOSALS:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch proposals"
    });
  }
};


// GET PROPOSAL BY ID
export const getProposalById = async (req: Request, res: Response) => {
  try {
    const proposal = await proposalService.getProposalById(String(req.params.id));

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found"
      });
    }

    res.status(200).json({
      success: true,
      data: proposal
    });

  } catch (error: any) {
    console.error("❌ ERROR FETCHING PROPOSAL:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch proposal"
    });
  }
};


// CREATE PROPOSAL
export const createProposal = async (req: any, res: Response) => {
  try {
    // ✅ Check user
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const proposal = await proposalService.createProposal(
      req.body,
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: proposal
    });

  } catch (error: any) {
    console.error("❌ ERROR CREATING PROPOSAL:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create proposal"
    });
  }
};


// UPDATE PROPOSAL
export const updateProposal = async (req: Request, res: Response) => {
  try {
    const updated = await proposalService.updateProposal(
      String(req.params.id),
      req.body
    );

    res.status(200).json({
      success: true,
      data: updated
    });

  } catch (error: any) {
    console.error("❌ ERROR UPDATING PROPOSAL:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update proposal"
    });
  }
};


// GENERATE PDF
export const generateProposalPdf = async (req: Request, res: Response) => {
  try {
    const proposalData: any = await proposalService.getProposalById(
      String(req.params.id)
    );

    // ✅ Check if proposal exists
    if (!proposalData || !proposalData.proposal) {
      return res.status(404).json({
        success: false,
        message: "Proposal not found"
      });
    }

    const html = `
      <h1>Business Proposal</h1>
      <p>Proposal Number: ${proposalData.proposal.proposal_number}</p>
      <p>Total Amount: ${proposalData.proposal.total_amount}</p>
    `;

    const filePath = `uploads/proposals/${proposalData.proposal.proposal_number}.pdf`;

    await generatePdf(html, filePath);

    res.status(200).json({
      success: true,
      pdf_url: filePath
    });

  } catch (error: any) {
    console.error("❌ ERROR GENERATING PDF:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate PDF"
    });
  }
};