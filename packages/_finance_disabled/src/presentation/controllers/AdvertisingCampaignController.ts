import { Request, Response, NextFunction } from 'express';
import { CreateCampaignUseCase } from '../../application/use-cases/CreateCampaignUseCase';
import { GetCampaignROIUseCase } from '../../application/use-cases/GetCampaignROIUseCase';
import { IAdvertisingCampaignRepository } from '../../domain/interfaces/IAdvertisingCampaignRepository';
import { AdvertisingCampaignMapper } from '../../../finance/src/application/dtos/AdvertisingDTOs';

/**
 * Advertising Campaign Controller
 * 
 * Thin controller for advertising campaign operations.
 */
export class AdvertisingCampaignController {
  constructor(
    private readonly createCampaignUseCase: CreateCampaignUseCase,
    private readonly getCampaignROIUseCase: GetCampaignROIUseCase,
    private readonly campaignRepository: IAdvertisingCampaignRepository
  ) {}

  /**
   * Create new campaign
   * POST /api/advertising/campaigns
   */
  async createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };

      const result = await this.createCampaignUseCase.execute(input);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(201).json(result.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaign by ID
   * GET /api/advertising/campaigns/:id
   */
  async getCampaignById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.campaignRepository.findById(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all campaigns with optional filters
   * GET /api/advertising/campaigns
   */
  async getAllCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { platform } = req.query;

      let result;
      if (platform) {
        result = await this.campaignRepository.findByPlatform(platform as any);
      } else {
        result = await this.campaignRepository.findAll();
      }

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update campaign status
   * PATCH /api/advertising/campaigns/:id/status
   */
  async updateCampaignStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const campaignResult = await this.campaignRepository.findById(id);
      if (campaignResult.isFail()) {
        next(campaignResult.error);
        return;
      }

      const campaign = campaignResult.value;

      // Update status based on action
      switch (status) {
        case 'active':
          campaign.start();
          break;
        case 'paused':
          campaign.pause();
          break;
        case 'completed':
          campaign.complete();
          break;
        case 'cancelled':
          campaign.cancel();
          break;
        default:
          res.status(400).json({ error: 'Invalid status' });
          return;
      }

      const updateResult = await this.campaignRepository.update(campaign);
      if (updateResult.isFail()) {
        next(updateResult.error);
        return;
      }

      res.status(200).json(updateResult.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaign ROI analytics
   * GET /api/advertising/campaigns/:campaignId/roi
   */
  async getCampaignROI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignId } = req.params;

      const result = await this.getCampaignROIUseCase.execute(campaignId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json(result.value);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete campaign
   * DELETE /api/advertising/campaigns/:id
   */
  async deleteCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.campaignRepository.delete(id);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
