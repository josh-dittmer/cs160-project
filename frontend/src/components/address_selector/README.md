# Address Selector Component

## Overview
The `AddressSelector` component is a smart, interactive component in the top navigation bar that allows users to view and set their delivery address. It provides two distinct experiences based on whether the user has set their address.

## Features

### 1. **Dynamic Address Display**
- Shows the user's actual address from their profile
- Displays "Set delivery address" if no address is configured
- Truncates long addresses (max 20 characters) for clean UI
- **Always clickable** - provides different functionality based on address state

### 2. **Address Input Modal (No Address Set)**
- Opens when user clicks and hasn't set an address yet
- **"Use My Current Location" button** - Auto-detects user's location using browser geolocation
- Features Google Places Autocomplete for manual address entry
- Validates San Jose, CA location (delivery area restriction)
- Shows parsed address components (street, city, state, ZIP)
- Saves directly to database and updates auth context
- Real-time validation and feedback

### 3. **Interactive Map Modal (Address Already Set)**
- Opens when user clicks and has an address configured
- Shows full address in the modal header
- Displays an interactive Google Map with:
  - **Delivery address marker** (📦 red marker) - where order will be delivered
  - **Your current location** (🔵 pulsating blue dot) - where you are now (if location permission granted)
  - **Map legend** - explains what each marker means
- Supports pan, zoom, and other map interactions
- **"Edit Address" button** allows changing address directly from the map modal

### 4. **Geocoding**
- **Address to Coordinates:** Automatically converts user's address to GPS coordinates using Google Maps Geocoding API
- **Fallback:** Uses San Jose center (37.3352, -121.8811) if geocoding fails

### 5. **Real-time Updates**
- Updates automatically when user changes their address (from anywhere)
- Reads directly from the auth context
- Changes reflect immediately across all pages

## User Flow

### Scenario 1: User Without Address

1. **Initial State:**
   ```
   Top-right shows: "Set delivery address" (clickable)
   ```

2. **User Clicks (Option A - Use Current Location):**
   ```
   Address input modal opens
   → User clicks "Use My Current Location" button
   → Browser asks for location permission
   → Location detected and reverse geocoded
   → Address components auto-fill (street, city, state, ZIP)
   → User clicks "Save Address"
   → Success! Address saved to database
   → Modal closes, top-right now shows the address
   ```

3. **User Clicks (Option B - Manual Entry):**
   ```
   Address input modal opens
   → User types address in Google Places Autocomplete
   → Selects from dropdown
   → Address components appear (street, city, state, ZIP)
   → User clicks "Save Address"
   → Success! Address saved to database
   → Modal closes, top-right now shows the address
   ```

4. **Validation:**
   - Must select from autocomplete dropdown (not just type)
   - Must be a complete address with all components
   - Must be in San Jose, CA (enforced)
   - Real-time feedback on validation errors

### Scenario 2: User With Address

1. **Initial State:**
   ```
   Top-right shows: "181 East Santa Cl..." (clickable)
   ```

2. **User Clicks (View Map):**
   ```
   Map modal opens showing exact location
   → Interactive Google Map displayed
   → Red marker at delivery address
   → Full address shown in header
   → "Edit Address" button in header
   → User can close by clicking X, Close button, or outside
   ```

3. **User Clicks "Edit Address" (Change Address):**
   ```
   Map closes, address input modal opens
   → Form is pre-filled with current address
   → User can select new address from Google Places Autocomplete
   → User clicks "Save Address"
   → Address updated in database
   → Top-right updates immediately
   → Next time they open map, it shows new location
   ```

### Address Changes Reflect Everywhere

- Set address from top-right → Appears in profile page
- Change address from top-right map → Updates everywhere (profile, database)
- Change address in profile page → Updates in top-right
- All changes use the same auth context for real-time sync

## Technical Details

### Dependencies
- `@react-google-maps/api` - Google Maps React integration
- `lucide-react` - Icons (MapPin, ChevronDown, X)
- `@/contexts/auth` - User data access

### Environment Variables
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Required for map functionality

### Google Maps APIs Required
1. **Maps JavaScript API** - For displaying the map
2. **Geocoding API** - For converting address to coordinates

## Props
None - component reads directly from auth context

## State Management
- `showMap` - Controls modal visibility
- `coordinates` - Stores geocoded location (lat/lng)
- `isGeocoding` - Prevents duplicate geocoding requests

## Styling
- Uses Tailwind CSS
- Responsive design (hides address text on mobile)
- Dark mode support
- Hover effects when address is clickable

## Error Handling
- Gracefully handles missing API key
- Falls back to default location if geocoding fails
- Shows appropriate message when API key is not configured

## Usage Example

The component is already integrated in the `TopBar`:

```tsx
import AddressSelector from "@/components/address_selector/address_selector";

export default function TopBar() {
  return (
    <div className="top-bar">
      {/* Other components */}
      <AddressSelector />
      {/* Other components */}
    </div>
  );
}
```

## Testing

### Test Case 1a: Setting Address from Top-Right (Using Current Location)
1. Log in as a user without an address
2. Top-right should show "Set delivery address" ✅
3. Click on it → Address input modal opens ✅
4. Click "Use My Current Location" button ✅
5. Browser asks for permission → Allow ✅
6. Button shows "Detecting location..." with spinner ✅
7. Address auto-fills (if you're in San Jose) ✅
8. Address components appear in green box ✅
9. Click "Save Address" → Success alert ✅
10. Modal closes, top-right now shows your address ✅
11. Navigate to Profile page → Address should be filled in ✅

### Test Case 1b: Setting Address from Top-Right (Manual Entry)
1. Log in as a user without an address
2. Top-right should show "Set delivery address" ✅
3. Click on it → Address input modal opens ✅
4. Type "181 East Santa Clara Street" in the input
5. Select from autocomplete dropdown ✅
6. Address components should appear below ✅
7. Click "Save Address" → Success alert ✅
8. Modal closes, top-right now shows "181 East Santa Cl..." ✅
9. Navigate to Profile page → Address should be filled in ✅

### Test Case 2: Viewing Map After Address Is Set
1. With address already set, click top-right
2. Map modal opens ✅
3. Map shows with marker at correct location ✅
4. Full address displayed in modal header ✅
5. "Edit Address" button visible in header ✅
6. Close modal (X button, Close button, or click outside) ✅

### Test Case 2b: Changing Address from Map Modal
1. With address set, click top-right → Map opens
2. Click "Edit Address" button ✅
3. Address input modal opens with current address pre-filled ✅
4. Modal title shows "Change Delivery Address" ✅
5. Type a new San Jose address and select it ✅
6. Click "Save Address" → Success message shows "Address updated successfully!" ✅
7. Top-right updates to show new address ✅
8. Click top-right again → Map shows new location ✅
9. Navigate to Profile page → New address shown ✅

### Test Case 3: Validation
1. Click top-right without address
2. Type an address but don't select from dropdown
3. Try to save → Should show validation error ✅
4. Type a non-San Jose address (e.g., "123 Main St, San Francisco")
5. Select it and try to save → Should show "San Jose only" error ✅

### Test Case 4: Geolocation Error Handling
1. Click "Use My Current Location" button
2. If location permission denied → Shows helpful error message ✅
3. If not in San Jose → Shows "we only deliver to San Jose" error ✅
4. If location unavailable → Shows "enter manually" message ✅
5. User can still use manual entry after error ✅

### Test Case 5: Cross-Page Sync
1. Set address from top-right
2. Go to Profile page → Address appears ✅
3. Change address in Profile page
4. Go to Dashboard → Top-right shows updated address ✅

## Future Enhancements
- Add "Change Address" button in the modal
- Show estimated delivery time/zone
- Allow users to set multiple addresses
- Add map type controls (satellite, terrain, etc.)

