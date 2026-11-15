import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment files if present using Node.js 22 built-in
for (const envFile of ['.env', 'backend/.env']) {
  const fullPath = path.join(__dirname, envFile);
  if (fs.existsSync(fullPath)) {
    try {
      process.loadEnvFile(fullPath);
    } catch {
      // Ignore if empty or syntax error
    }
  }
}

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

// Dynamic import Next.js factory from web workspace
const { default: next } = await import(
  path.join(__dirname, 'web/node_modules/next/dist/server/next.js')
);

// Import Express app & seeder from compiled backend
const { createApp } = await import(
  path.join(__dirname, 'backend/dist/api/server.js')
);
const { seedDatabase } = await import(
  path.join(__dirname, 'backend/dist/infrastructure/seed.js')
);

async function bootstrap() {
  console.log('====================================================');
  console.log(`Starting Unified Evidence Graph System [${dev ? 'development' : 'production'}]`);
  console.log('====================================================');

  // 1. Initialize SQLite Database & Seeding
  try {
    seedDatabase();
    console.log('[System] Database verified & ready.');
  } catch (err) {
    console.warn('[System] Database initialization notice:', err.message);
  }

  // 2. Initialize Next.js Application
  const webDir = path.resolve(__dirname, 'web');
  const nextApp = next({ dev, dir: webDir });
  const handle = nextApp.getRequestHandler();

  console.log('[System] Preparing Next.js frontend engine...');
  await nextApp.prepare();
  console.log('[System] Next.js frontend engine ready.');

  // 3. Create Express Application with all forensic and reasoning API routes
  const app = createApp();

  // 4. Pass all other non-API routes to Next.js
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  // 5. Start unified server on a single port
  const server = app.listen(port, () => {
    console.log(`\n>>> Unified Server running on http://localhost:${port}`);
    console.log(`>>> Web UI:  http://localhost:${port}/`);
    console.log(`>>> REST API: http://localhost:${port}/api/cases\n`);
  });

  const cleanup = () => {
    console.log('\nGracefully shutting down unified server...');
    server.close(() => {
      console.log('Unified server terminated.');
      process.exit(0);
    });
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

bootstrap().catch((err) => {
  console.error('[System] Fatal startup error:', err);
  process.exit(1);
});
