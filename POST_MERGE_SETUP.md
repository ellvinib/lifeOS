# Post-Merge Setup Instructions

## ✅ Completed
- [x] Pull latest changes from master
- [x] Generate Prisma client

## 📋 Manual Steps Required

### Option 1: Create Migration (Recommended for Production)

Run this command **in your terminal** (not through Claude):

```bash
cd /Users/vincentbouillart/ai-git/lifeOS/packages/api
pnpm prisma migrate dev --name add-advertising-models
```

This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your database
- Generate the Prisma client

### Option 2: Push Schema Directly (Quick for Development)

If you just want to test the feature quickly:

```bash
cd /Users/vincentbouillart/ai-git/lifeOS/packages/api
pnpm prisma db push
```

This will:
- Push the schema changes directly to the database
- Skip creating a migration file (useful for rapid prototyping)

---

## 🧪 Optional: Run E2E Tests

After the database migration:

```bash
# Run all E2E tests
cd /Users/vincentbouillart/ai-git/lifeOS
pnpm test:e2e

# Or run in UI mode (interactive)
pnpm test:e2e:ui

# Or run just the advertising tests
pnpm test:e2e tests/e2e/finance/advertising-campaign.spec.ts
```

---

## 🗃️ Database Schema Changes

The following tables will be created:

### 1. `advertising_campaigns`
- Campaign management with lifecycle tracking
- Columns: id, name, description, platform, status, startDate, endDate, totalBudget, currency, targetAudience, objectives, tags, metadata, createdAt, updatedAt
- Indexes: platform, status, startDate, endDate

### 2. `advertising_expenses`
- Expense tracking with performance metrics
- Columns: id, campaignId (FK), date, amount, currency, platform, adType, description, impressions, clicks, conversions, revenue, likes, shares, comments, videoViews, targetAudience, ageRange, location, creativeUrl, landingPageUrl, notes, tags, metadata, createdAt, updatedAt
- Indexes: campaignId, date, platform, adType

---

## 🚀 Next Steps After Migration

1. **Verify migration**: Check that tables were created
   ```bash
   cd packages/api
   pnpm prisma studio
   ```
   This opens Prisma Studio where you can view your database tables.

2. **Test the API** (if server is running):
   - Create a campaign: `POST /api/advertising/campaigns`
   - Create an expense: `POST /api/advertising/expenses`
   - Get ROI analytics: `GET /api/advertising/campaigns/:id/roi`

3. **Optional - Seed test data**:
   ```bash
   cd packages/api
   pnpm db:seed
   ```

---

## 📊 Expected Database State

After successful migration, you should have:
- ✅ `advertising_campaigns` table with proper indexes
- ✅ `advertising_expenses` table with foreign key to campaigns
- ✅ All existing tables preserved (no data loss)

---

## 🔧 Troubleshooting

**If migration fails:**
1. Check database is running:
   ```bash
   docker ps | grep postgres
   ```

2. Check connection:
   ```bash
   cd packages/api
   pnpm prisma db pull
   ```

3. Reset database (⚠️ CAUTION: Deletes all data):
   ```bash
   cd packages/api
   pnpm prisma migrate reset
   ```

**If you get "Table already exists" error:**
The tables might have been created already. Check with:
```bash
cd packages/api
pnpm prisma studio
```

---

## ✨ What You Can Do Now

Once migration is complete, you can:

1. **Create advertising campaigns** via API
2. **Track expenses** with performance metrics
3. **View ROI analytics** for campaigns
4. **Run E2E tests** to verify everything works

Example API call (using curl):
```bash
curl -X POST http://localhost:4000/api/advertising/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q4 2025 Product Launch",
    "platform": "google_ads",
    "startDate": "2025-10-01T00:00:00Z",
    "totalBudget": 50000
  }'
```

---

**Status**: 🟡 Awaiting manual database migration
**Next Command**: Run `pnpm prisma migrate dev --name add-advertising-models` in your terminal
