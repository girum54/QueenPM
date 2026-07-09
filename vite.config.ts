// This config package includes: tanstackStart, viteReact, tailwindcss, tsConfigPaths,
// nitro, componentTagger, env injection, path alias, React/TanStack dedupe.
// Pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    preview: {
      allowedHosts: ['projects.theultimateinsurance.com', '.theultimateinsurance.com'],
    },
  },
});
