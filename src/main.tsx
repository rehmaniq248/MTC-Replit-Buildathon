import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoreProvider } from "./lib/store";
import { WhooshProvider } from "./components/Whoosh";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <WhooshProvider>
          <App />
        </WhooshProvider>
      </StoreProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
