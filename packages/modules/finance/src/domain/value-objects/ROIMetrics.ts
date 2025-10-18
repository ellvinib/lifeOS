/**
 * ROIMetrics Value Object
 *
 * Immutable value object that encapsulates advertising ROI calculations
 * and performance metrics.
 *
 * Design Principles:
 * - Immutable: All properties are readonly
 * - Self-validating: Constructor validates all inputs
 * - Rich behavior: Contains calculation logic
 * - No setters: Create new instance to change values
 *
 * @module Finance
 */

/**
 * ROI Metrics for advertising campaigns
 */
export class ROIMetrics {
  // Core metrics (readonly for immutability)
  private readonly _spend: number;
  private readonly _revenue: number;
  private readonly _impressions: number;
  private readonly _clicks: number;
  private readonly _conversions: number;

  constructor(props: {
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }) {
    // Validate all inputs
    if (props.spend < 0) {
      throw new Error('Spend cannot be negative');
    }
    if (props.revenue < 0) {
      throw new Error('Revenue cannot be negative');
    }
    if (props.impressions < 0) {
      throw new Error('Impressions cannot be negative');
    }
    if (props.clicks < 0) {
      throw new Error('Clicks cannot be negative');
    }
    if (props.conversions < 0) {
      throw new Error('Conversions cannot be negative');
    }
    if (props.clicks > props.impressions) {
      throw new Error('Clicks cannot exceed impressions');
    }
    if (props.conversions > props.clicks) {
      throw new Error('Conversions cannot exceed clicks');
    }

    this._spend = props.spend;
    this._revenue = props.revenue;
    this._impressions = props.impressions;
    this._clicks = props.clicks;
    this._conversions = props.conversions;
  }

  // Getters
  get spend(): number {
    return this._spend;
  }

  get revenue(): number {
    return this._revenue;
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

  /**
   * Calculate Return on Investment (ROI)
   * Formula: ((Revenue - Spend) / Spend) * 100
   *
   * @returns ROI percentage
   */
  get roi(): number {
    if (this._spend === 0) return 0;
    return ((this._revenue - this._spend) / this._spend) * 100;
  }

  /**
   * Calculate Return on Ad Spend (ROAS)
   * Formula: Revenue / Spend
   *
   * @returns ROAS ratio
   */
  get roas(): number {
    if (this._spend === 0) return 0;
    return this._revenue / this._spend;
  }

  /**
   * Calculate Click-Through Rate (CTR)
   * Formula: (Clicks / Impressions) * 100
   *
   * @returns CTR percentage
   */
  get ctr(): number {
    if (this._impressions === 0) return 0;
    return (this._clicks / this._impressions) * 100;
  }

  /**
   * Calculate Conversion Rate (CVR)
   * Formula: (Conversions / Clicks) * 100
   *
   * @returns CVR percentage
   */
  get conversionRate(): number {
    if (this._clicks === 0) return 0;
    return (this._conversions / this._clicks) * 100;
  }

  /**
   * Calculate Cost Per Click (CPC)
   * Formula: Spend / Clicks
   *
   * @returns CPC value
   */
  get cpc(): number {
    if (this._clicks === 0) return 0;
    return this._spend / this._clicks;
  }

  /**
   * Calculate Cost Per Mille/Thousand Impressions (CPM)
   * Formula: (Spend / Impressions) * 1000
   *
   * @returns CPM value
   */
  get cpm(): number {
    if (this._impressions === 0) return 0;
    return (this._spend / this._impressions) * 1000;
  }

  /**
   * Calculate Cost Per Acquisition/Conversion (CPA)
   * Formula: Spend / Conversions
   *
   * @returns CPA value
   */
  get cpa(): number {
    if (this._conversions === 0) return 0;
    return this._spend / this._conversions;
  }

  /**
   * Net profit from the campaign
   * Formula: Revenue - Spend
   *
   * @returns Net profit
   */
  get profit(): number {
    return this._revenue - this._spend;
  }

  /**
   * Profit margin percentage
   * Formula: (Profit / Revenue) * 100
   *
   * @returns Profit margin percentage
   */
  get profitMargin(): number {
    if (this._revenue === 0) return 0;
    return (this.profit / this._revenue) * 100;
  }

  /**
   * Check if campaign is profitable
   *
   * @returns true if revenue exceeds spend
   */
  get isProfitable(): boolean {
    return this._revenue > this._spend;
  }

  /**
   * Check if ROI meets a specific threshold
   *
   * @param threshold - Minimum ROI percentage required
   * @returns true if ROI meets or exceeds threshold
   */
  meetsROIThreshold(threshold: number): boolean {
    return this.roi >= threshold;
  }

  /**
   * Check if ROAS meets a specific threshold
   *
   * @param threshold - Minimum ROAS ratio required
   * @returns true if ROAS meets or exceeds threshold
   */
  meetsROASThreshold(threshold: number): boolean {
    return this.roas >= threshold;
  }

  /**
   * Get performance grade based on ROI
   *
   * @returns Performance grade (A-F)
   */
  get performanceGrade(): string {
    const roi = this.roi;
    if (roi >= 100) return 'A';
    if (roi >= 50) return 'B';
    if (roi >= 20) return 'C';
    if (roi >= 0) return 'D';
    return 'F';
  }

  /**
   * Create a new ROIMetrics with updated values
   *
   * @param updates - Partial updates to apply
   * @returns New ROIMetrics instance
   */
  update(updates: Partial<{
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>): ROIMetrics {
    return new ROIMetrics({
      spend: updates.spend ?? this._spend,
      revenue: updates.revenue ?? this._revenue,
      impressions: updates.impressions ?? this._impressions,
      clicks: updates.clicks ?? this._clicks,
      conversions: updates.conversions ?? this._conversions,
    });
  }

  /**
   * Create empty/zero metrics
   *
   * @returns ROIMetrics with all zeros
   */
  static empty(): ROIMetrics {
    return new ROIMetrics({
      spend: 0,
      revenue: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    });
  }

  /**
   * Convert to plain object for serialization
   *
   * @returns Plain object representation
   */
  toJSON(): {
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
    roi: number;
    roas: number;
    ctr: number;
    conversionRate: number;
    cpc: number;
    cpm: number;
    cpa: number;
    profit: number;
    profitMargin: number;
    isProfitable: boolean;
    performanceGrade: string;
  } {
    return {
      spend: this._spend,
      revenue: this._revenue,
      impressions: this._impressions,
      clicks: this._clicks,
      conversions: this._conversions,
      roi: this.roi,
      roas: this.roas,
      ctr: this.ctr,
      conversionRate: this.conversionRate,
      cpc: this.cpc,
      cpm: this.cpm,
      cpa: this.cpa,
      profit: this.profit,
      profitMargin: this.profitMargin,
      isProfitable: this.isProfitable,
      performanceGrade: this.performanceGrade,
    };
  }

  /**
   * Value equality check
   *
   * @param other - Other ROIMetrics to compare
   * @returns true if all values are equal
   */
  equals(other: ROIMetrics): boolean {
    return (
      this._spend === other._spend &&
      this._revenue === other._revenue &&
      this._impressions === other._impressions &&
      this._clicks === other._clicks &&
      this._conversions === other._conversions
    );
  }

  /**
   * String representation
   *
   * @returns Human-readable string
   */
  toString(): string {
    return `ROI: ${this.roi.toFixed(2)}%, ROAS: ${this.roas.toFixed(
      2
    )}, Profit: €${this.profit.toFixed(2)} (${this.performanceGrade})`;
  }
}
