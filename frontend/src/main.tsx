import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/app";
import { createQueryClient } from "@/queries/client";

import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("index.html must contain an element with id 'root'");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
