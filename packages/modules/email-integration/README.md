# Email Integration Module

**Status:** ⚠️ **Outlook Integration Implemented** (Gmail and SMTP coming soon)

Shared infrastructure module that enables LifeOS to receive and process emails from Gmail, Outlook, and SMTP providers.

## Architecture

This module follows the **Event-Driven Pub/Sub + Background Workers** pattern:

1. **Email arrives** at provider (Outlook/Gmail/SMTP)
2. **Provider webhook** triggers Email Module
3. **Email Module syncs metadata** (not full content) to database
4. **Email Module publishes `EmailReceived` event** to EventBus
5. **Domain modules subscribe** (Finance, Garden, House Maintenance, etc.)
6. **Modules filter in background workers** (non-blocking)
7. **If relevant → fetch full email** (lazy loading)
8. **Module extracts data** and stores in own tables

## Implemented: Outlook Integration

### How It Works

Outlook integration uses **Microsoft Graph API webhooks** for real-time email notifications:

```
User connects Outlook account (OAuth)
  ↓
Email Module creates webhook subscription
  ↓
Microsoft Graph sends notification when email arrives
  ↓
Webhook handler verifies and triggers sync
  ↓
Email metadata stored + event published
  ↓
Domain modules process in background workers
```

### Key Components

#### 1. **OutlookConnectionManager** (`infrastructure/connections/`)
- Creates Microsoft Graph webhook subscriptions
- Renews subscriptions before 3-day expiration
- Handles subscription teardown on disconnect

#### 2. **OutlookWebhookHandler** (`infrastructure/webhooks/`)
- Receives Microsoft Graph notifications
- Validates webhook security (clientState verification)
- Extracts message IDs and triggers sync

#### 3. **OutlookProvider** (`infrastructure/providers/`)
- Fetches email metadata (for filtering)
- Fetches full email content (lazy loading)
- Uses Microsoft Graph API

#### 4. **SubscriptionRenewalJob** (`infrastructure/jobs/`)
- Runs daily to check subscription expiration
- Renews subscriptions that expire within 24 hours
- Prevents webhook disruption

### Setup Instructions

#### Prerequisites

1. **Microsoft Azure App Registration**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to "App registrations" → "New registration"
   - Name: "LifeOS Email Integration"
   - Redirect URI: `https://your-domain.com/api/auth/outlook/callback`
   - Note the **Application (client) ID** and create a **Client secret**

2. **API Permissions**
   ```
   Microsoft Graph:
   - Mail.Read (Delegated)
   - Mail.ReadWrite (Delegated)
   ```

3. **Webhook Endpoint**
   - Must be publicly accessible via HTTPS
   - Example: `https://your-domain.com/api/email/webhooks/outlook`
   - Microsoft will send validation request on subscription creation

#### Environment Variables

```.env
# Microsoft Graph API
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_REDIRECT_URI=https://your-domain.com/api/auth/outlook/callback

# Webhook base URL (must be HTTPS in production)
WEBHOOK_BASE_URL=https://your-domain.com
```

#### Database Schema

```prisma
model EmailAccount {
  id                   String    @id @default(uuid())
  userId               String
  provider             EmailProvider
  email                String
  emailName            String?
  isActive             Boolean   @default(true)
  lastSyncedAt         DateTime?
  providerData         Json      // Outlook: { subscriptionId, subscriptionExpiration, webhookSecret }
  encryptedCredentials String    // OAuth tokens
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([userId])
  @@index([provider])
}

enum EmailProvider {
  GMAIL
  OUTLOOK
  SMTP
}
```

### Usage Example

#### Connect Outlook Account (Application Layer)

```typescript
import { ConnectAccountUseCase } from '@lifeOS/email-integration';
import { EmailProvider } from '@lifeOS/email-integration';

// Setup use case with dependencies
const useCase = new ConnectAccountUseCase(
  accountRepository,
  {
    outlook: outlookConnectionManager,
    // gmail: gmailConnectionManager,
    // smtp: smtpConnectionManager,
  },
  triggerInitialSync // Optional callback
);

// Execute
const result = await useCase.execute({
  userId: 'user-123',
  provider: EmailProvider.OUTLOOK,
  email: 'user@outlook.com',
  emailName: 'John Doe',
  credentials: {
    accessToken: 'ey...',
    refreshToken: 'ey...',
    expiresAt: new Date('2025-10-19T12:00:00Z'),
  },
});

if (result.isOk()) {
  const account = result.value;
  console.log('✓ Outlook account connected:', account.email);
  console.log('✓ Webhook subscription created automatically');
  console.log('✓ Account ID:', account.id);
} else {
  console.error('✗ Connection failed:', result.error.message);
}
```

#### Connect via HTTP API

```bash
# Connect Outlook account
curl -X POST http://localhost:3000/api/email/accounts/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "provider": "outlook",
    "email": "user@outlook.com",
    "emailName": "John Doe",
    "credentials": {
      "accessToken": "ey...",
      "refreshToken": "ey...",
      "expiresAt": "2025-10-19T12:00:00Z"
    }
  }'

# Response:
# {
#   "message": "Email account connected successfully",
#   "account": {
#     "id": "uuid-...",
#     "userId": "user-123",
#     "provider": "outlook",
#     "email": "user@outlook.com",
#     "isActive": true,
#     "createdAt": "2025-10-18T...",
#     ...
#   }
# }
```

#### List Connected Accounts

```bash
# Get all accounts for user
curl http://localhost:3000/api/email/accounts?userId=user-123

# Filter by provider
curl http://localhost:3000/api/email/accounts?userId=user-123&provider=outlook

# Filter by active status
curl http://localhost:3000/api/email/accounts?userId=user-123&isActive=true
```

#### Disconnect Account

```bash
curl -X DELETE http://localhost:3000/api/email/accounts/uuid-... \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'

# Response:
# {
#   "message": "Email account disconnected successfully"
# }
```

#### Subscribe to Email Events (Finance Module Example)

```typescript
export class FinanceModule implements IModule {
  async initialize(context: ModuleContext): Promise<void> {
    // Subscribe to EmailReceived events
    context.eventBus.subscribe('EmailReceived', async (event) => {
      // Add to background queue (non-blocking)
      await this.emailQueue.add('process-email', {
        emailId: event.payload.id,
        metadata: event.payload,
      });
    });

    // Worker processes emails in background
    new Worker('finance-email-processing', async (job) => {
      const { emailId, metadata } = job.data;

      // 1. Filter with metadata (no API call!)
      if (!this.looksLikeInvoice(metadata)) {
        return; // Skip
      }

      // 2. Fetch full email (lazy loading)
      const email = await emailModule.getEmail(emailId);

      // 3. Extract invoice data
      const invoice = await extractInvoice(email);

      // 4. Store in finance database
      await invoiceRepository.create(invoice);
    });
  }
}
```

### Subscription Renewal

Outlook subscriptions expire after **3 days maximum**. The `SubscriptionRenewalJob` automatically renews subscriptions:

```typescript
import { SubscriptionRenewalJob } from '@lifeOS/email-integration';

// Schedule daily (cron: 0 0 * * *)
const job = new SubscriptionRenewalJob(
  accountRepository.findAllActive,
  outlookConnectionManager,
  accountRepository.update
);

await job.execute();
// Renews subscriptions expiring within 24 hours
```

### Webhook Validation

When creating a subscription, Microsoft sends a validation request:

```http
POST /api/email/webhooks/outlook?validationToken=abc123...
```

The webhook handler automatically responds with the validation token:

```typescript
// Automatic validation in OutlookWebhookHandler
if (req.query.validationToken) {
  res.status(200).send(validationToken);
}
```

### Security

1. **clientState Verification**
   - Each subscription has a unique random secret (`webhookSecret`)
   - Microsoft includes this in notifications
   - Webhook handler verifies clientState matches

2. **OAuth Token Encryption**
   - Access tokens stored encrypted in database
   - TODO: Implement proper KMS encryption

3. **HTTPS Required**
   - Webhooks must be served over HTTPS
   - Microsoft rejects HTTP endpoints

## Coming Soon

### Gmail Integration
- Cloud Pub/Sub webhooks
- History API for incremental sync
- OAuth 2.0 authentication

### SMTP/IMAP Integration
- IMAP IDLE for pseudo-push notifications
- Fallback polling (every 5 minutes)
- Username/password authentication

### Advanced Features
- **Hybrid Filtering** (Quick filters + AI)
  - Modules register quick filters (keywords)
  - AI evaluation for ambiguous emails
  - Centralized filter caching
- **Email Search**
  - Query metadata without fetching full content
  - Full-text search in snippets
- **Attachment Handling**
  - Download attachments on-demand
  - Virus scanning integration

## Testing

```bash
# Unit tests
npm test

# Integration tests (requires Microsoft Graph API credentials)
MICROSOFT_CLIENT_ID=xxx MICROSOFT_CLIENT_SECRET=yyy npm run test:integration

# E2E tests with Playwright
npm run test:e2e
```

## Architecture Compliance

✅ **Clean Architecture** - Domain, Application, Infrastructure, Presentation layers
✅ **SOLID Principles** - Strategy pattern, dependency inversion, single responsibility
✅ **Event-Driven** - Pub/Sub pattern for module communication
✅ **Non-Blocking** - Background workers prevent system bottlenecks
✅ **Lazy Loading** - Only fetch full emails when needed
✅ **Cost-Effective** - Metadata storage ~200 bytes/email, ~0% API waste

## License

Part of LifeOS - See main project LICENSE

---

**Last Updated:** 2025-10-18
**Status:** Outlook implementation complete, Gmail and SMTP pending
