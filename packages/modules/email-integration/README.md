# Email Integration Module

**Status:** ✅ **Complete - Gmail, Outlook & SMTP Integration**

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

## Implemented: SMTP/IMAP Integration

### How It Works

SMTP/IMAP integration uses standard IMAP protocol with IDLE extension for pseudo-push notifications:

```
User connects IMAP account (username/password)
  ↓
Email Module tests connection and checks IDLE support
  ↓
IMAP IDLE monitor established (or polling fallback)
  ↓
Server sends EXISTS notification when email arrives
  ↓
Email metadata synced + event published
  ↓
Domain modules process in background workers
```

### Key Components

#### 1. **SmtpProvider** (`infrastructure/providers/`)
- Fetches emails via IMAP protocol
- Supports standard IMAP servers (Gmail, Outlook.com, custom)
- Parses MIME messages to extract metadata

#### 2. **SmtpConnectionManager** (`infrastructure/connections/`)
- Tests IMAP connection and credentials
- Checks server capabilities (IDLE support)
- No subscription management (unlike Outlook/Gmail)

#### 3. **SmtpIdleMonitor** (`infrastructure/monitors/`)
- Maintains persistent IMAP IDLE connections
- Receives near-instant notifications (~1s latency)
- Auto-reconnects on disconnect
- Fallback to 5-minute polling if IDLE unsupported

### Setup Instructions

#### Prerequisites

1. **IMAP Server Access**
   - IMAP host and port (usually 993 for SSL/TLS)
   - Username and password
   - IMAP enabled in email account settings

2. **Common IMAP Settings**
   ```
   Gmail:
   - IMAP: imap.gmail.com:993
   - Enable IMAP in Gmail settings
   - Use App Password (not account password)

   Outlook.com:
   - IMAP: outlook.office365.com:993
   - Use account password

   Custom Server:
   - Check your email provider's documentation
   ```

#### Usage Example

##### Connect SMTP Account (Application Layer)

```typescript
import { ConnectAccountUseCase } from '@lifeOS/email-integration';
import { EmailProvider } from '@lifeOS/email-integration';

const useCase = new ConnectAccountUseCase(
  accountRepository,
  {
    smtp: smtpConnectionManager,
  }
);

const result = await useCase.execute({
  userId: 'user-123',
  provider: EmailProvider.SMTP,
  email: 'user@example.com',
  emailName: 'John Doe',
  credentials: {
    username: 'user@example.com',
    password: 'your-password', // Use app password for Gmail
    imapHost: 'imap.gmail.com',
    imapPort: 993,
  },
});

if (result.isOk()) {
  const account = result.value;
  console.log('✓ SMTP account connected:', account.email);
  console.log('✓ IDLE monitor started automatically');
} else {
  console.error('✗ Connection failed:', result.error.message);
}
```

##### Connect via HTTP API

```bash
# Connect SMTP/IMAP account
curl -X POST http://localhost:3000/api/email/accounts/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "provider": "smtp",
    "email": "user@gmail.com",
    "emailName": "John Doe",
    "credentials": {
      "username": "user@gmail.com",
      "password": "your-app-password",
      "imapHost": "imap.gmail.com",
      "imapPort": 993
    }
  }'

# Response:
# {
#   "message": "Email account connected successfully",
#   "account": {
#     "id": "uuid-...",
#     "provider": "smtp",
#     "email": "user@gmail.com",
#     "isActive": true,
#     ...
#   }
# }
```

#### Start IMAP IDLE Monitor

```typescript
import { SmtpIdleMonitor } from '@lifeOS/email-integration';

// Create monitor with email sync queue
const monitor = new SmtpIdleMonitor(emailSyncQueue);

// Start monitoring all SMTP accounts
const smtpAccounts = await accountRepository.findByUser(userId, {
  provider: EmailProvider.SMTP,
  isActive: true,
});

for (const account of smtpAccounts) {
  await monitor.startMonitoring(account);
}

// Monitor status
const status = monitor.getStatus();
console.log('SMTP Monitors:', status);
// { totalMonitors: 3, idle: 2, polling: 1 }

// Graceful shutdown
process.on('SIGTERM', async () => {
  await monitor.stopAll();
});
```

### IMAP IDLE vs Polling

| Feature | IMAP IDLE | Polling |
|---------|-----------|---------|
| **Latency** | ~1 second | ~5 minutes |
| **Resource Usage** | Low (persistent connection) | Low (periodic checks) |
| **Server Support** | Requires IDLE extension | All IMAP servers |
| **Reliability** | Auto-reconnect on disconnect | Always works |

The module automatically detects IDLE support and uses the best method available.

### Security Considerations

1. **Credential Storage**
   - Passwords stored encrypted in database
   - TODO: Implement proper KMS encryption
   - Use app-specific passwords when available (Gmail)

2. **Connection Security**
   - SSL/TLS for port 993 (automatic)
   - STARTTLS for port 143 (if needed)
   - Secure password transmission

3. **IMAP IDLE Safety**
   - 29-minute timeout prevents stale connections
   - Auto-reconnect with exponential backoff
   - Graceful degradation to polling

## Implemented: Gmail Integration

### How It Works

Gmail integration uses **Google Cloud Pub/Sub + History API** for efficient real-time email notifications:

```
User connects Gmail account (OAuth)
  ↓
Email Module creates watch() on mailbox
  ↓
Gmail pushes to Cloud Pub/Sub topic when email arrives
  ↓
Pub/Sub delivers notification to webhook endpoint
  ↓
Webhook handler triggers History API incremental sync
  ↓
Email metadata stored + event published
  ↓
Domain modules process in background workers
```

### Architecture Advantages

Gmail's approach is **90%+ more efficient** than full sync:
- **History API** fetches only changes since last historyId (delta sync)
- **7-day watch expiration** (longer than Outlook's 3 days)
- **Pub/Sub reliability** - Google handles retry/delivery
- **No webhook signature verification needed** - HTTPS + timestamp validation sufficient

### Key Components

#### 1. **GmailProvider** (`infrastructure/providers/`)
- Fetches email metadata using Gmail API
- Fetches full email content (lazy loading)
- OAuth2 with automatic token refresh
- MIME part extraction for attachments

#### 2. **GmailConnectionManager** (`infrastructure/connections/`)
- Creates Gmail watch() on user's mailbox
- Stores historyId for incremental sync
- Renews watches before 7-day expiration
- Handles teardown on disconnect

#### 3. **GmailWebhookHandler** (`infrastructure/webhooks/`)
- Receives Pub/Sub push notifications
- Decodes base64 message data
- Validates timestamp (< 5 minutes)
- Triggers history sync job

#### 4. **GmailHistorySyncUseCase** (`application/use-cases/`)
- **Gmail-specific** - Uses History API for delta sync
- Fetches only `messagesAdded` events
- Handles pagination automatically
- Fallback to full sync if historyId too old (> 30 days)
- Updates historyId after successful sync

### Setup Instructions

#### Prerequisites

1. **Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Note your **Project ID**

2. **Enable Gmail API**
   - In Cloud Console → "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `https://your-domain.com/api/auth/gmail/callback`
   - Note the **Client ID** and **Client secret**

4. **Create Pub/Sub Topic**
   ```bash
   # Via gcloud CLI
   gcloud pubsub topics create gmail-notifications

   # Get full topic name
   # projects/YOUR_PROJECT_ID/topics/gmail-notifications
   ```

5. **Grant Gmail API Push Permission**
   ```bash
   # Gmail API service account needs publisher permission
   gcloud pubsub topics add-iam-policy-binding gmail-notifications \
     --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
     --role=roles/pubsub.publisher
   ```

6. **Create Push Subscription**
   ```bash
   gcloud pubsub subscriptions create gmail-notifications-sub \
     --topic=gmail-notifications \
     --push-endpoint=https://your-domain.com/api/email/webhooks/gmail
   ```

#### Environment Variables

```.env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/gmail/callback

# Google Cloud Pub/Sub
GOOGLE_PUBSUB_TOPIC=projects/YOUR_PROJECT_ID/topics/gmail-notifications

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
  providerData         Json      // Gmail: { historyId, watchExpiration, pubSubTopicName, watchCreated }
  encryptedCredentials String    // OAuth tokens
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([userId])
  @@index([provider])
}
```

### Usage Example

#### Connect Gmail Account (Application Layer)

```typescript
import { ConnectAccountUseCase } from '@lifeOS/email-integration';
import { EmailProvider } from '@lifeOS/email-integration';

const useCase = new ConnectAccountUseCase(
  accountRepository,
  {
    gmail: gmailConnectionManager,
  },
  triggerInitialSync
);

const result = await useCase.execute({
  userId: 'user-123',
  provider: EmailProvider.GMAIL,
  email: 'user@gmail.com',
  emailName: 'John Doe',
  credentials: {
    accessToken: 'ya29...',
    refreshToken: '1//...',
    expiresAt: new Date('2025-10-19T12:00:00Z'),
  },
});

if (result.isOk()) {
  const account = result.value;
  console.log('✓ Gmail account connected:', account.email);
  console.log('✓ Watch created with historyId:', account.getProviderData().historyId);
  console.log('✓ Watch expires:', account.getProviderData().watchExpiration);
} else {
  console.error('✗ Connection failed:', result.error.message);
}
```

#### Connect via HTTP API

```bash
# Connect Gmail account
curl -X POST http://localhost:3000/api/email/accounts/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "provider": "gmail",
    "email": "user@gmail.com",
    "emailName": "John Doe",
    "credentials": {
      "accessToken": "ya29...",
      "refreshToken": "1//...",
      "expiresAt": "2025-10-19T12:00:00Z"
    }
  }'

# Response:
# {
#   "message": "Email account connected successfully",
#   "account": {
#     "id": "uuid-...",
#     "provider": "gmail",
#     "email": "user@gmail.com",
#     "isActive": true,
#     "providerData": {
#       "historyId": "123456",
#       "watchExpiration": "2025-10-26T12:00:00.000Z",
#       "pubSubTopicName": "projects/PROJECT/topics/gmail-notifications"
#     },
#     ...
#   }
# }
```

### History API Incremental Sync

The Gmail integration's killer feature is **incremental sync via History API**:

```typescript
import { GmailHistorySyncUseCase } from '@lifeOS/email-integration';

const useCase = new GmailHistorySyncUseCase(
  accountRepository,
  emailRepository,
  eventPublisher,
  syncEmailsUseCase // Fallback for full sync
);

// Triggered by Pub/Sub webhook
const result = await useCase.execute(accountId);

if (result.isOk()) {
  const newEmailCount = result.value;
  console.log(`✓ Synced ${newEmailCount} new emails via History API`);
  // Only fetched changes since last historyId!
} else {
  console.error('✗ Sync failed:', result.error.message);
}
```

**Efficiency Example:**
- Mailbox has 10,000 emails
- Full sync: Fetch 10,000 message IDs + 10,000 metadata requests = **20,000 API calls**
- History sync: 1 history request + 5 new message requests = **6 API calls** (99.97% reduction!)

### Watch Renewal

Gmail watches expire after **7 days**. The `SubscriptionRenewalJob` automatically renews watches:

```typescript
import { SubscriptionRenewalJob } from '@lifeOS/email-integration';

// Schedule daily (cron: 0 0 * * *)
const job = new SubscriptionRenewalJob(
  accountRepository.findAllActive,
  outlookConnectionManager,
  gmailConnectionManager, // Gmail support!
  accountRepository.update
);

await job.execute();
// Renews watches expiring within 24 hours
```

### Pub/Sub Notification Format

Google sends base64-encoded JSON via Pub/Sub:

```json
{
  "message": {
    "data": "eyJlbWFpbEFkZHJlc3MiOiJ1c2VyQGdtYWlsLmNvbSIsImhpc3RvcnlJZCI6IjEyMzQ1NiJ9",
    "messageId": "10000000000000000",
    "publishTime": "2025-10-19T12:00:00.000Z"
  },
  "subscription": "projects/PROJECT/subscriptions/gmail-notifications-sub"
}
```

Decoded data:
```json
{
  "emailAddress": "user@gmail.com",
  "historyId": "123456"
}
```

### Security

1. **OAuth 2.0 Authentication**
   - Secure token-based access
   - Automatic token refresh via googleapis library
   - No password storage

2. **Pub/Sub Security**
   - HTTPS required for push endpoint
   - Timestamp validation (notifications < 5 minutes old)
   - No signature verification needed (push subscription is secure)

3. **IAM Permissions**
   - `gmail-api-push@system.gserviceaccount.com` needs `pubsub.publisher` role
   - Prevents unauthorized watch creation

4. **Token Encryption**
   - OAuth tokens stored encrypted in database
   - TODO: Implement proper KMS encryption

### Troubleshooting

#### Common Issues

1. **"Permission denied" when creating watch**
   - **Solution:** Grant `pubsub.publisher` role to Gmail API service account:
   ```bash
   gcloud pubsub topics add-iam-policy-binding gmail-notifications \
     --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
     --role=roles/pubsub.publisher
   ```

2. **"Topic not found" error**
   - **Solution:** Create Pub/Sub topic first:
   ```bash
   gcloud pubsub topics create gmail-notifications
   ```

3. **Webhook receives no notifications**
   - **Solution:** Verify push subscription is configured correctly:
   ```bash
   gcloud pubsub subscriptions describe gmail-notifications-sub
   # Check pushConfig.pushEndpoint matches your webhook URL
   ```

4. **"historyId too old" fallback**
   - **Cause:** Gmail only keeps ~30 days of history
   - **Automatic:** System falls back to full sync automatically
   - **Prevention:** Ensure account syncs at least once per month

## Coming Soon

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

**Last Updated:** 2025-10-19
**Status:** ✅ Complete - Gmail, Outlook, and SMTP integration fully implemented
