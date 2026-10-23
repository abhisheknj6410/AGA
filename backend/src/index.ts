import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
dotenv.config({ path: envPath, override: true });

import { createApp } from './api/server.js';
import { seedDatabase } from './infrastructure/seed.js';

const port = process.env.PORT || 4000;
const app = createApp();

// Seed initial database if empty
seedDatabase();

app.listen(port, () => {
  console.log(`[Evidence Graph Server] Running on http://localhost:${port}`);
  console.log(`[Evidence Graph Server] API ready at http://localhost:${port}/api`);
});
