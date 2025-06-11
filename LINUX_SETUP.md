# Running Paramata on Linux

This guide provides instructions for running the Paramata application on Linux systems.

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- PostgreSQL database

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd paramata
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your database connection details
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

5. Seed the database (optional):
   ```bash
   npm run seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. For production build:
   ```bash
   npm run build
   npm start
   ```

## Troubleshooting

### File Paths

The application uses `path.join()` for all file paths to ensure cross-platform compatibility. If you encounter any file path issues, please report them.

### Logo Files

The application automatically creates placeholder logo files if they don't exist. If you want to use custom logos, place them in the following locations:

- `/public/logo1.png` - Main company logo
- `/public/Honeywell-RAE.png` - Honeywell logo for certificates

### Permissions

If you encounter permission issues:

1. Make sure the application has write access to the `/public` directory:
   ```bash
   chmod -R 755 public
   ```

2. If using a system service to run the application, ensure the service user has appropriate permissions.

## Database Configuration

For PostgreSQL on Linux:

1. Install PostgreSQL:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. Create a database and user:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE paramata;
   CREATE USER paramatauser WITH ENCRYPTED PASSWORD 'yourpassword';
   GRANT ALL PRIVILEGES ON DATABASE paramata TO paramatauser;
   \q
   ```

3. Update your `.env` file with these credentials:
   ```
   DATABASE_URL="postgresql://paramatauser:yourpassword@localhost:5432/paramata"
   ``` 