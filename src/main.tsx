import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css'

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Signal to the prerenderer that React + react-helmet-async have finished
// updating the <head> and the page is ready to be captured.
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.dispatchEvent(new Event('prerender-ready'));
    }, 500);
  });
}
