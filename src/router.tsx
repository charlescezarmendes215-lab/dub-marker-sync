import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory, createMemoryHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Capacitor } from "@capacitor/core";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // No Android nativo, usa Hash History para rodar perfeitamente no WebView estático
  const history = Capacitor.isNativePlatform()
    ? createHashHistory()
    : undefined;

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
