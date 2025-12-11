// serve.js
import { serve } from "bun";
import { file } from "bun";

serve({
  port: 4173,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    return new Response(file(`./dist${path}`));
  },
});
