export function formatDate(d: Date): string {
    const now = new Date();
    const optionsSameYear: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const optionsOtherYear: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };

    const opts = d.getFullYear() === now.getFullYear() ? optionsSameYear : optionsOtherYear;
    // Use en-US locale for consistent short names; this matches examples like "Thu, Oct 16".
    return d.toLocaleDateString('en-US', opts);
}

/**
 * Format the time portion of a Date as "h:mm am/pm TZ".
 * Example: "10:37 am PST"
 */
export function formatTime(d: Date): string {
    // Use Intl.DateTimeFormat to get the timezone abbreviation
    const timeString = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short' // This adds PST, EST, etc.
    }).toLowerCase(); // "10:37 am pst"

    // Optional: Capitalize the timezone part back if you prefer "10:37 am PST"
    // but simple lowercase might be fine or we can adjust. 
    // Let's make it "10:37 am PST" for better readability.
    
    // toLocaleTimeString might return "10:37 am pst" or "10:37 AM PST" depending on browser.
    // Let's handle it manually to ensure "am/pm" is lowercase but TZ is uppercase if possible,
    // or just rely on browser default. Browser default usually gives "10:37 AM PST".
    
    // If we strictly want "10:37 am PST":
    const parts = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
    }).split(' ');
    
    // parts usually ["10:37", "AM", "PST"] or ["10:37", "AM", "GMT-8"]
    
    if (parts.length >= 3) {
        const ampm = parts[1].toLowerCase();
        const tz = parts.slice(2).join(' '); // Handle "GMT-8" or "Pacific Standard Time" if short fails
        return `${parts[0]} ${ampm} ${tz}`;
    }
    
    return timeString;
}

/**
 * Helper to ensure a date string from the API is treated as UTC
 * if it doesn't have timezone info.
 */
export function ensureUtc(dateStr: string | Date): Date {
    if (dateStr instanceof Date) return dateStr;
    
    // If it's a string and looks like ISO but missing Z or offset
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
        return new Date(dateStr + 'Z');
    }
    return new Date(dateStr);
}
