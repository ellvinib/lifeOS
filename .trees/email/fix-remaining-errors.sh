#!/bin/bash

EMAIL_MODULE="/Users/vincentbouillart/ai-git/lifeOS/packages/modules/email-integration"

echo "🔧 Fixing remaining compilation errors..."

# Fix unused messageId variable
echo "✓ Fixing EmailSyncJob unused variable..."
sed -i '' 's/const { fullSync } = job.data;/const { messageId, fullSync } = job.data; \/\/ messageId for future use/' \
  "$EMAIL_MODULE/src/infrastructure/jobs/EmailSyncJob.ts"

# Fix DatabaseError casts in EmailAccountRepository
echo "✓ Fixing DatabaseError casts..."
sed -i '' 's/new DatabaseError(\([^,]*\), error,/new DatabaseError(\1, error as Error,/g' \
  "$EMAIL_MODULE/src/infrastructure/repositories/EmailAccountRepository.ts"

sed -i '' 's/new DatabaseError(\([^,]*\), error)/new DatabaseError(\1, error as Error)/g' \
  "$EMAIL_MODULE/src/infrastructure/repositories/EmailAccountRepository.ts"

# Fix DatabaseError casts in EmailRepository
sed -i '' 's/new DatabaseError(\([^,]*\), error,/new DatabaseError(\1, error as Error,/g' \
  "$EMAIL_MODULE/src/infrastructure/repositories/EmailRepository.ts"

sed -i '' 's/new DatabaseError(\([^,]*\), error)/new DatabaseError(\1, error as Error)/g' \
  "$EMAIL_MODULE/src/infrastructure/repositories/EmailRepository.ts"

echo "✅ Script fixes applied!"
