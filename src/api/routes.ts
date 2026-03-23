import express, { type Request, type Response } from 'express';
import { AIEngine } from '../core/engine';

const app = express();
app.use(express.json());

const engine = new AIEngine();

app.post('/process', async (req: Request, res: Response) => {
  try {
    const result = await engine.run(req.body);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to process request',
    });
  }
});

const port = Number(process.env.AI_ENGINE_PORT ?? 3001);
app.listen(port, () => {
  process.stdout.write(`[ai-engine] API running on http://localhost:${port}\n`);
});
