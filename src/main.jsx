import React from "react";
import { createRoot } from "react-dom/client";
import App from "./berkeley-degree-ledger.jsx";

/* The ledger talks to `window.storage`, an async key/value API. On a plain
   static host there is no such thing, so back it with localStorage and keep the
   same promise-returning shape the app expects. Wrapped because a browser with
   site data blocked throws on access rather than returning null. */
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      if (value === null) throw new Error("not found");
      return { key, value, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      return { keys: Object.keys(localStorage).filter((k) => k.startsWith(prefix)), prefix, shared: false };
    },
  };
}

createRoot(document.getElementById("root")).render(<App />);
