import { Router } from 'express';
import { AdvertisingCampaignController } from '../controllers/AdvertisingCampaignController';
import { AdvertisingExpenseController } from '../controllers/AdvertisingExpenseController';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createCampaignSchema,
  updateCampaignStatusSchema,
  createExpenseSchema,
  updateExpenseMetricsSchema,
  getCampaignSchema,
  getExpenseSchema,
  getExpensesByCampaignSchema,
  getCampaignROISchema,
  filterCampaignsSchema,
} from '../validation/advertising.validation';

/**
 * Create Advertising Routes
 *
 * Routes for advertising campaign and expense management.
 */
export const createAdvertisingRoutes = (
  campaignController: AdvertisingCampaignController,
  expenseController: AdvertisingExpenseController
): Router => {
  const router = Router();

  // ========== Campaign Routes ==========

  /**
   * Create new campaign
   * POST /api/advertising/campaigns
   */
  router.post(
    '/campaigns',
    validateRequest(createCampaignSchema),
    (req, res, next) => campaignController.createCampaign(req, res, next)
  );

  /**
   * Get all campaigns (with optional filters)
   * GET /api/advertising/campaigns?platform=...
   */
  router.get(
    '/campaigns',
    validateRequest(filterCampaignsSchema),
    (req, res, next) => campaignController.getAllCampaigns(req, res, next)
  );

  /**
   * Get campaign by ID
   * GET /api/advertising/campaigns/:id
   */
  router.get(
    '/campaigns/:id',
    validateRequest(getCampaignSchema),
    (req, res, next) => campaignController.getCampaignById(req, res, next)
  );

  /**
   * Update campaign status
   * PATCH /api/advertising/campaigns/:id/status
   */
  router.patch(
    '/campaigns/:id/status',
    validateRequest(updateCampaignStatusSchema),
    (req, res, next) => campaignController.updateCampaignStatus(req, res, next)
  );

  /**
   * Get campaign ROI analytics
   * GET /api/advertising/campaigns/:campaignId/roi
   */
  router.get(
    '/campaigns/:campaignId/roi',
    validateRequest(getCampaignROISchema),
    (req, res, next) => campaignController.getCampaignROI(req, res, next)
  );

  /**
   * Get expenses for a campaign
   * GET /api/advertising/campaigns/:campaignId/expenses
   */
  router.get(
    '/campaigns/:campaignId/expenses',
    validateRequest(getExpensesByCampaignSchema),
    (req, res, next) => expenseController.getExpensesByCampaign(req, res, next)
  );

  /**
   * Delete campaign
   * DELETE /api/advertising/campaigns/:id
   */
  router.delete(
    '/campaigns/:id',
    validateRequest(getCampaignSchema),
    (req, res, next) => campaignController.deleteCampaign(req, res, next)
  );

  // ========== Expense Routes ==========

  /**
   * Create new advertising expense
   * POST /api/advertising/expenses
   */
  router.post(
    '/expenses',
    validateRequest(createExpenseSchema),
    (req, res, next) => expenseController.createExpense(req, res, next)
  );

  /**
   * Get expense by ID
   * GET /api/advertising/expenses/:id
   */
  router.get(
    '/expenses/:id',
    validateRequest(getExpenseSchema),
    (req, res, next) => expenseController.getExpenseById(req, res, next)
  );

  /**
   * Update expense metrics
   * PATCH /api/advertising/expenses/:id/metrics
   */
  router.patch(
    '/expenses/:id/metrics',
    validateRequest(updateExpenseMetricsSchema),
    (req, res, next) => expenseController.updateMetrics(req, res, next)
  );

  /**
   * Delete expense
   * DELETE /api/advertising/expenses/:id
   */
  router.delete(
    '/expenses/:id',
    validateRequest(getExpenseSchema),
    (req, res, next) => expenseController.deleteExpense(req, res, next)
  );

  return router;
};
