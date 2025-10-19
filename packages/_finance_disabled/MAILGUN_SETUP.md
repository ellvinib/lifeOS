# Mailgun Email Integration Setup

This guide explains how to set up automatic invoice processing from emails using Mailgun.

## Overview

When configured, you can forward invoices to a unique email address (e.g., `invoices@your-domain.com`), and LifeOS will automatically:
1. Extract PDF attachments
2. Use AI to extract invoice data
3. Match to bank transactions
4. Notify you of processing results

## Prerequisites

- Mailgun account (free tier: 5,000 emails/month)
- Domain name (or use Mailgun's sandbox domain for testing)
- LifeOS API server running and accessible from the internet

## Step-by-Step Setup

### 1. Create Mailgun Account

1. Go to [mailgun.com](https://www.mailgun.com/)
2. Sign up for free account
3. Verify your email address

### 2. Add and Verify Domain

**Option A: Use Your Own Domain (Recommended for production)**

1. In Mailgun dashboard, go to **Sending** → **Domains**
2. Click **Add New Domain**
3. Enter your domain (e.g., `mail.yourdomain.com`)
4. Add the provided DNS records to your domain:
   - TXT record for verification
   - MX records for receiving email
   - CNAME records for sending
5. Wait for DNS propagation (can take up to 48 hours)
6. Verify domain in Mailgun dashboard

**Option B: Use Mailgun Sandbox Domain (For testing)**

1. Use the sandbox domain provided by Mailgun
2. Add authorized recipients (your email) in sandbox settings
3. Note: Limited to 300 emails/day and only sends to authorized recipients

### 3. Create Email Route

1. In Mailgun dashboard, go to **Sending** → **Routes**
2. Click **Create Route**
3. Configure route:
   - **Expression Type**: Match Recipient
   - **Recipient**: `invoices@yourdomain.com` (or your chosen email)
   - **Actions**: 
     - Check "Forward"
     - **Forward URL**: `https://your-api-domain.com/api/finance/webhooks/mailgun`
     - Check "Stop"
4. **Priority**: 0 (highest)
5. **Description**: "Forward invoice emails to LifeOS"
6. Click **Create Route**

### 4. Get Webhook Signing Key

1. In Mailgun dashboard, go to **Settings** → **Security & Users** → **API Security**
2. Find your **HTTP webhook signing key**
3. Copy this key - you'll need it for `.env` configuration

### 5. Configure LifeOS Environment

Add to your `.env` file:

```env
# Mailgun Configuration
MAILGUN_SIGNING_KEY=your-webhook-signing-key-here
MAILGUN_API_KEY=your-api-key-here  # Optional, for sending emails

# Ensure your API is accessible
# For local development, use ngrok or similar tunnel
# For production, use your domain
```

### 6. Verify Webhook Endpoint

Test that your webhook is accessible:

```bash
curl https://your-api-domain.com/api/finance/webhooks/mailgun

# Should return:
# {
#   "success": true,
#   "message": "Mailgun webhook endpoint is active"
# }
```

### 7. Test Email Processing

Send a test email:

1. Attach a PDF invoice
2. Send to `invoices@yourdomain.com`
3. Check LifeOS logs for processing status
4. Verify invoice created in LifeOS dashboard

## Local Development Setup

For local testing, use [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Start your LifeOS server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this URL in Mailgun route: https://abc123.ngrok.io/api/finance/webhooks/mailgun
```

## Email Format Requirements

### Supported Attachments
- **PDF files only** (other files are ignored)
- Maximum **25MB** per email
- Maximum **20 attachments** per email

### Recommended Email Format

```
Subject: Invoice #12345 from Acme Corp
Body: Please find attached invoice for services rendered.
Attachments: invoice-12345.pdf
```

**Tips:**
- Include invoice number in subject for better tracking
- Vendor name in subject helps with matching
- Multiple PDFs in one email are all processed

## Troubleshooting

### Email Not Being Processed

1. **Check Mailgun Route**
   - Verify route is active
   - Verify URL is correct (include https://)
   - Check route priority (should be 0)

2. **Check Webhook Signature**
   - Verify `MAILGUN_SIGNING_KEY` in `.env` is correct
   - Check LifeOS logs for signature verification errors

3. **Check API Accessibility**
   - Ensure API server is running
   - Verify firewall allows incoming traffic
   - Test webhook endpoint with curl

4. **Check Logs**
   ```bash
   # View LifeOS logs
   docker-compose logs -f api
   
   # View Mailgun delivery logs
   # Go to Mailgun dashboard → Logs → Delivery Logs
   ```

### Common Errors

**"Invalid signature"**
- Wrong webhook signing key in `.env`
- Clock skew (check server time)

**"No PDF attachments found"**
- Email doesn't contain PDF files
- PDF is corrupted or invalid

**"Failed to extract invoice data"**
- Gemini API key not configured
- PDF quality too poor for AI extraction
- API quota exceeded

## Security Considerations

1. **Always use HTTPS** for webhook URL
2. **Verify signatures** - Don't disable signature verification
3. **Limit email addresses** - Only forward from trusted sources
4. **Monitor usage** - Set up alerts for unusual activity
5. **Rotate keys** - Periodically rotate API keys and signing keys

## Pricing

### Mailgun Free Tier
- **5,000 emails/month** free
- **300 sandbox emails/day**
- Upgrade for higher limits

### LifeOS Usage
- ~30 invoices/month = well within free tier
- Each email counts as 1 email (regardless of attachment count)

## Advanced Configuration

### Filtering by Sender

Only process emails from specific senders:

```python
# Mailgun route expression
match_recipient("invoices@yourdomain.com") and 
match_header("from", ".*@trusted-vendor.com")
```

### Multiple Invoice Addresses

Create separate routes for different workflows:
- `invoices@yourdomain.com` → Auto-process everything
- `receipts@yourdomain.com` → Mark as receipts
- `quotes@yourdomain.com` → Mark as quotes

### Custom Processing

Add metadata via email subject:

```
Subject: [CLIENT:Acme] Invoice #12345

# LifeOS can parse this to:
# - Client: Acme
# - Invoice: 12345
```

## Support

- **Mailgun Docs**: https://documentation.mailgun.com/
- **LifeOS Issues**: https://github.com/yourusername/lifeos/issues
- **Community**: Discord/Slack channel

## Next Steps

After setup:
1. Test with a sample invoice PDF
2. Configure Gemini API for AI extraction
3. Import bank transactions for matching
4. Review and confirm suggested matches
5. Set up monthly reconciliation reports

---

Last updated: 2025-01-21
