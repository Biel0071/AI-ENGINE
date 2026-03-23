import express, { type Request, type Response } from 'express';
import { AIEngine } from '../core/engine';

const app = express();
app.use(express.json());

const engine = new AIEngine();

app.post('/process', async (req: Request, res: Response) => {
  const input = req.body;

  try {
    const output = await engine.run(input);

    console.log({
      input,
      output,
      timestamp: new Date(),
    });

    return res.json(output);
  } catch (_error) {
    const output = {
      intent: 'error',
      response: 'Erro interno',
      score: 0,
      meta: {
        engineVersion: '1.0.0',
      },
    };

    console.log({
      input,
      output,
      timestamp: new Date(),
    });

    return res.json(output);
  }
});

const port = Number(process.env.AI_ENGINE_PORT ?? 3001);
app.listen(port, () => {
  process.stdout.write(`[ai-engine] API running on http://localhost:${port}\n`);
});
