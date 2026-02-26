import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import prerender from "@prerenderer/rollup-plugin";

const PUBLIC_ROUTES = [
  // FR
  '/',
  '/pricing',
  '/exemples',
  '/support',
  '/about',
  '/use-cases/immobilier',
  '/use-cases/e-commerce',
  '/use-cases/automobile',
  '/use-cases/etudes-de-marche',
  // EN
  '/en/',
  '/en/pricing',
  '/en/examples',
  '/en/support',
  '/en/about',
  '/en/use-cases/real-estate',
  '/en/use-cases/e-commerce',
  '/en/use-cases/automotive',
  '/en/use-cases/market-research',
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'production' && prerender({
      routes: PUBLIC_ROUTES,
      renderer: '@prerenderer/renderer-puppeteer',
      rendererOptions: {
        maxConcurrentRoutes: 1,
        renderAfterTime: 5000,
      },
      postProcess(renderedRoute) {
        // Ensure the route stays as originally requested (no redirect drift)
        renderedRoute.route = renderedRoute.originalRoute;
        // Replace localhost URLs with production URL
        renderedRoute.html = renderedRoute.html
          .replace(/http:/ig, 'https:')
          .replace(
            /(https:\/\/)?(localhost|127\.0\.0\.1):\d*/ig,
            'https://easyscrapy.com',
          );
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
