import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { createAppContainer } from "./composition";
import { ContainerProvider } from "./state/ContainerContext";
import { queryClient } from "./state/queryClient";

const container = createAppContainer();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ContainerProvider container={container}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ContainerProvider>
  </React.StrictMode>,
);
