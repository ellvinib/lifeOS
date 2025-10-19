#!/bin/bash

###############################################################################
# Fix Email Integration Compilation Errors
# This script fixes the simple compilation errors automatically
###############################################################################

set -e

EMAIL_MODULE="/Users/vincentbouillart/ai-git/lifeOS/packages/modules/email-integration"

echo "🔧 Fixing Email Integration Module Compilation Errors..."
echo ""

# Fix 1: Remove unused NotFoundError imports
echo "✓ Removing unused NotFoundError imports..."
sed -i '' 's/import { BaseError, NotFoundError, BusinessRuleError }/import { BaseError, BusinessRuleError }/' \
  "$EMAIL_MODULE/src/application/use-cases/DisconnectAccountUseCase.ts"

sed -i '' '/^import { NotFoundError } from/d' \
  "$EMAIL_MODULE/src/application/use-cases/GetEmailUseCase.ts"

sed -i '' '/^import { NotFoundError } from/d' \
  "$EMAIL_MODULE/src/application/use-cases/SyncEmailsUseCase.ts"

# Fix 2: Remove unused messageId variable
echo "✓ Fixing unused messageId..."
sed -i '' 's/const { messageId, fullSync }/const { fullSync }/' \
  "$EMAIL_MODULE/src/infrastructure/jobs/EmailSyncJob.ts"

# Fix 3: Add explicit any type annotations
echo "✓ Adding explicit type annotations..."
sed -i '' 's/(att) =>/(att: any) =>/' \
  "$EMAIL_MODULE/src/infrastructure/providers/SmtpProvider.ts"

# Fix 4: Fix DatabaseError error casts
echo "✓ Fixing DatabaseError constructor calls..."
find "$EMAIL_MODULE/src/infrastructure/repositories" -name "*.ts" -exec \
  sed -i '' 's/new DatabaseError(\([^,]*\), \(error\))/new DatabaseError(\1, \2 as Error)/g' {} \;

echo ""
echo "✅ Simple fixes applied!"
echo ""
echo "Next: Manual fixes required for:"
echo "  - Repository interface mismatches"
echo "  - Event publishing (add id, timestamp, version)"
echo "  - Duplicate exports"
echo "  - BullMQ API changes"
