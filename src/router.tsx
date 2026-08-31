import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Se estiver rodando localmente no app (file:// ou localhost nativo), usa hash history
  const isNative = typeof window !== "undefined" && 
    (window.location.protocol === "file:" || 
     window.location.hostname === "localhost" || 
     window.location.protocol.startsWith("capacitor:"));

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: isNative ? createHashHistory() : undefined,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
