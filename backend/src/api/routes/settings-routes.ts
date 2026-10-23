import { Router, Request, Response } from 'express';
import { getLlmConfigState, updateLlmConfig, testLlmConnection } from '../../infrastructure/llm-config.js';

export function createSettingsRouter(): Router {
  const router = Router();

  // GET /api/settings - Read current LLM config status (masked key)
  router.get('/', (req: Request, res: Response) => {
    try {
      const config = getLlmConfigState();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve settings' });
    }
  });

  // POST /api/settings - Update and persist LLM config
  router.post('/', (req: Request, res: Response) => {
    try {
      const { apiKey, baseUrl, model, provider } = req.body;
      const updated = updateLlmConfig({ apiKey, baseUrl, model, provider });
      res.json({
        success: true,
        message: 'Settings updated successfully.',
        config: updated
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
  });

  // POST /api/settings/test - Test API Key connection
  router.post('/test', async (req: Request, res: Response) => {
    try {
      const { apiKey, baseUrl, model } = req.body;
      const result = await testLlmConnection({ apiKey, baseUrl, model });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Test connection error' });
    }
  });

  return router;
}
