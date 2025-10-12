'use client';

import { Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { SearchSuggestionT, SearchSuggestionsResponse } from "@/lib/api/models";
import { Endpoints } from "@/lib/api/endpoints";
import { isRight } from "fp-ts/lib/Either";
import Image from "next/image";

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<SearchSuggestionT[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce search
    useEffect(() => {
        if (query.trim().length === 0) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `${Endpoints.mainApiInternal}/api/search?q=${encodeURIComponent(query)}&limit=10`
                );
                const data = await response.json();
                const decoded = SearchSuggestionsResponse.decode(data);
                
                if (isRight(decoded)) {
                    setSuggestions(decoded.right);
                    setIsOpen(decoded.right.length > 0);
                } else {
                    setSuggestions([]);
                    setIsOpen(false);
                }
            } catch (error) {
                console.error("Search error:", error);
                setSuggestions([]);
                setIsOpen(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    handleSelectSuggestion(suggestions[selectedIndex]);
                }
                break;
            case "Escape":
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleSelectSuggestion = (suggestion: SearchSuggestionT) => {
        setQuery(suggestion.name);
        setIsOpen(false);
        setSelectedIndex(-1);
        // Navigate to item detail page or perform search
        window.location.href = `/home/item/${suggestion.id}`;
    };

    const formatPrice = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    return (
        <div className="grow relative" ref={wrapperRef}>
            <div className="flex items-center gap-3 bg-bg-medium p-2 rounded-full">
                <Search width={20} height={20} className="text-fg-medium" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search..."
                    className="w-full text-fg-dark outline-none bg-transparent"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setIsOpen(true);
                        }
                    }}
                />
            </div>

            {/* Autocomplete Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-bg-light border border-bg-dark rounded-lg shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-bg-medium transition-colors ${
                                index === selectedIndex ? 'bg-bg-medium' : ''
                            } ${index !== suggestions.length - 1 ? 'border-b border-bg-medium' : ''}`}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            {/* Image or Search Icon */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-bg-medium flex items-center justify-center">
                                {suggestion.image_url ? (
                                    <Image
                                        src={suggestion.image_url}
                                        alt={suggestion.name}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                ) : (
                                    <Search className="text-fg-medium" width={20} height={20} />
                                )}
                            </div>

                            {/* Item Info */}
                            <div className="flex-1 text-left">
                                <div className="text-fg-dark font-medium">
                                    {suggestion.name}
                                </div>
                                {suggestion.category && (
                                    <div className="text-fg-medium text-sm capitalize">
                                        {suggestion.category}
                                    </div>
                                )}
                            </div>

                            {/* Price */}
                            <div className="text-fg-dark font-semibold">
                                {formatPrice(suggestion.price_cents)}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
