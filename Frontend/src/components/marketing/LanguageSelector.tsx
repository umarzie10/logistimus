"use client";

import { useSyncExternalStore } from "react";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "uz", label: "Oʻzbekcha" },
  { code: "ru", label: "Русский" },
];

const STORAGE_KEY = "logistimus.lang";
const CHANGE_EVENT = "logistimus:lang-change";

function readStoredLang(): string {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved && LANGUAGES.some((l) => l.code === saved) ? saved : "en";
}

function subscribe(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}

export function LanguageSelector() {
  const lang = useSyncExternalStore(subscribe, readStoredLang, () => "en");

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-blue-700 px-3 py-1.5">
      <Globe aria-hidden="true" className="h-4 w-4 text-powder" />
      <span className="sr-only">Language</span>
      <select
        value={lang}
        onChange={(e) => {
          window.localStorage.setItem(STORAGE_KEY, e.target.value);
          window.dispatchEvent(new Event(CHANGE_EVENT));
        }}
        className="cursor-pointer appearance-none bg-transparent pr-1 text-sm text-ice outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-royal text-ice">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
