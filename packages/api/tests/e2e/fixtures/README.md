# Test Fixtures

This directory contains test data for E2E tests.

## Files

### CSV Files
- **sample-transactions.csv** - Belgian bank CSV with 10 sample transactions
  - Format: Belfius/KBC/ING compatible
  - Contains realistic vendor names and amounts
  - Includes invoice references in descriptions

### PDF Invoices

PDF invoice files should be placed here for testing. You can:

1. **Use real invoices** (with sensitive data removed)
2. **Generate test PDFs** using the provided script
3. **Download sample invoices** from the web

#### Generating Test PDFs

Install PDF generation library:
```bash
npm install --save-dev pdfkit
```

Run the generation script:
```bash
node generate-test-invoices.js
```

This creates:
- `sample-invoice-1.pdf` - Standard invoice (€329.95)
- `sample-invoice-2.pdf` - Invoice with line items (€1,250.00)
- `sample-invoice-3.pdf` - Invoice with VAT details (€750.00)

#### Manual PDF Creation

You can also create test PDFs manually:

1. Open any word processor (Word, Google Docs, LibreOffice)
2. Create a simple invoice with:
   - Company name and address
   - Invoice number (e.g., INV-2024-001)
   - Date
   - Line items
   - Subtotal, VAT (21%), Total
3. Save as PDF
4. Place in this directory

### Expected PDFs for Tests

The E2E tests expect these files:
- `sample-invoice-acme-hosting.pdf` - Matches €329.95 transaction
- `sample-invoice-software-solutions.pdf` - Matches €1,250.00 transaction
- `sample-invoice-marketing-agency.pdf` - Matches €750.00 transaction

## Sample Invoice Data

For Gemini Flash AI extraction, PDFs should contain:

### Invoice 1 - ACME Hosting Services
```
ACME HOSTING SERVICES
123 Server Street, Brussels, Belgium
VAT: BE0123456789

INVOICE #2024-1234
Date: November 20, 2024
Due Date: December 20, 2024

Client: Your Company
Client VAT: BE9876543210

Description                 Amount
Web Hosting - Annual        €272.69
Domain Registration         €57.26
Subtotal                    €329.95
VAT (21%)                   €69.29
TOTAL                       €399.24

Payment Reference: +++123/4567/89012+++
```

### Invoice 2 - Software Solutions
```
SOFTWARE SOLUTIONS BVBA
456 Tech Avenue, Antwerp, Belgium
VAT: BE1122334455

INVOICE #INV-2024-456
Date: November 14, 2024
Due Date: December 14, 2024

Client: Your Company

Description                      Qty    Price      Amount
Custom Software Development      40h    €30.00     €1,200.00
Project Management               5h     €50.00     €250.00
                                                   ----------
Subtotal                                           €1,450.00
VAT (21%)                                          €304.50
TOTAL                                              €1,754.50
```

### Invoice 3 - Marketing Agency
```
MARKETING AGENCY SPRL
789 Creative Boulevard, Ghent, Belgium
VAT: BE9988776655

FACTUUR F-2024-789
Datum: November 11, 2024
Vervaldatum: December 11, 2024

Klant: Your Company

Omschrijving                Amount
Social Media Campagne       €620.00
Content Creation            €130.00
                            --------
Subtotaal                   €750.00
BTW (21%)                   €157.50
TOTAAL                      €907.50
```

## Using Fixtures in Tests

```typescript
import * as path from 'path';

// CSV file
const csvPath = path.join(__dirname, 'fixtures', 'sample-transactions.csv');

// PDF file
const pdfPath = path.join(__dirname, 'fixtures', 'sample-invoice-1.pdf');

// In test
await api.uploadInvoice(pdfPath, 'MANUAL');
await api.importTransactions(csvPath, bankAccountId);
```

## Data Consistency

Ensure test data is consistent:
- Transaction amounts should match invoice totals
- Dates should be within matching window (±7 days)
- Vendor names should be similar enough for fuzzy matching
- Invoice references in CSV descriptions should match invoice numbers
