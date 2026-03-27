"use client";

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface SuggestionInputProps {
    type: "FamousPerson" | "Place" | "Event" | "Interest";
    placeholder: string;
    onSelect: (value: string) => void;
    value: string;
    onChange: (value: string) => void;
}

export default function SuggestionInput({
    type,
    placeholder,
    onSelect,
    value,
    onChange
}: SuggestionInputProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (value.length < 2) {
                setSuggestions([]);
                return;
            }

            const token = getToken();
            try {
                const data = await apiRequest<{ suggestions: string[] }>(
                    `/search?q=${encodeURIComponent(value)}&type=${type}`,
                    { method: "GET", token }
                );
                setSuggestions(data.suggestions);
                setShowSuggestions(data.suggestions.length > 0);
            } catch (error) {
                console.error("Search failed:", error);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [value, type]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative flex-1" ref={dropdownRef}>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full rounded-xl border border-ink/15 px-3 py-2 text-sm"
                placeholder={placeholder}
            />
            {showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-ink/10 bg-white py-1 shadow-lg">
                    {suggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            className="w-full px-4 py-2 text-left text-sm hover:bg-mist"
                            onClick={() => {
                                onSelect(suggestion);
                                setShowSuggestions(false);
                            }}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
