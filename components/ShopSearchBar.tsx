"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 350;

interface ShopSearchBarProps {
  storeType: string;
  initialQuery?: string;
}

export function ShopSearchBar({ storeType, initialQuery = "" }: ShopSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [debouncedValue, setDebouncedValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
    setDebouncedValue(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const applySearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = query.trim();
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      const queryString = params.toString();
      const path = `/${storeType}/shop`;
      router.push(queryString ? `${path}?${queryString}` : path);
    },
    [storeType, searchParams, router]
  );

  useEffect(() => {
    if (debouncedValue !== (initialQuery ?? "")) {
      applySearch(debouncedValue);
    }
  }, [debouncedValue, initialQuery, applySearch]);

  return (
    <Input
      type="search"
      placeholder="Search products..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && value.trim() && applySearch(value)}
      aria-label="Search products"
      className="max-w-xs text-sm"
    />
  );
}
