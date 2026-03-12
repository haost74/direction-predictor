import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();

  // API
  app.use('/api', (req, res) => {
    res.json({ message: 'OK' });
  });

  // Vite middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: process.cwd(), // <-- важно: корень проекта, а не src
  });
  app.use(vite.middlewares);

  // 404 (опционально)
  app.use((req, res) => {
    res.status(404).send('Not found');
  });

  app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
  });
}

startServer();