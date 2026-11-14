import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // В режиме npm run dev запросы к API идут на ASP.NET-бэкенд
    proxy: { "/api": { target: "https://localhost:7210", secure: false } },
  },
});
