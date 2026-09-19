import React from "react";
import ReactDOM from "react-dom/client";
import { LastWard } from "@/components/LastWard";
import "@/styles.css";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <LastWard />
  </React.StrictMode>,
);
