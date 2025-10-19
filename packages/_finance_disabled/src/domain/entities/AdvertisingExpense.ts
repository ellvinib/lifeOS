/**
 * AdvertisingExpense Entity
 *
 * Rich domain model for advertising expenses with ROI tracking.
 *
 * Design Principles:
 * - Rich domain model: Business logic lives in the entity
 * - Immutable ID: Cannot change after creation
 * - Encapsulation: Private fields with controlled access
 * - Value objects: Uses ROIMetrics for calculations
 * - No anemic model: Contains behavior, not just data
 *
 * @module Finance
 */

import { Platform, AdType } from '../value-objects/AdvertisingEnums';
import { ROIMetrics } from '../value-objects/ROIMetrics';

export interface AdvertisingExpenseProps {
  id: string;
  campaignId: string;
  date: Date;
  amount: number;
  currency: string;
  platform: Platform;
  adType: AdType;
  description?: string;

  // Metrics
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;

  // Engagement metrics
  likes?: number;
  shares?: number;
  comments?: number;
  videoViews?: number;

  // Target audience
  targetAudience?: string;
  ageRange?: string;
  location?: string;

  // Creative info
  creativeUrl?: string;
  landingPageUrl?: string;

  // Notes and metadata
  notes?: string;
  tags: string[];
  metadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Advertising Expense entity
 */
export class AdvertisingExpense {
  private readonly _id: string;
  private readonly _campaignId: string;
  private _date: Date;
  private _amount: number;
  private _currency: string;
  private _platform: Platform;
  private _adType: AdType;
  private _description?: string;

  // Metrics
  private _impressions: number;
  private _clicks: number;
  private _conversions: number;
  private _revenue: number;

  // Engagement metrics
  private _likes: number;
  private _shares: number;
  private _comments: number;
  private _videoViews: number;

  // Target audience
  private _targetAudience?: string;
  private _ageRange?: string;
  private _location?: string;

  // Creative info
  private _creativeUrl?: string;
  private _landingPageUrl?: string;

  // Notes and metadata
  private _notes?: string;
  private _tags: string[];
  private _metadata: Record<string, any>;

  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AdvertisingExpenseProps) {
    // Validate required fields
    if (!props.id || props.id.trim().length === 0) {
      throw new Error('Expense ID is required');
    }
    if (!props.campaignId || props.campaignId.trim().length === 0) {
      throw new Error('Campaign ID is required');
    }
    if (!props.date) {
      throw new Error('Date is required');
    }
    if (props.amount === undefined || props.amount < 0) {
      throw new Error('Amount must be a non-negative number');
    }
    if (!props.platform) {
      throw new Error('Platform is required');
    }
    if (!props.adType) {
      throw new Error('Ad type is required');
    }

    // Validate metrics
    if (props.impressions !== undefined && props.impressions < 0) {
      throw new Error('Impressions cannot be negative');
    }
    if (props.clicks !== undefined && props.clicks < 0) {
      throw new Error('Clicks cannot be negative');
    }
    if (props.conversions !== undefined && props.conversions < 0) {
      throw new Error('Conversions cannot be negative');
    }
    if (props.revenue !== undefined && props.revenue < 0) {
      throw new Error('Revenue cannot be negative');
    }

    this._id = props.id;
    this._campaignId = props.campaignId;
    this._date = props.date;
    this._amount = props.amount;
    this._currency = props.currency || 'EUR';
    this._platform = props.platform;
    this._adType = props.adType;
    this._description = props.description;

    this._impressions = props.impressions || 0;
    this._clicks = props.clicks || 0;
    this._conversions = props.conversions || 0;
    this._revenue = props.revenue || 0;

    this._likes = props.likes || 0;
    this._shares = props.shares || 0;
    this._comments = props.comments || 0;
    this._videoViews = props.videoViews || 0;

    this._targetAudience = props.targetAudience;
    this._ageRange = props.ageRange;
    this._location = props.location;

    this._creativeUrl = props.creativeUrl;
    this._landingPageUrl = props.landingPageUrl;

    this._notes = props.notes;
    this._tags = props.tags || [];
    this._metadata = props.metadata || {};

    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get campaignId(): string {
    return this._campaignId;
  }

  get date(): Date {
    return this._date;
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  get platform(): Platform {
    return this._platform;
  }

  get adType(): AdType {
    return this._adType;
  }

  get description(): string | undefined {
    return this._description;
  }

  get impressions(): number {
    return this._impressions;
  }

  get clicks(): number {
    return this._clicks;
  }

  get conversions(): number {
    return this._conversions;
  }

  get revenue(): number {
    return this._revenue;
  }

  get likes(): number {
    return this._likes;
  }

  get shares(): number {
    return this._shares;
  }

  get comments(): number {
    return this._comments;
  }

  get videoViews(): number {
    return this._videoViews;
  }

  get targetAudience(): string | undefined {
    return this._targetAudience;
  }

  get ageRange(): string | undefined {
    return this._ageRange;
  }

  get location(): string | undefined {
    return this._location;
  }

  get creativeUrl(): string | undefined {
    return this._creativeUrl;
  }

  get landingPageUrl(): string | undefined {
    return this._landingPageUrl;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get tags(): string[] {
    return [...this._tags];
  }

  get metadata(): Record<string, any> {
    return { ...this._metadata };
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Get ROI metrics for this expense
   */
  get roiMetrics(): ROIMetrics {
    return new ROIMetrics({
      spend: this._amount,
      revenue: this._revenue,
      impressions: this._impressions,
      clicks: this._clicks,
      conversions: this._conversions,
    });
  }

  /**
   * Update expense details
   */
  update(updates: Partial<{
    date: Date;
    amount: number;
    platform: Platform;
    adType: AdType;
    description: string;
    targetAudience: string;
    ageRange: string;
    location: string;
    creativeUrl: string;
    landingPageUrl: string;
    notes: string;
    tags: string[];
  }>): void {
    if (updates.date !== undefined) {
      this._date = updates.date;
    }

    if (updates.amount !== undefined) {
      if (updates.amount < 0) {
        throw new Error('Amount cannot be negative');
      }
      this._amount = updates.amount;
    }

    if (updates.platform !== undefined) {
      this._platform = updates.platform;
    }

    if (updates.adType !== undefined) {
      this._adType = updates.adType;
    }

    if (updates.description !== undefined) {
      this._description = updates.description;
    }

    if (updates.targetAudience !== undefined) {
      this._targetAudience = updates.targetAudience;
    }

    if (updates.ageRange !== undefined) {
      this._ageRange = updates.ageRange;
    }

    if (updates.location !== undefined) {
      this._location = updates.location;
    }

    if (updates.creativeUrl !== undefined) {
      this._creativeUrl = updates.creativeUrl;
    }

    if (updates.landingPageUrl !== undefined) {
      this._landingPageUrl = updates.landingPageUrl;
    }

    if (updates.notes !== undefined) {
      this._notes = updates.notes;
    }

    if (updates.tags !== undefined) {
      this._tags = updates.tags;
    }

    this._updatedAt = new Date();
  }

  /**
   * Update performance metrics
   */
  updateMetrics(metrics: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
  }): void {
    if (metrics.impressions !== undefined) {
      if (metrics.impressions < 0) {
        throw new Error('Impressions cannot be negative');
      }
      this._impressions = metrics.impressions;
    }

    if (metrics.clicks !== undefined) {
      if (metrics.clicks < 0) {
        throw new Error('Clicks cannot be negative');
      }
      if (this._impressions > 0 && metrics.clicks > this._impressions) {
        throw new Error('Clicks cannot exceed impressions');
      }
      this._clicks = metrics.clicks;
    }

    if (metrics.conversions !== undefined) {
      if (metrics.conversions < 0) {
        throw new Error('Conversions cannot be negative');
      }
      if (this._clicks > 0 && metrics.conversions > this._clicks) {
        throw new Error('Conversions cannot exceed clicks');
      }
      this._conversions = metrics.conversions;
    }

    if (metrics.revenue !== undefined) {
      if (metrics.revenue < 0) {
        throw new Error('Revenue cannot be negative');
      }
      this._revenue = metrics.revenue;
    }

    this._updatedAt = new Date();
  }

  /**
   * Update engagement metrics
   */
  updateEngagement(engagement: {
    likes?: number;
    shares?: number;
    comments?: number;
    videoViews?: number;
  }): void {
    if (engagement.likes !== undefined) {
      if (engagement.likes < 0) {
        throw new Error('Likes cannot be negative');
      }
      this._likes = engagement.likes;
    }

    if (engagement.shares !== undefined) {
      if (engagement.shares < 0) {
        throw new Error('Shares cannot be negative');
      }
      this._shares = engagement.shares;
    }

    if (engagement.comments !== undefined) {
      if (engagement.comments < 0) {
        throw new Error('Comments cannot be negative');
      }
      this._comments = engagement.comments;
    }

    if (engagement.videoViews !== undefined) {
      if (engagement.videoViews < 0) {
        throw new Error('Video views cannot be negative');
      }
      this._videoViews = engagement.videoViews;
    }

    this._updatedAt = new Date();
  }

  /**
   * Check if expense has performance metrics
   */
  get hasMetrics(): boolean {
    return this._impressions > 0 || this._clicks > 0 || this._conversions > 0;
  }

  /**
   * Check if expense has engagement metrics
   */
  get hasEngagement(): boolean {
    return this._likes > 0 || this._shares > 0 || this._comments > 0 || this._videoViews > 0;
  }

  /**
   * Check if expense is profitable
   */
  get isProfitable(): boolean {
    return this._revenue > this._amount;
  }

  /**
   * Get total engagement count
   */
  get totalEngagement(): number {
    return this._likes + this._shares + this._comments;
  }

  /**
   * Get engagement rate (engagement per impression)
   */
  get engagementRate(): number {
    if (this._impressions === 0) return 0;
    return (this.totalEngagement / this._impressions) * 100;
  }

  /**
   * Add a tag
   */
  addTag(tag: string): void {
    if (!tag || tag.trim().length === 0) {
      throw new Error('Tag cannot be empty');
    }
    if (this._tags.includes(tag)) {
      return; // Silently ignore duplicate tags
    }
    this._tags.push(tag);
    this._updatedAt = new Date();
  }

  /**
   * Remove a tag
   */
  removeTag(tag: string): void {
    const index = this._tags.indexOf(tag);
    if (index !== -1) {
      this._tags.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Update metadata
   */
  updateMetadata(key: string, value: any): void {
    this._metadata[key] = value;
    this._updatedAt = new Date();
  }

  /**
   * Convert to plain object
   */
  toJSON(): AdvertisingExpenseProps {
    return {
      id: this._id,
      campaignId: this._campaignId,
      date: this._date,
      amount: this._amount,
      currency: this._currency,
      platform: this._platform,
      adType: this._adType,
      description: this._description,
      impressions: this._impressions,
      clicks: this._clicks,
      conversions: this._conversions,
      revenue: this._revenue,
      likes: this._likes,
      shares: this._shares,
      comments: this._comments,
      videoViews: this._videoViews,
      targetAudience: this._targetAudience,
      ageRange: this._ageRange,
      location: this._location,
      creativeUrl: this._creativeUrl,
      landingPageUrl: this._landingPageUrl,
      notes: this._notes,
      tags: [...this._tags],
      metadata: { ...this._metadata },
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
