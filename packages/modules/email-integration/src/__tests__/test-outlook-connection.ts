/**
 * Outlook Connection Test Script
 *
 * This script tests the Outlook email connection flow.
 *
 * Prerequisites:
 * 1. Microsoft Azure App Registration with Microsoft Graph API permissions
 * 2. OAuth tokens (access_token and refresh_token)
 *
 * Usage:
 * 1. Set environment variables or update the config below
 * 2. Run: npx ts-node src/__tests__/test-outlook-connection.ts
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { OutlookProvider } from '../infrastructure/providers/OutlookProvider';
import { OutlookConnectionManager } from '../infrastructure/connections/OutlookConnectionManager';
import { EmailAccount } from '../domain/entities/EmailAccount';
import { EmailAddress } from '../domain/value-objects/EmailAddress';
import { EmailProvider } from '../domain/value-objects/EmailProvider';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test Configuration
 *
 * IMPORTANT: Replace these values with your actual credentials
 * DO NOT commit real credentials to git!
 */
const TEST_CONFIG = {
  // User ID (can be any UUID for testing)
  userId: 'test-user-123',

  // Outlook OAuth credentials
  // Get these from: https://portal.azure.com
  credentials: {
    accessToken: process.env.OUTLOOK_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE',
    refreshToken: process.env.OUTLOOK_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN_HERE',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  },

  // Your Outlook email address
  email: process.env.OUTLOOK_EMAIL || 'your-email@outlook.com',

  // Webhook URL (for subscription testing)
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'https://your-domain.com',
};

/**
 * Create Microsoft Graph Client
 */
function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * Test 1: Verify Microsoft Graph API Access
 */
async function testGraphAPIAccess(): Promise<boolean> {
  console.log('\n=== Test 1: Verify Microsoft Graph API Access ===');

  try {
    const client = createGraphClient(TEST_CONFIG.credentials.accessToken);

    // Get user profile to verify authentication
    const user = await client.api('/me').get();

    console.log('✅ Successfully authenticated with Microsoft Graph API');
    console.log(`   User: ${user.displayName} (${user.mail || user.userPrincipalName})`);

    return true;
  } catch (error: any) {
    console.error('❌ Failed to authenticate with Microsoft Graph API');
    console.error(`   Error: ${error.message}`);

    if (error.statusCode === 401) {
      console.error('   → Access token is invalid or expired');
      console.error('   → Please get a new access token from Azure Portal');
    }

    return false;
  }
}

/**
 * Test 2: List Recent Emails
 */
async function testListEmails(): Promise<boolean> {
  console.log('\n=== Test 2: List Recent Emails ===');

  try {
    const provider = new OutlookProvider(createGraphClient);

    // List last 5 emails
    const result = await provider.listEmails(
      TEST_CONFIG.credentials.accessToken,
      undefined,
      5
    );

    if (result.isFail()) {
      console.error('❌ Failed to list emails');
      console.error(`   Error: ${result.error.message}`);
      return false;
    }

    const emails = result.value;

    console.log(`✅ Successfully fetched ${emails.length} emails`);

    if (emails.length > 0) {
      console.log('\n   Recent emails:');
      emails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.subject}`);
        console.log(`      From: ${email.from} (${email.fromName || 'N/A'})`);
        console.log(`      Date: ${email.timestamp.toLocaleString()}`);
        console.log(`      Attachments: ${email.hasAttachments ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   (No emails found in inbox)');
    }

    return true;
  } catch (error: any) {
    console.error('❌ Unexpected error while listing emails');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Fetch Single Email
 */
async function testFetchEmail(): Promise<boolean> {
  console.log('\n=== Test 3: Fetch Single Email (Full Content) ===');

  try {
    const provider = new OutlookProvider(createGraphClient);

    // First, list emails to get a message ID
    const listResult = await provider.listEmails(
      TEST_CONFIG.credentials.accessToken,
      undefined,
      1
    );

    if (listResult.isFail() || listResult.value.length === 0) {
      console.log('⚠️  Skipping test: No emails found in inbox');
      return true;
    }

    const messageId = listResult.value[0].providerMessageId;
    console.log(`   Testing with message ID: ${messageId}`);

    // Fetch full email content
    const fetchResult = await provider.fetchEmail(
      TEST_CONFIG.credentials.accessToken,
      messageId
    );

    if (fetchResult.isFail()) {
      console.error('❌ Failed to fetch email');
      console.error(`   Error: ${fetchResult.error.message}`);
      return false;
    }

    const email = fetchResult.value;

    console.log('✅ Successfully fetched email content');
    console.log(`   Subject: ${email.subject}`);
    console.log(`   From: ${email.from} (${email.fromName || 'N/A'})`);
    console.log(`   To: ${email.to.join(', ')}`);
    console.log(`   Body preview: ${email.bodyText.substring(0, 100)}...`);
    console.log(`   Attachments: ${email.attachments?.length || 0}`);

    return true;
  } catch (error: any) {
    console.error('❌ Unexpected error while fetching email');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Create Webhook Subscription
 */
async function testWebhookSubscription(): Promise<boolean> {
  console.log('\n=== Test 4: Create Webhook Subscription ===');

  try {
    // Create test EmailAccount
    const emailAddressResult = EmailAddress.create(TEST_CONFIG.email);
    if (emailAddressResult.isFail()) {
      console.error('❌ Invalid email address');
      return false;
    }

    const account = EmailAccount.create({
      id: uuidv4(),
      userId: TEST_CONFIG.userId,
      provider: EmailProvider.OUTLOOK,
      emailAddress: emailAddressResult.value,
      encryptedCredentials: JSON.stringify(TEST_CONFIG.credentials),
    });

    // Create connection manager
    const connectionManager = new OutlookConnectionManager(
      createGraphClient,
      TEST_CONFIG.webhookBaseUrl
    );

    // Setup subscription
    const result = await connectionManager.setup(account);

    if (result.isFail()) {
      console.error('❌ Failed to create webhook subscription');
      console.error(`   Error: ${result.error.message}`);

      if (result.error.message.includes('notification')) {
        console.error('\n   ℹ️  This might be because:');
        console.error('      - Webhook URL is not publicly accessible');
        console.error('      - Webhook URL must use HTTPS');
        console.error('      - Microsoft Graph cannot reach your webhook endpoint');
        console.error('\n   For testing, you can skip webhook setup and use polling instead');
      }

      return false;
    }

    console.log('✅ Successfully created webhook subscription');
    console.log(`   Subscription ID: ${account.getProviderData().subscriptionId}`);
    console.log(`   Expires: ${account.getProviderData().subscriptionExpiration}`);

    // Cleanup: Delete subscription
    console.log('\n   Cleaning up: Deleting subscription...');
    const teardownResult = await connectionManager.teardown(account);

    if (teardownResult.isOk()) {
      console.log('   ✅ Subscription deleted successfully');
    } else {
      console.warn('   ⚠️  Failed to delete subscription (you may need to clean up manually)');
    }

    return true;
  } catch (error: any) {
    console.error('❌ Unexpected error while testing webhook subscription');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Check Connection Health
 */
async function testConnectionHealth(): Promise<boolean> {
  console.log('\n=== Test 5: Check Connection Health ===');

  try {
    const client = createGraphClient(TEST_CONFIG.credentials.accessToken);

    // Check if we can list subscriptions
    const subscriptions = await client.api('/subscriptions').get();

    console.log('✅ Connection is healthy');
    console.log(`   Active subscriptions: ${subscriptions.value?.length || 0}`);

    if (subscriptions.value && subscriptions.value.length > 0) {
      console.log('\n   Existing subscriptions:');
      subscriptions.value.forEach((sub: any, index: number) => {
        console.log(`   ${index + 1}. ID: ${sub.id}`);
        console.log(`      Resource: ${sub.resource}`);
        console.log(`      Expires: ${sub.expirationDateTime}`);
      });
    }

    return true;
  } catch (error: any) {
    console.error('❌ Connection health check failed');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        Outlook Email Connection Test Suite               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Validate configuration
  if (TEST_CONFIG.credentials.accessToken === 'YOUR_ACCESS_TOKEN_HERE') {
    console.error('\n❌ ERROR: Please configure your OAuth credentials first!');
    console.error('\n   1. Set environment variables:');
    console.error('      export OUTLOOK_ACCESS_TOKEN="your_access_token"');
    console.error('      export OUTLOOK_REFRESH_TOKEN="your_refresh_token"');
    console.error('      export OUTLOOK_EMAIL="your-email@outlook.com"');
    console.error('\n   2. Or edit TEST_CONFIG in this file');
    console.error('\n   To get OAuth tokens, see: https://docs.microsoft.com/en-us/graph/auth-v2-user');
    process.exit(1);
  }

  const results: boolean[] = [];

  // Run tests sequentially
  results.push(await testGraphAPIAccess());

  if (results[0]) {
    results.push(await testListEmails());
    results.push(await testFetchEmail());
    results.push(await testWebhookSubscription());
    results.push(await testConnectionHealth());
  }

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\n   Tests passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('\n   🎉 All tests passed! Outlook connection is working correctly.');
  } else {
    console.log('\n   ⚠️  Some tests failed. Please check the errors above.');
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { runTests, TEST_CONFIG };
