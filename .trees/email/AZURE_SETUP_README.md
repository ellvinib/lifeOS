# Azure Setup for Outlook Integration

This directory contains an automated script to create the Azure App Registration required for Outlook/Office 365 email integration in LifeOS.

## Quick Start

```bash
# 1. Make sure you have Azure CLI installed
brew install azure-cli  # macOS
# OR
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux

# 2. Run the setup script
./setup-azure-outlook.sh

# 3. Follow the prompts to configure your app
```

## What the Script Does

The script automates the following steps:

1. ✅ **Checks Prerequisites**
   - Verifies Azure CLI is installed
   - Logs you into Azure (if not already)
   - Shows your current tenant and user

2. ✅ **Creates App Registration**
   - Name: "LifeOS Email Integration"
   - Supports: Personal Microsoft accounts + Azure AD accounts
   - Configures redirect URI for OAuth callback

3. ✅ **Generates Client Secret**
   - Creates a 24-month client secret
   - **⚠️ Saves it to `.env.outlook` file (KEEP THIS SECURE!)**

4. ✅ **Adds API Permissions**
   - `Mail.Read` (Delegated)
   - `Mail.ReadWrite` (Delegated)

5. ✅ **Optional Admin Consent**
   - Grants admin consent if you have permissions
   - Otherwise, users will be prompted individually

6. ✅ **Creates .env File**
   - Saves all credentials to `.env.outlook`
   - Ready to copy into your main `.env`

## Prerequisites

### 1. Azure CLI

**macOS:**
```bash
brew install azure-cli
```

**Linux:**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

**Windows:**
Download from: https://aka.ms/installazurecliwindows

### 2. Azure Account

You need:
- A Microsoft account (Outlook.com, Office 365, etc.)
- Permissions to create app registrations in Azure AD
- For admin consent: Global Administrator or Application Administrator role

### 3. Redirect URI

Decide where users will be redirected after OAuth:
- **Local development:** `http://localhost:3000/api/auth/outlook/callback`
- **Production:** `https://your-domain.com/api/auth/outlook/callback`

### 4. Webhook URL

Your webhook must be publicly accessible via HTTPS:
- **Local testing:** Use ngrok (`https://abc123.ngrok.io`)
- **Production:** Your actual domain (`https://your-domain.com`)

## Running the Script

```bash
./setup-azure-outlook.sh
```

### Example Output

```
==================================================
Checking Prerequisites
==================================================

✅ Azure CLI is installed (2.61.0)
✅ Logged in as: your.email@company.com
ℹ️  Tenant: Your Company
ℹ️  Tenant ID: 12345678-1234-1234-1234-123456789012

==================================================
Configuration
==================================================

What is your redirect URI?

Examples:
  Local development:  http://localhost:3000/api/auth/outlook/callback
  Production:         https://your-domain.com/api/auth/outlook/callback

Enter redirect URI: http://localhost:3000/api/auth/outlook/callback

What is your webhook base URL?

Examples:
  Local (with ngrok): https://abc123.ngrok.io
  Production:         https://your-domain.com

Enter webhook base URL: https://abc123.ngrok.io

ℹ️  Configuration:
  App Name:         LifeOS Email Integration
  Redirect URI:     http://localhost:3000/api/auth/outlook/callback
  Webhook URL:      https://abc123.ngrok.io/api/email/webhooks/outlook

Proceed with these settings? (y/n): y

==================================================
Creating Azure App Registration
==================================================

ℹ️  Creating app registration: LifeOS Email Integration
✅ App registration created
ℹ️  Application (Client) ID: 87654321-4321-4321-4321-210987654321

==================================================
Creating Client Secret
==================================================

ℹ️  Generating client secret (valid for 24 months)...
✅ Client secret created
⚠️  SAVE THIS SECRET - You won't be able to see it again!

==================================================
Adding Microsoft Graph API Permissions
==================================================

ℹ️  Adding Mail.Read permission...
✅ Mail.Read permission added
ℹ️  Adding Mail.ReadWrite permission...
✅ Mail.ReadWrite permission added

==================================================
Admin Consent
==================================================

Do you want to grant admin consent now?

If you skip this, users will see a consent prompt when they first log in.
If you grant it now, users won't need to consent individually.

Grant admin consent? (y/n): y
ℹ️  Granting admin consent...
✅ Admin consent granted

==================================================
Creating .env Configuration
==================================================

✅ .env configuration saved to: .env.outlook

==================================================
🎉 Setup Complete!
==================================================

Azure App Registration Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Application Name:    LifeOS Email Integration
ℹ️  Application ID:      87654321-4321-4321-4321-210987654321
ℹ️  Tenant ID:           12345678-1234-1234-1234-123456789012
ℹ️  Redirect URI:        http://localhost:3000/api/auth/outlook/callback
ℹ️  Webhook Endpoint:    https://abc123.ngrok.io/api/email/webhooks/outlook

Client Secret:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  abc123def456ghi789jkl012mno345pqr678stu901vwx234

⚠️  IMPORTANT: Save this secret in a secure location!
⚠️  You will NOT be able to retrieve it again from Azure.

Permissions Configured:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Mail.Read (Delegated)
✅ Mail.ReadWrite (Delegated)

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Copy environment variables to your main .env file:
   cat .env.outlook >> ../../.env

2. Or manually add them to your .env:
   MICROSOFT_CLIENT_ID=87654321-4321-4321-4321-210987654321
   MICROSOFT_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234
   MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/outlook/callback
   WEBHOOK_BASE_URL=https://abc123.ngrok.io

3. Test the OAuth flow:
   # Frontend: Redirect user to Microsoft login
   # Backend: Exchange code for tokens
   # Call: POST /api/email/accounts/connect

4. Verify webhook endpoint is accessible:
   curl -I https://abc123.ngrok.io/api/email/webhooks/outlook

5. View your app in Azure Portal:
   https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/87654321-4321-4321-4321-210987654321

✅ Setup script completed successfully! 🚀
```

## After Running the Script

### 1. Save Your Credentials

The script creates a `.env.outlook` file with your credentials. **DO NOT commit this to Git!**

```bash
# Copy to main .env
cat .env.outlook >> ../../.env

# Secure the file
chmod 600 .env.outlook

# Add to .gitignore (if not already)
echo ".env.outlook" >> ../../.gitignore
```

### 2. Test the Setup

**Check the app in Azure Portal:**
```bash
# The script outputs a direct link to your app
# Click it to verify everything looks correct
```

**Test OAuth flow:**
```bash
# Redirect user to Microsoft login
open "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI&scope=Mail.Read%20Mail.ReadWrite%20offline_access&response_mode=query"
```

### 3. Connect Your First Account

```bash
# Use the credentials from .env.outlook
curl -X POST http://localhost:3000/api/email/accounts/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "provider": "outlook",
    "email": "user@outlook.com",
    "credentials": {
      "accessToken": "eyJ0eXAi...",
      "refreshToken": "M.R3_BAY...",
      "expiresAt": "2025-10-19T13:00:00Z"
    }
  }'
```

## Troubleshooting

### "az: command not found"

Azure CLI is not installed.

**Fix:**
```bash
# macOS
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify
az version
```

### "You do not have permission to create applications"

Your Azure AD account doesn't have permission to create app registrations.

**Fix:**
- Ask your Azure AD administrator to grant you the **Application Developer** role
- Or have an admin run the script for you

### "Admin consent failed"

You don't have Global Administrator or Application Administrator role.

**Fix:**
- Skip admin consent (users will be prompted individually)
- Or ask your admin to grant consent in Azure Portal:
  1. Go to Azure Portal → App registrations
  2. Find "LifeOS Email Integration"
  3. Click "API permissions"
  4. Click "Grant admin consent for [your org]"

### "Webhook validation failed"

Microsoft can't reach your webhook endpoint.

**Fix for local development:**
```bash
# 1. Install ngrok
brew install ngrok

# 2. Start ngrok
ngrok http 3000

# 3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# 4. Re-run the script with this URL as webhook base
```

### "Invalid redirect URI"

The redirect URI format is incorrect.

**Fix:**
- Must be absolute URL (include protocol: `http://` or `https://`)
- Must match exactly in your OAuth flow
- For production, must use HTTPS

### Need to Update Configuration?

You can re-run the script, or manually update in Azure Portal:

1. Go to: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps
2. Find "LifeOS Email Integration"
3. Update:
   - **Authentication** → Redirect URIs
   - **Certificates & secrets** → New client secret
   - **API permissions** → Add/remove permissions

## Security Best Practices

### 1. Protect Your Client Secret

```bash
# ⚠️ NEVER commit .env files to Git
echo ".env*" >> .gitignore

# Restrict file permissions
chmod 600 .env.outlook
```

### 2. Use Different Apps for Environments

Create separate app registrations:
- **Development:** `LifeOS Email Integration (Dev)`
- **Staging:** `LifeOS Email Integration (Staging)`
- **Production:** `LifeOS Email Integration (Production)`

### 3. Rotate Secrets Regularly

```bash
# Every 12-24 months, create new secret
az ad app credential reset --id YOUR_APP_ID --append --years 2

# Update .env with new secret
# Remove old secret after updating all environments
```

### 4. Monitor API Usage

Check Azure Portal for:
- Sign-in logs
- API call volume
- Failed authentication attempts

## Support

If you encounter issues:

1. Check the [Azure documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
2. Verify your Azure account permissions
3. Review the script output for error messages
4. Check the generated `.env.outlook` file for correct values

## Manual Setup (Alternative)

If you prefer to set up manually without the script, see: [README.md](../../packages/modules/email-integration/README.md#outlook-integration) in the email-integration module.

---

**Created:** 2025-10-19
**Script:** `setup-azure-outlook.sh`
**Module:** `@lifeOS/email-integration`
