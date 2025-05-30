This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Recurring Schedules

The system supports recurring inventory schedules that can be set to repeat monthly or yearly. These schedules will automatically send notifications to users when they are due.

### Setting Up the Cron Job

To ensure recurring schedules work properly, you need to set up a cron job to run the schedule processor. This can be done using a cron service like cron-job.org, GitHub Actions, or a simple script on your server.

#### Using a Cron Service

Set up a cron job to call the following endpoint daily:

```
https://your-domain.com/api/cron/inventory-schedules?key=YOUR_CRON_API_KEY
```

You should set the `CRON_API_KEY` environment variable in your `.env` file for security:

```
CRON_API_KEY=your-secure-random-key
```

#### Local Development Testing

To test the recurring schedules locally, you can manually trigger the cron job by visiting:

```
http://localhost:3000/api/cron/inventory-schedules?key=YOUR_CRON_API_KEY
```

This will process all due recurring schedules, update their next occurrence date, and send notifications to users.
