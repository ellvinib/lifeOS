#!/bin/bash

###############################################################################
# Azure App Registration Setup Script for LifeOS Email Integration (Outlook)
#
# This script automates the creation of an Azure AD App Registration
# required for Outlook/Office 365 email integration.
#
# Prerequisites:
# - Azure CLI installed (brew install azure-cli)
# - Azure account with permissions to create app registrations
#
# Usage:
#   chmod +x setup-azure-outlook.sh
#   ./setup-azure-outlook.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_header() { echo -e "\n${BLUE}==================================================${NC}"; echo -e "${BLUE}$1${NC}"; echo -e "${BLUE}==================================================${NC}\n"; }

###############################################################################
# Step 1: Check Prerequisites
###############################################################################

print_header "Checking Prerequisites"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed"
    echo ""
    echo "Install with:"
    echo "  macOS:   brew install azure-cli"
    echo "  Linux:   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    echo "  Windows: Download from https://aka.ms/installazurecliwindows"
    exit 1
fi

print_success "Azure CLI is installed ($(az version --query '"azure-cli"' -o tsv))"

# Check if logged in
if ! az account show &> /dev/null; then
    print_warning "Not logged into Azure"
    print_info "Opening browser for login..."
    az login
fi

# Get current account info
TENANT_NAME=$(az account show --query "name" -o tsv)
TENANT_ID=$(az account show --query "tenantId" -o tsv)
USER_EMAIL=$(az account show --query "user.name" -o tsv)

print_success "Logged in as: $USER_EMAIL"
print_info "Tenant: $TENANT_NAME"
print_info "Tenant ID: $TENANT_ID"

###############################################################################
# Step 2: Get Configuration from User
###############################################################################

print_header "Configuration"

APP_NAME="LifeOS Email Integration"

# Ask for redirect URI
echo ""
echo "What is your redirect URI?"
echo ""
echo "Examples:"
echo "  Local development:  http://localhost:3000/api/auth/outlook/callback"
echo "  Production:         https://your-domain.com/api/auth/outlook/callback"
echo ""
read -p "Enter redirect URI: " REDIRECT_URI

if [ -z "$REDIRECT_URI" ]; then
    print_error "Redirect URI is required"
    exit 1
fi

# Ask for webhook base URL
echo ""
echo "What is your webhook base URL?"
echo ""
echo "Examples:"
echo "  Local (with ngrok): https://abc123.ngrok.io"
echo "  Production:         https://your-domain.com"
echo ""
read -p "Enter webhook base URL: " WEBHOOK_BASE_URL

if [ -z "$WEBHOOK_BASE_URL" ]; then
    print_error "Webhook base URL is required"
    exit 1
fi

# Confirmation
echo ""
print_info "Configuration:"
echo "  App Name:         $APP_NAME"
echo "  Redirect URI:     $REDIRECT_URI"
echo "  Webhook URL:      $WEBHOOK_BASE_URL/api/email/webhooks/outlook"
echo ""
read -p "Proceed with these settings? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    print_warning "Cancelled by user"
    exit 0
fi

###############################################################################
# Step 3: Create App Registration
###############################################################################

print_header "Creating Azure App Registration"

print_info "Creating app registration: $APP_NAME"

# Create the app registration
APP_ID=$(az ad app create \
  --display-name "$APP_NAME" \
  --sign-in-audience "AzureADandPersonalMicrosoftAccount" \
  --web-redirect-uris "$REDIRECT_URI" \
  --query appId \
  -o tsv)

if [ -z "$APP_ID" ]; then
    print_error "Failed to create app registration"
    exit 1
fi

print_success "App registration created"
print_info "Application (Client) ID: $APP_ID"

# Wait for app to be fully created
sleep 5

###############################################################################
# Step 4: Create Client Secret
###############################################################################

print_header "Creating Client Secret"

print_info "Generating client secret (valid for 24 months)..."

# Create client secret (valid for 2 years)
SECRET_OUTPUT=$(az ad app credential reset \
  --id $APP_ID \
  --append \
  --years 2 \
  --query password \
  -o tsv)

if [ -z "$SECRET_OUTPUT" ]; then
    print_error "Failed to create client secret"
    exit 1
fi

CLIENT_SECRET="$SECRET_OUTPUT"

print_success "Client secret created"
print_warning "SAVE THIS SECRET - You won't be able to see it again!"

###############################################################################
# Step 5: Add Microsoft Graph API Permissions
###############################################################################

print_header "Adding Microsoft Graph API Permissions"

# Microsoft Graph API ID: 00000003-0000-0000-c000-000000000000
# Mail.Read permission ID: 810c84a8-4a9e-49e6-bf7d-12d183f40d01 (Delegated)
# Mail.ReadWrite permission ID: e2a3a72e-5f79-4c64-b1b1-878b674786c9 (Delegated)

print_info "Adding Mail.Read permission..."
az ad app permission add \
  --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions 810c84a8-4a9e-49e6-bf7d-12d183f40d01=Scope \
  > /dev/null 2>&1

print_success "Mail.Read permission added"

print_info "Adding Mail.ReadWrite permission..."
az ad app permission add \
  --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions e2a3a72e-5f79-4c64-b1b1-878b674786c9=Scope \
  > /dev/null 2>&1

print_success "Mail.ReadWrite permission added"

# Wait for permissions to propagate
sleep 3

###############################################################################
# Step 6: Grant Admin Consent (Optional)
###############################################################################

print_header "Admin Consent"

echo ""
echo "Do you want to grant admin consent now?"
echo ""
echo "If you skip this, users will see a consent prompt when they first log in."
echo "If you grant it now, users won't need to consent individually."
echo ""
read -p "Grant admin consent? (y/n): " GRANT_CONSENT

if [ "$GRANT_CONSENT" = "y" ] || [ "$GRANT_CONSENT" = "Y" ]; then
    print_info "Granting admin consent..."

    if az ad app permission admin-consent --id $APP_ID 2>&1; then
        print_success "Admin consent granted"
    else
        print_warning "Failed to grant admin consent (you may not have admin privileges)"
        print_info "You can grant consent later in the Azure Portal or users will be prompted"
    fi
else
    print_info "Skipping admin consent"
    print_warning "Users will need to consent when they first authenticate"
fi

###############################################################################
# Step 7: Create .env File
###############################################################################

print_header "Creating .env Configuration"

ENV_FILE=".env.outlook"

cat > "$ENV_FILE" << EOF
# ========================================
# Outlook/Office 365 Email Integration
# ========================================
# Generated: $(date)
# App Registration: $APP_NAME
# Application ID: $APP_ID
# Tenant ID: $TENANT_ID

# Microsoft Graph API Credentials
MICROSOFT_CLIENT_ID=$APP_ID
MICROSOFT_CLIENT_SECRET=$CLIENT_SECRET
MICROSOFT_REDIRECT_URI=$REDIRECT_URI

# Webhook Configuration
WEBHOOK_BASE_URL=$WEBHOOK_BASE_URL

# Optional: Redis for background jobs
REDIS_URL=redis://localhost:6379
EOF

print_success ".env configuration saved to: $ENV_FILE"

###############################################################################
# Step 8: Summary & Next Steps
###############################################################################

print_header "🎉 Setup Complete!"

echo ""
echo "Azure App Registration Details:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Application Name:    $APP_NAME"
print_info "Application ID:      $APP_ID"
print_info "Tenant ID:           $TENANT_ID"
print_info "Redirect URI:        $REDIRECT_URI"
print_info "Webhook Endpoint:    $WEBHOOK_BASE_URL/api/email/webhooks/outlook"
echo ""
echo "Client Secret:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_warning "$CLIENT_SECRET"
echo ""
print_warning "⚠️  IMPORTANT: Save this secret in a secure location!"
print_warning "⚠️  You will NOT be able to retrieve it again from Azure."
echo ""

echo "Permissions Configured:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Mail.Read (Delegated)"
print_success "Mail.ReadWrite (Delegated)"
echo ""

echo "Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Copy environment variables to your main .env file:"
echo "   ${GREEN}cat $ENV_FILE >> ../../.env${NC}"
echo ""
echo "2. Or manually add them to your .env:"
echo "   ${BLUE}MICROSOFT_CLIENT_ID=$APP_ID${NC}"
echo "   ${BLUE}MICROSOFT_CLIENT_SECRET=$CLIENT_SECRET${NC}"
echo "   ${BLUE}MICROSOFT_REDIRECT_URI=$REDIRECT_URI${NC}"
echo "   ${BLUE}WEBHOOK_BASE_URL=$WEBHOOK_BASE_URL${NC}"
echo ""
echo "3. Test the OAuth flow:"
echo "   ${GREEN}# Frontend: Redirect user to Microsoft login${NC}"
echo "   ${GREEN}# Backend: Exchange code for tokens${NC}"
echo "   ${GREEN}# Call: POST /api/email/accounts/connect${NC}"
echo ""
echo "4. Verify webhook endpoint is accessible:"
echo "   ${GREEN}curl -I $WEBHOOK_BASE_URL/api/email/webhooks/outlook${NC}"
echo ""
echo "5. View your app in Azure Portal:"
echo "   ${BLUE}https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/$APP_ID${NC}"
echo ""

print_success "Setup script completed successfully! 🚀"
echo ""
