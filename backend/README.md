# Marketplace Scraper Pro - Backend

Backend API for Marketplace Scraper Pro, providing scraping functionality for Facebook and LinkedIn Marketplaces with APIFY integration and Stripe payments.

## Features

- Scraping API for Facebook and LinkedIn Marketplaces using APIFY
- Payment processing with Stripe Checkout (one-time payments)
- Excel/CSV export functionality
- Admin dashboard for monitoring scraping sessions and payments

## Tech Stack

- Node.js with TypeScript
- Express.js for API endpoints
- APIFY Client for marketplace scraping
- Stripe for payment processing
- ExcelJS for Excel file generation

## Installation

1. Clone the repository
2. Install dependencies:

```bash
cd backend
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Fill in the environment variables in the `.env` file:

```
PORT=3001
NODE_ENV=development
APIFY_API_TOKEN=your_apify_api_token
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
FRONTEND_URL=http://localhost:5173
SESSION_STORAGE=memory
ADMIN_API_KEY=your_admin_api_key
```

5. Build the TypeScript code:

```bash
npm run build
```

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## API Endpoints

### Scraping

- `POST /api/scrape` - Start a new scraping job
  - Request body: `{ url: string, sessionId?: string }`
  - Response: `{ sessionId: string, datasetId: string, actorRunId: string, status: string }`

- `GET /api/scrape/result?sessionId=...` - Get scraping job results
  - Query params: `sessionId`
  - Response: `{ sessionId: string, datasetId: string, status: string, stats: object, isPaid: boolean, previewItems: array }`

### Payment

- `POST /api/create-payment` - Create a Stripe checkout session
  - Request body: `{ packId: string, sessionId: string }`
  - Response: `{ checkoutUrl: string }`

- `POST /api/stripe/webhook` - Handle Stripe webhook events
  - Request body: Stripe event payload
  - Headers: `stripe-signature`

- `GET /api/verify-payment?sessionId=...` - Verify payment status
  - Query params: `sessionId`
  - Response: `{ isPaid: boolean, packId: string }`

### Export

- `GET /api/export?sessionId=...&format=excel` - Export data as Excel/CSV file
  - Query params: `sessionId`, `format` (excel or csv)
  - Response: File download

### Admin

- `GET /api/admin/sessions` - Get all sessions
  - Headers: `x-api-key`
  - Response: `{ sessions: array }`

- `GET /api/admin/sessions/:sessionId` - Get session details by ID
  - Headers: `x-api-key`
  - Response: `{ session: object }`

- `GET /api/admin/stats` - Get dashboard statistics
  - Headers: `x-api-key`
  - Response: `{ totalSessions: number, paidSessions: number, completedSessions: number, failedSessions: number, packStats: object }`

## Frontend Integration

The backend is designed to work with the existing React/TypeScript frontend. The API endpoints match the expected data structure in the frontend hooks.

## Stripe Integration

To test Stripe payments:
1. Create a Stripe account and get API keys
2. Set up webhook endpoints in the Stripe dashboard
3. Use Stripe CLI to test webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

## APIFY Integration

To use APIFY for scraping:
1. Create an APIFY account and get API token
2. Set up the APIFY token in the `.env` file
3. Make sure the actors for Facebook and LinkedIn Marketplace scraping are available in your APIFY account
