import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const openAiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.OPENAI_API_KEY': JSON.stringify(openAiKey),
    },
  };
});
