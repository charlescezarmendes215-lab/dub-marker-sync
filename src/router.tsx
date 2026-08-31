import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const isNative = typeof window !== "undefined" && 
    (window.location.protocol === "file:" || 
     window.location.protocol.startsWith("capacitor:") ||
     (window.location.hostname === "localhost" && Boolean((window as unknown as { Capacitor?: unknown }).Capacitor)));

  return createRouter({
    routeTree,
    context: { queryClient },
    history: isNative ? createHashHistory() : undefined,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
};
