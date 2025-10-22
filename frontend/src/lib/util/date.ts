export function formatDate(d: Date): string {
    const now = new Date();
    const optionsSameYear: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const optionsOtherYear: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };

    const opts = d.getFullYear() === now.getFullYear() ? optionsSameYear : optionsOtherYear;
    // Use en-US locale for consistent short names; this matches examples like "Thu, Oct 16".
    return d.toLocaleDateString('en-US', opts);
}

/**
 * Format the time portion of a Date as "h:mm am/pm".
 * Hours are not zero-padded (e.g. "9:05 am", "12:30 pm").
 */
export function formatTime(d: Date): string {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const isPm = hours >= 12;

    // Convert to 12-hour clock and ensure hours are not zero-padded
    hours = hours % 12;
    if (hours === 0) hours = 12;

    // Minutes should be zero-padded to 2 digits
    const mins = minutes.toString().padStart(2, '0');
    const suffix = isPm ? 'pm' : 'am';

    return `${hours}:${mins} ${suffix}`;
}

