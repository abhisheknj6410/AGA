import dotenv from 'dotenv';
import { createApp } from './api/server.js';
import { seedDatabase } from './infrastructure/seed.js';

dotenv.config();

const port = process.env.PORT || 4000;
const app = createApp();

// Seed initial database if empty
seedDatabase();

app.listen(port, () => {
  console.log(`[Evidence Graph Server] Running on http://localhost:${port}`);
  console.log(`[Evidence Graph Server] API ready at http://localhost:${port}/api`);
});
