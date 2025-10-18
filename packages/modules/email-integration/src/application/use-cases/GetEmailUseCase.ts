import { IEmailRepository } from '../../domain/interfaces/IEmailRepository';
import { IEmailAccountRepository } from '../../domain/interfaces/IEmailAccountRepository';
import { IEmailProvider, EmailContent } from '../../domain/interfaces/IEmailProvider';
import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { NotFoundError } from '@lifeOS/core/shared/errors/NotFoundError';
import { BusinessRuleError } from '@lifeOS/core/shared/errors/BusinessRuleError';

/**
 * Cache Service Interface
 *
 * Abstract caching layer (implementation could be Redis, in-memory, etc.)
 */
export interface ICacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

/**
 * Get Email Use Case
 *
 * Fetches full email content with lazy loading pattern.
 *
 * Workflow:
 * 1. Find email metadata in database
 * 2. Get account to retrieve credentials
 * 3. Check cache for full content (1-hour TTL)
 * 4. If cache miss → fetch from provider
 * 5. Store in cache
 * 6. Return full content
 *
 * Design Principles:
 * - Lazy Loading: Only fetch full content when requested
 * - Caching: Reduce provider API calls (cost optimization)
 * - Provider-agnostic: Works with any provider
 *
 * Performance:
 * - Cache hit: ~10ms response time
 * - Cache miss: ~500ms (provider API call)
 * - Cache TTL: 1 hour (balance freshness vs. cost)
 */
export class GetEmailUseCase {
  private readonly CACHE_TTL_SECONDS = 3600; // 1 hour

  constructor(
    private readonly emailRepository: IEmailRepository,
    private readonly accountRepository: IEmailAccountRepository,
    private readonly providers: Map<string, IEmailProvider>,
    private readonly cacheService: ICacheService
  ) {}

  /**
   * Execute: Get full email content
   *
   * @param emailId - Email ID (from metadata sync)
   * @returns Full email content or error
   */
  async execute(emailId: string): Promise<Result<EmailContent, BaseError>> {
    // 1. Find email metadata in repository
    const emailResult = await this.emailRepository.findById(emailId);
    if (emailResult.isFail()) {
      return Result.fail(emailResult.error);
    }

    const email = emailResult.value;

    // 2. Get account to retrieve credentials
    const accountResult = await this.accountRepository.findById(email.accountId);
    if (accountResult.isFail()) {
      return Result.fail(accountResult.error);
    }

    const account = accountResult.value;

    // 3. Verify account is active
    if (!account.isActive) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot fetch email from inactive account',
          'ACCOUNT_INACTIVE',
          { accountId: account.id }
        )
      );
    }

    // 4. Get provider instance
    const provider = this.providers.get(account.provider);
    if (!provider) {
      return Result.fail(
        new BusinessRuleError(
          `Provider not configured: ${account.provider}`,
          'PROVIDER_NOT_CONFIGURED',
          { provider: account.provider }
        )
      );
    }

    // 5. Check cache
    const cacheKey = this.getCacheKey(email.accountId, email.providerMessageId);
    const cachedContent = await this.getFromCache(cacheKey);
    if (cachedContent) {
      return Result.ok(cachedContent);
    }

    // 6. Cache miss → Fetch from provider
    const contentResult = await provider.fetchEmail(
      account.encryptedCredentials, // TODO: Decrypt credentials
      email.providerMessageId
    );

    if (contentResult.isFail()) {
      return Result.fail(contentResult.error);
    }

    const emailContent = contentResult.value;

    // 7. Store in cache
    await this.storeInCache(cacheKey, emailContent);

    return Result.ok(emailContent);
  }

  /**
   * Get cache key for email
   */
  private getCacheKey(accountId: string, providerMessageId: string): string {
    return `email:${accountId}:${providerMessageId}`;
  }

  /**
   * Get email content from cache
   */
  private async getFromCache(key: string): Promise<EmailContent | null> {
    try {
      const cached = await this.cacheService.get(key);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as EmailContent;
    } catch (error) {
      // Cache error → log and continue (fetch from provider)
      console.warn(`Failed to get from cache: ${error}`);
      return null;
    }
  }

  /**
   * Store email content in cache
   */
  private async storeInCache(key: string, content: EmailContent): Promise<void> {
    try {
      const serialized = JSON.stringify(content);
      await this.cacheService.set(key, serialized, this.CACHE_TTL_SECONDS);
    } catch (error) {
      // Cache error → log and continue (not critical)
      console.warn(`Failed to store in cache: ${error}`);
    }
  }
}
