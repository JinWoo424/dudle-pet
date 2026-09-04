"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const visibleSuggestions = query.trim() ? suggestions : [];

  useEffect(() => {
    if (query.trim().length < 1) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((response) => response.json()).then((data: { suggestions?: Array<{ label: string }> }) => setSuggestions(data.suggestions?.map((item) => item.label) ?? [])).catch(() => undefined), 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized) router.push(`/search?q=${encodeURIComponent(normalized)}`);
  }

  return (
    <form className="search-panel" role="search" action="/search" method="get" onSubmit={submit}>
      <label className="sr-only" htmlFor="home-search">지역 또는 병원명 검색</label>
      <input id="home-search" name="q" list="home-search-suggestions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="지역 또는 병원명을 검색하세요" autoComplete="off" />
      <datalist id="home-search-suggestions">{visibleSuggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist>
      <button type="submit"><Search size={18} aria-hidden="true" />검색</button>
    </form>
  );
}
