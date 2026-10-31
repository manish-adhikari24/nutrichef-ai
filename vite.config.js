import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Runs the /api function during local development, as Vercel does in production.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''));
      server.middlewares.use('/api/generate-recipe', async (req, res) => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        try {
          req.body = raw ? JSON.parse(raw) : {};
        } catch {
          req.body = {};
        }
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };
        const { default: handler } = await server.ssrLoadModule('/api/generate-recipe.js');
        await handler(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
});
