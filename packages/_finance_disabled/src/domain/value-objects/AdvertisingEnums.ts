/**
 * Advertising Domain Enums
 *
 * Type-safe enumerations for advertising domain
 *
 * @module Finance
 */

/**
 * Advertising platforms
 */
export enum Platform {
  GOOGLE_ADS = 'google_ads',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  PINTEREST = 'pinterest',
  SNAPCHAT = 'snapchat',
  REDDIT = 'reddit',
  BING = 'bing',
  AMAZON = 'amazon',
  OTHER = 'other',
}

/**
 * Advertisement types
 */
export enum AdType {
  SEARCH = 'search',
  DISPLAY = 'display',
  VIDEO = 'video',
  SHOPPING = 'shopping',
  SOCIAL = 'social',
  NATIVE = 'native',
  SPONSORED = 'sponsored',
  INFLUENCER = 'influencer',
  EMAIL = 'email',
  RETARGETING = 'retargeting',
  OTHER = 'other',
}

/**
 * Campaign status
 */
export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Helper functions for enums
 */
export class AdvertisingEnums {
  /**
   * Check if value is valid Platform
   */
  static isValidPlatform(value: string): value is Platform {
    return Object.values(Platform).includes(value as Platform);
  }

  /**
   * Check if value is valid AdType
   */
  static isValidAdType(value: string): value is AdType {
    return Object.values(AdType).includes(value as AdType);
  }

  /**
   * Check if value is valid CampaignStatus
   */
  static isValidCampaignStatus(value: string): value is CampaignStatus {
    return Object.values(CampaignStatus).includes(value as CampaignStatus);
  }

  /**
   * Get all platforms
   */
  static getAllPlatforms(): Platform[] {
    return Object.values(Platform);
  }

  /**
   * Get all ad types
   */
  static getAllAdTypes(): AdType[] {
    return Object.values(AdType);
  }

  /**
   * Get all campaign statuses
   */
  static getAllCampaignStatuses(): CampaignStatus[] {
    return Object.values(CampaignStatus);
  }

  /**
   * Get platform display name
   */
  static getPlatformDisplayName(platform: Platform): string {
    const names: Record<Platform, string> = {
      [Platform.GOOGLE_ADS]: 'Google Ads',
      [Platform.FACEBOOK]: 'Facebook',
      [Platform.INSTAGRAM]: 'Instagram',
      [Platform.LINKEDIN]: 'LinkedIn',
      [Platform.TWITTER]: 'Twitter (X)',
      [Platform.TIKTOK]: 'TikTok',
      [Platform.YOUTUBE]: 'YouTube',
      [Platform.PINTEREST]: 'Pinterest',
      [Platform.SNAPCHAT]: 'Snapchat',
      [Platform.REDDIT]: 'Reddit',
      [Platform.BING]: 'Bing Ads',
      [Platform.AMAZON]: 'Amazon Advertising',
      [Platform.OTHER]: 'Other',
    };
    return names[platform];
  }

  /**
   * Get ad type display name
   */
  static getAdTypeDisplayName(adType: AdType): string {
    const names: Record<AdType, string> = {
      [AdType.SEARCH]: 'Search Ads',
      [AdType.DISPLAY]: 'Display Ads',
      [AdType.VIDEO]: 'Video Ads',
      [AdType.SHOPPING]: 'Shopping Ads',
      [AdType.SOCIAL]: 'Social Media Ads',
      [AdType.NATIVE]: 'Native Ads',
      [AdType.SPONSORED]: 'Sponsored Content',
      [AdType.INFLUENCER]: 'Influencer Marketing',
      [AdType.EMAIL]: 'Email Marketing',
      [AdType.RETARGETING]: 'Retargeting Ads',
      [AdType.OTHER]: 'Other',
    };
    return names[adType];
  }

  /**
   * Get campaign status display name
   */
  static getCampaignStatusDisplayName(status: CampaignStatus): string {
    const names: Record<CampaignStatus, string> = {
      [CampaignStatus.DRAFT]: 'Draft',
      [CampaignStatus.SCHEDULED]: 'Scheduled',
      [CampaignStatus.ACTIVE]: 'Active',
      [CampaignStatus.PAUSED]: 'Paused',
      [CampaignStatus.COMPLETED]: 'Completed',
      [CampaignStatus.CANCELLED]: 'Cancelled',
    };
    return names[status];
  }
}
