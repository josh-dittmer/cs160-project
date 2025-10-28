# Google Maps API Setup Guide

## Overview
The application uses Google Maps API for multiple features:
1. **Address Autocomplete** - Profile editing with San Jose, CA validation
2. **Address Selector** - Top-right corner delivery address display and editing
3. **Interactive Map** - View delivery location with current location comparison
4. **Geocoding** - Convert addresses to coordinates for map display

## Step 1: Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API** (for autocomplete)
   - **Maps JavaScript API** (for map display)
   - **Geocoding API** (for address-to-coordinates conversion)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

## Step 2: Restrict Your API Key (Important for Security)

1. Click on your API key to edit it
2. Under **API restrictions**:
   - Select "Restrict key"
   - Enable only:
     - Maps JavaScript API
     - Places API
     - Geocoding API
3. Under **Website restrictions** (Optional):
   - Add your domain: `localhost:3001` for development
   - Add your production domain when deploying

## Step 3: Add API Key to Your Project

Create a `.env.local` file in the `frontend/` directory:

```bash
cd frontend
touch .env.local
```

Add the following to `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

Replace `YOUR_API_KEY_HERE` with your actual API key.

**Important:** The `.env.local` file is in `.gitignore` and should never be committed to version control.

## Step 4: Restart the Development Server

```bash
npm run dev
```

The Google Maps features will now work throughout the application!

## Features Implemented

### 1. Profile Edit - Address Autocomplete
**Location:** `/profile` page (edit mode)

- ✅ Address autocomplete restricted to San Jose, CA (20km radius)
- ✅ Search by place names or addresses ("SJSU", "181 E Santa Clara St", etc.)
- ✅ Requires complete addresses with house/building numbers
- ✅ Auto-fills city, state, and zipcode when place is selected
- ✅ Validates addresses are within San Jose
- ✅ Only shows valid US addresses
- ✅ Real-time suggestions as you type

### 2. Address Selector - Top Right Corner
**Location:** All pages after login (top-right corner)

- ✅ Displays current delivery address (or "Set delivery address")
- ✅ Click to open map modal showing delivery location
- ✅ Edit address button to change delivery address
- ✅ "Use My Current Location" button to auto-detect location
- ✅ Validates all addresses are in San Jose, CA
- ✅ Updates profile page automatically

### 3. Interactive Map View
**Location:** Opens from top-right address selector

- ✅ Google Map centered on delivery address
- ✅ Delivery address marker (📦 red marker with animation)
- ✅ Current location indicator (pulsating blue dot)
- ✅ Combined green pulsating marker when at delivery location
- ✅ Theme-aware (supports light and dark mode)
- ✅ Legend showing marker meanings
- ✅ Automatic coordinate validation
- ✅ Fallback to San Jose center if geocoding fails

### 4. Current Location Detection
**Location:** Address input modal

- ✅ Browser geolocation API integration
- ✅ Reverse geocoding to convert coordinates to address
- ✅ Validates detected location is in San Jose
- ✅ Auto-fills address form with detected location
- ✅ Loading states and error handling

## Pricing

### Free Tier
- **$200 credit per month** (enough for ~28,500 autocomplete requests)
- **No credit card required** for initial setup

### Beyond Free Tier
- **Autocomplete (session-based):** $2.83 per 1,000 requests
- **Geocoding:** $5.00 per 1,000 requests
- **Maps JavaScript API:** $7.00 per 1,000 loads
- For a small project, the free tier is usually sufficient

## Fallback Behavior

If the API key is not configured or fails to load:
- Address autocomplete falls back to regular text input
- Map displays "Google Maps API key not configured" message
- Address selector still functions with manual input
- Form validation still ensures city is "San Jose"

## Known Limitations

### Zipcode Accuracy
The Google Places API sometimes returns **general area zipcodes** rather than building-specific ones. For example:
- **1 Washington Square** (SJSU): API returns `95112` (neighborhood) instead of `95192` (campus-specific)
- This is normal behavior and both zipcodes are valid for delivery

Special buildings often have dedicated zipcodes, but the Places API defaults to the broader area code. For most residential addresses, the zipcode will be accurate.

### Service Area Restriction
- All addresses must be within San Jose, CA
- 20km radius from San Jose city center (37.3382, -121.8863)
- Complete addresses with house/building numbers required
- Place names (e.g., "SJSU") are resolved to their street addresses

## Troubleshooting

### "This page can't load Google Maps correctly"
- Check that your API key is correct in `.env.local`
- Ensure Places API, Maps JavaScript API, and Geocoding API are enabled
- Check browser console for specific error messages
- Wait a few minutes after enabling APIs (can take time to propagate)

### Autocomplete not showing suggestions
- Verify API key has no domain restrictions (or includes localhost:3001)
- Check that you've enabled the correct APIs
- Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R) after updating `.env.local`

### Map not displaying
- Check that Maps JavaScript API is enabled
- Verify API key is correctly set in `.env.local`
- Check browser console for errors
- Ensure you're using `NEXT_PUBLIC_` prefix (required for Next.js client-side access)

### "You have exceeded your request quota"
- You've used up your $200 monthly credit
- Add billing information to continue using the API
- Consider implementing usage limits or caching

### Current location not working
- Browser may block geolocation (check browser permissions)
- HTTPS required in production (works on localhost for development)
- User must grant location permission
- Some browsers don't support geolocation

### Coordinates showing wrong location
- Check console logs for geocoding results
- Verify address format is correct
- Google's geocoding may return approximate coordinates for some addresses
- System validates coordinates are in San Jose range (lat: 36-38, lng: -123 to -120)

## Security Notes

- ✅ `.env.local` is in `.gitignore` (not committed to Git)
- ✅ `NEXT_PUBLIC_` prefix makes it available to client-side code
- ✅ Restrict API key to specific APIs and domains in production
- ✅ Monitor usage in Google Cloud Console
- ⚠️ Never commit API keys to version control
- ⚠️ API keys with `NEXT_PUBLIC_` prefix are visible in browser (restrict by domain in production)

## Testing Checklist

- [ ] Profile edit address autocomplete works
- [ ] Top-right address selector displays current address
- [ ] Click address selector opens map modal
- [ ] Map displays delivery address marker
- [ ] Map displays current location (blue dot)
- [ ] "Edit Address" button opens address input modal
- [ ] "Use My Current Location" button detects location
- [ ] Address validation restricts to San Jose
- [ ] Map theme matches app theme (light/dark)
- [ ] Profile page updates when address changes from selector
- [ ] Markers combine when at delivery location (green pulsating marker)
- [ ] Legend updates based on marker state

## Component Architecture

### AddressSelector (`/frontend/src/components/address_selector/`)
- Main component for top-right address functionality
- Loads Google Maps API using `useLoadScript`
- Manages map modal, address input modal, and geocoding
- Handles current location detection
- Theme-aware styling

### GooglePlacesAutocomplete (`/frontend/src/components/google_places_autocomplete/`)
- Reusable autocomplete component
- Uses Google Places Autocomplete API
- San Jose restriction logic
- Address validation and parsing
- Waits for API to be loaded by parent component

### Integration Points
- `AuthContext` - Updates user address in real-time
- `ThemeContext` - Applies light/dark mode to map and modals
- Profile API - Persists address changes to database
