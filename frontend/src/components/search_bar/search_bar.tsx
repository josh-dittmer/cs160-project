'use client';

import { Endpoints } from "@/lib/api/endpoints";
import { SearchSuggestionT, SearchSuggestionsResponse } from "@/lib/api/models";
import { isRight } from "fp-ts/lib/Either";
import { Mic, MicOff, Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Sound effects using Web Audio API
const playSound = (type: 'start' | 'stop' | 'success') => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'start') {
            // Rising "boop" sound for starting to listen (400Hz → 600Hz)
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        } else if (type === 'stop') {
            // Falling "boop" sound for stopping (600Hz → 400Hz) - exact reverse of start
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        } else {
            // Success "ding" sound for completion
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);

            // Add a second harmonic for a richer "ding"
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();
            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);

            oscillator2.type = 'sine';
            oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime + 0.05);
            gainNode2.gain.setValueAtTime(0.15, audioContext.currentTime + 0.05);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

            oscillator2.start(audioContext.currentTime + 0.05);
            oscillator2.stop(audioContext.currentTime + 0.25);
        }
    } catch (error) {
        // Silently fail if audio isn't supported
        console.debug('Audio playback not available:', error);
    }
};

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<SearchSuggestionT[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isListening, setIsListening] = useState(false);
    const [isVoiceSupported, setIsVoiceSupported] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

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
                    const results = decoded.right;
                    
                    // If exactly 1 result, automatically navigate to it
                    if (results.length === 1) {
                        window.location.href = `/home/item/${results[0].id}`;
                        return;
                    }
                    
                    // Show dropdown for 0 results (to display message) or 2+ results
                    setSuggestions(results);
                    setIsOpen(true);
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

    // Initialize voice recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check for browser support
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                setIsVoiceSupported(true);

                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setQuery(transcript);
                    setIsListening(false);
                    setVoiceError(null);
                    // Play success sound when transcript is received
                    playSound('success');
                };

                recognition.onerror = (event: any) => {
                    setIsListening(false);

                    // Handle different error types with user-friendly messages
                    switch (event.error) {
                        case 'network':
                            // Network errors are common and often transient - don't alarm the user
                            console.warn('Voice search: Network connection issue. Please try again.');
                            setVoiceError('Network issue. Please try again.');
                            break;
                        case 'not-allowed':
                        case 'permission-denied':
                            setVoiceError('Microphone access denied. Please enable it in browser settings.');
                            break;
                        case 'no-speech':
                            setVoiceError('No speech detected. Please try again.');
                            break;
                        case 'aborted':
                            // User intentionally stopped - no error message needed
                            setVoiceError(null);
                            break;
                        default:
                            console.error('Speech recognition error:', event.error);
                            setVoiceError('Voice search failed. Please try again.');
                    }

                    // Clear error message after 4 seconds
                    setTimeout(() => setVoiceError(null), 4000);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
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

    const toggleVoiceSearch = () => {
        if (!recognitionRef.current) {
            setVoiceError('Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.');
            setTimeout(() => setVoiceError(null), 4000);
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            // Play stop sound when manually stopping (reverse of start)
            playSound('stop');
        } else {
            try {
                setVoiceError(null); // Clear any previous errors
                recognitionRef.current.start();
                setIsListening(true);
                // Play start sound when beginning to listen
                playSound('start');
            } catch (error) {
                console.error('Failed to start voice recognition:', error);
                setIsListening(false);
                setVoiceError('Could not start voice search. Please try again.');
                setTimeout(() => setVoiceError(null), 4000);
            }
        }
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
                {isVoiceSupported && (
                    <button
                        onClick={toggleVoiceSearch}
                        className={`flex-shrink-0 p-1 rounded-full transition-all ${isListening
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'text-fg-medium hover:bg-bg-dark hover:text-fg-dark'
                            }`}
                        title={isListening ? "Stop listening" : "Start voice search"}
                        type="button"
                    >
                        {isListening ? (
                            <MicOff width={20} height={20} />
                        ) : (
                            <Mic width={20} height={20} />
                        )}
                    </button>
                )}
            </div>

            {/* Voice Error Message */}
            {voiceError && (
                <div className="absolute top-full mt-1 right-0 bg-red-500 text-white text-sm px-3 py-2 rounded-lg shadow-lg animate-fade-in z-50">
                    {voiceError}
                </div>
            )}

            {/* Autocomplete Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-bg-light border border-bg-dark rounded-lg shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
<<<<<<< HEAD
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-bg-medium transition-colors ${index === selectedIndex ? 'bg-bg-medium' : ''
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
=======
                    {suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
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
>>>>>>> main
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
                        ))
                    ) : (
                        <div className="p-4 text-center text-fg-medium">
                            No results found for &ldquo;{query}&rdquo;
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
