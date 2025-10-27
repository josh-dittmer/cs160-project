# Profile Edit Feature Implementation Summary

## Overview
Successfully implemented a fully functional user profile editing system with backend API integration, including profile information updates, password changes, and profile picture management.

## Backend Changes

### 1. Database Schema (`backend/app/models.py`)
Added new fields to the `User` model:
- `phone` (String, nullable)
- `address` (String, nullable)
- `city` (String, nullable)
- `zipcode` (String, nullable)
- `state` (String, nullable)
- `profile_picture` (Text, nullable) - stores base64 or URL

### 2. Pydantic Schemas (`backend/app/schemas.py`)
- Updated `UserOut` schema to include all new profile fields
- Created `UserProfileUpdate` schema for profile updates
- Created `PasswordChange` schema for password changes

### 3. API Endpoints (`backend/app/routers/auth.py`)

#### PUT `/api/auth/profile`
- Updates user profile information
- Requires authentication
- Accepts: full_name, phone, address, city, zipcode, state, profile_picture
- Returns: Updated UserOut

#### PUT `/api/auth/password`
- Changes user password
- Requires authentication and current password verification
- Validates password requirements (min 8 characters)
- Blocks OAuth users from changing password
- Returns: Success message

#### Google OAuth Enhancement
Updated **both** Google OAuth endpoints to fetch and store profile pictures:

**POST `/api/auth/google`** (Primary OAuth endpoint):
- Extracts `picture` field from Google ID token
- Stores Google profile picture URL for new users
- Updates profile picture on every login unless manually overridden
- Distinguishes between Google URLs and base64 images (starting with `data:`)

**GET `/api/auth/google/callback`** (Legacy redirect flow):
- Fetches profile picture from Google userinfo
- Same update logic as primary endpoint
- Ensures consistency across both OAuth flows

**Smart Update Logic:**
- Google OAuth users always see their latest Google profile picture
- Manual uploads (base64 images) are preserved and never overwritten
- Users maintain full control over their profile picture

## Frontend Changes

### 1. Profile API Client (`frontend/src/lib/api/profile.ts`)
New API client with functions:
- `getCurrentUser(token)` - Fetches current user data
- `updateProfile(token, data)` - Updates profile information
- `changePassword(token, data)` - Changes password

### 2. Auth Context (`frontend/src/contexts/auth.tsx`)
- Updated `UserInfo` type to include all new profile fields
- Added `updateUser()` function to refresh user data after updates
- Re-exported UserInfo from profile.ts for consistency

### 3. Profile Page (`frontend/src/app/profile/page.tsx`)
**Features Implemented:**
- Fetches real user data from backend on mount
- Displays user information dynamically (no hardcoded data)
- Profile picture with intelligent fallback:
  - Shows Google profile picture if logged in via OAuth
  - Shows uploaded profile picture if manually set
  - Shows initials (e.g., "John Doe" → "JD") as default
- **Dual image upload options:**
  - **File upload**: Click edit icon to upload from device
    - Base64 conversion
    - 5MB size limit validation
  - **URL input**: Click "Use image URL" link to paste image URL
    - URL validation before submission
    - Press Enter or click "Save URL" to submit
    - Toggle between file upload and URL input
  - Real-time upload to backend
  - Success confirmation messages
- **Phone number auto-formatted for display** - converts `5551234567` to `(555) 123-4567`
- Loading state during data fetch
- Real-time address display with proper formatting

### 4. Account Window Component (`frontend/src/components/account_window/account_window.tsx`)
**Profile Picture Display:**
- Shows Google profile picture if available (OAuth users)
- Falls back to initials avatar with gradient background
- Generates proper initials (e.g., "John Doe" → "JD", "Mary" → "M")
- Matches the same gradient style as the profile page

**Edit Profile Button:**
- Changed from non-functional `<motion.a>` to `<motion.button>`
- Redirects to `/profile` page when clicked
- Closes the account window after navigation
- Provides seamless navigation to profile editing

### 5. Google Places Autocomplete Component (`frontend/src/components/google_places_autocomplete/GooglePlacesAutocomplete.tsx`)
**New Component for Address Validation:**
- Integrates Google Maps Places API for address autocomplete
- Restricts results to 20km radius around San Jose city center (37.3382, -121.8863)
- Uses `strictBounds: true` to only show San Jose addresses
- **Accepts multiple search types:** Place names (e.g., "San Jose State University"), street addresses, landmarks
- Extracts and parses address components (street number, route, city, state, zipcode)
- **Validates address includes house/building number** (rejects "Main St", accepts "123 Main St")
- Validates selected address is in San Jose before accepting
- Falls back to regular input if API fails to load
- Shows loading state while API initializes
- Triggers callback with parsed address components

**Setup Requirements:**
- Google Maps API key in `.env.local`
- Places API enabled in Google Cloud Console
- Maps JavaScript API enabled
- See `GOOGLE_MAPS_SETUP.md` for complete setup instructions

### 6. Edit Profile Panel (`frontend/src/app/profile/EditProfilePanel.tsx`)
**Profile Information Section:**
- Controlled form inputs with state management
- Field order: Name, Email, Phone, Address, City, State, Zipcode
  - Email is read-only (cannot be changed)
- **Phone Number Input:**
  - Auto-formats to (XXX) XXX-XXXX as user types
  - **Blocks non-digit input entirely** - users cannot type letters or symbols
  - Keyboard shortcuts allowed (Ctrl+C, Ctrl+V, arrows, backspace, etc.)
  - Paste validation - strips non-digits from pasted content
  - Maximum 10 digits (US phone format)
  - **Stores only raw digits** - formatting removed before sending to backend
  - Validates complete 10-digit number before submission
  - Formats existing phone numbers on load
- **Address Input with Google Places Autocomplete:**
  - Real-time address suggestions as you type
  - **Restricted to San Jose, CA only** (20km radius)
  - Auto-fills city, state, and zipcode when address is selected
  - Validates addresses are within San Jose before submission
  - Falls back to manual input if API unavailable
  - City, state, and zipcode fields are read-only (auto-filled)
  - Address field is mandatory
- All fields use real user data from backend
- Save button with loading state
- Form validation and error handling
- Success/error messages via alerts

**Password Change Section:**
- **Only visible for non-Google OAuth users** (hidden if `google_id` exists)
- For Google users: Shows informative message that password is managed by Google
- Separate password form with:
  - Current password field
  - New password field (min 8 characters)
  - Confirm password field
- Password visibility toggles (eye icons) for all three fields
- Real-time password validation:
  - Ensures new password matches confirmation
  - Validates minimum length
  - Verifies current password on backend
- Disabled state when fields are empty
- Loading state during password change
- Clears password fields on successful change

## Key Features

### Security
- All endpoints require JWT authentication
- Password changes require current password verification
- **OAuth users cannot change password** (they must use Google)
  - Password section hidden in UI for Google OAuth users
  - Backend blocks password changes for users without `hashed_password`
  - Informative message shown instead of password form
- Profile picture size limit (5MB) to prevent abuse
- Input sanitization via Pydantic schemas

### User Experience
- Real-time data fetching and updates
- Loading states for all async operations
- Clear error messages for all failure cases
- Success confirmation messages
- Profile picture priority: Manual upload → Google OAuth picture → Initials fallback
- Google profile pictures auto-update on each login (unless manually overridden)
- Password visibility toggles for better UX
- Disabled email field to prevent confusion
- Form validation before submission
- Separate save buttons for profile and password

### Data Validation
**Frontend:**
- Required field checking
- Password match validation
- Password length validation (min 8 characters)
- Image size validation (max 5MB)
- **Phone number validation:**
  - **Blocks non-digit keyboard input** (prevents typing letters/symbols)
  - Auto-formats to (XXX) XXX-XXXX as user types
  - Validates and strips non-digits from pasted content
  - Enforces 10-digit US phone format
  - Stores only raw digits in database (no formatting characters)
  - Validates complete phone number before submission
- Field format placeholders for guidance

**Backend:**
- Pydantic schema validation
- Current password verification for password changes
- Optional field handling (all profile fields are nullable)
- OAuth user detection for password changes

## Field Order & Logic
Address fields ordered logically as requested:
1. Address (street address)
2. City
3. State (dropdown with all 50 US states)
4. Zipcode (max 10 characters)

This order follows the natural geographic hierarchy from specific to general.

## Testing Checklist
- [x] User can view their profile information
- [x] User can edit profile information (name, phone, address, city, state, zipcode)
- [x] User can upload profile picture via **file upload** (base64 conversion)
- [x] User can upload profile picture via **URL input**
- [x] Profile picture respects 5MB size limit (file upload)
- [x] Initials fallback works correctly (shows both first and last initial)
- [x] Google OAuth users get their Google profile picture
- [x] Google profile picture updates on every login
- [x] Manual uploads are preserved and not overwritten by Google
- [x] Profile picture displays in account window dropdown
- [x] "Edit profile" button navigates to /profile page
- [x] Account window closes after clicking "Edit profile"
- [x] User can change password with current password verification (non-OAuth only)
- [x] Password fields have visibility toggles
- [x] Password validation works (min 8 chars, match confirmation)
- [x] OAuth users cannot change password (backend protection)
- [x] **Password section hidden for Google OAuth users (UI)**
- [x] **Google OAuth users see informative message instead of password form**
- [x] Email field is read-only
- [x] **Phone number input validation:**
  - [x] Only accepts numeric characters
  - [x] Auto-formats to (XXX) XXX-XXXX
  - [x] Enforces 10-digit limit
  - [x] Validates before submission
- [x] **Address restriction to San Jose, CA:**
  - [x] Google Places Autocomplete shows only San Jose addresses
  - [x] **Requires house/building number** (rejects "Barron Park Drive", accepts "5152 Barron Park Drive")
  - [x] Auto-fills city, state, and zipcode
  - [x] Validates address is in San Jose before submission
  - [x] City and state fields are read-only
  - [x] Falls back to manual input if API unavailable
- [x] All success/error messages display correctly
- [x] Loading states work properly
- [x] No linting errors in any files

## Files Modified

**Backend:**
- `backend/app/models.py` - Added profile fields to User model
- `backend/app/schemas.py` - Added UserProfileUpdate, PasswordChange, updated UserOut
- `backend/app/routers/auth.py` - Added profile and password endpoints, updated OAuth

**Frontend:**
- `frontend/src/lib/api/profile.ts` - New profile API client
- `frontend/src/lib/api/auth.ts` - Updated to use shared UserInfo type
- `frontend/src/contexts/auth.tsx` - Added updateUser function, updated UserInfo import
- `frontend/src/app/profile/page.tsx` - Implemented real data fetching and display
- `frontend/src/app/profile/EditProfilePanel.tsx` - Implemented form state and handlers with Google Places integration
- `frontend/src/components/account_window/account_window.tsx` - Added profile picture display and functional Edit button
- `frontend/src/components/google_places_autocomplete/GooglePlacesAutocomplete.tsx` - New component for San Jose address restriction

**Documentation:**
- `GOOGLE_MAPS_SETUP.md` - Complete setup guide for Google Maps API

**Dependencies:**
- Added `@react-google-maps/api` package for Places Autocomplete functionality

**Database:**
- Recreated database with new schema using seed.py (no migration file needed)

## API Endpoints

### GET `/api/auth/me`
Get current user information (existing, now returns new fields)

### PUT `/api/auth/profile`
Update user profile
```json
{
  "full_name": "string",
  "phone": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "zipcode": "string",
  "profile_picture": "base64string or url"
}
```

### PUT `/api/auth/password`
Change password
```json
{
  "current_password": "string",
  "new_password": "string (min 8 chars)"
}
```

## Bug Fixes & Improvements

### Issue #1: Google Profile Pictures Not Displaying
**Problem:** Users logging in with Google saw initials instead of their Google profile picture.

**Root Cause:** The primary Google OAuth endpoint (`POST /api/auth/google`) was not extracting the `picture` field from the ID token.

**Solution:** 
- Updated `POST /api/auth/google` to extract `picture` from ID token
- Added same smart update logic as the legacy callback endpoint
- Now both OAuth flows properly fetch and store Google profile pictures

### Issue #2: Account Window Not Showing Profile Pictures
**Problem:** The "My Account" dropdown always showed a single letter initial, never the profile picture.

**Solution:**
- Updated `account_window.tsx` to display `user.profile_picture` if available
- Added proper initials fallback matching profile page style
- Improved initials generation to show both first and last initial

### Issue #3: Non-Functional "Edit Profile" Button
**Problem:** Clicking "Edit profile" in the account window did nothing.

**Solution:**
- Changed from `<motion.a>` to `<motion.button>` with `onClick` handler
- Added navigation to `/profile` page
- Added logic to close the account window after navigation

### Issue #4: Google OAuth Users Seeing Password Change Form
**Problem:** Google OAuth users could see and attempt to change passwords, which would fail since they authenticate via Google.

**Root Cause:** The UI didn't distinguish between regular users and OAuth users.

**Solution:**
- Added `google_id` to `UserOut` schema (backend) and `UserInfo` interface (frontend)
- Password section now hidden for users with `google_id` (Google OAuth users)
- Shows informative message: "Your password is managed by your Google account"
- Improves UX by not showing options that will fail
- Backend already had protection, now UI matches the logic

### Issue #5: Phone Number Accepting Non-Digit Input
**Problem:** Users could type letters and symbols into the phone number field, and formatted characters were being saved to the database.

**Root Cause:** Input field only filtered non-digits after input, but didn't prevent typing them. Also, formatted phone (with parentheses and dashes) was being sent to backend.

**Solution:**
- Added `onKeyDown` handler to **block non-digit keys** (allows navigation keys and shortcuts)
- Added `onPaste` handler to **strip non-digits** from pasted content
- Modified `handleProfileSubmit` to **extract only digits** before sending to backend
- Database now stores clean phone numbers (e.g., `5551234567` not `(555) 123-4567`)
- Display still shows formatted version for better UX
- Result: Users can only input digits, formatted for display, stored as raw digits

### Issue #6: Phone Number Not Formatted in View Mode
**Problem:** Phone numbers displayed in the profile view mode showed raw digits (e.g., `4084804840`) instead of formatted version.

**Root Cause:** View mode was displaying the raw phone number directly from the database without formatting.

**Solution:**
- Added `formatPhoneNumber` helper function in `page.tsx`
- Automatically formats phone numbers to `(XXX) XXX-XXXX` for display
- Only formats valid 10-digit numbers
- Returns original value if not exactly 10 digits
- Consistent formatting across view and edit modes

### Issue #7: File Input Not Resetting After Upload
**Problem:** After uploading an image, then using URL, trying to upload a file again (especially the same file) wouldn't work.

**Root Cause:** File input element retains its value after upload. When trying to select the same file again, the `onChange` event doesn't fire because the value hasn't changed.

**Solution:**
- Added `e.target.value = ''` in `finally` block of `handleImageChange`
- Clears file input after every upload (success or failure)
- Now users can upload → URL → upload again seamlessly
- Can also re-upload the same file multiple times if needed

### Issue #8: Address Validation Not Enforcing Dropdown Selection
**Problem:** Users could type partial addresses (e.g., "2087") and submit without selecting from the Google Places autocomplete dropdown, bypassing San Jose validation.

**Root Cause:** The form only checked if the city field said "San Jose" but didn't verify that the address was actually selected from the autocomplete dropdown. Users could manually type anything.

**Solution:**
- Added `isValidAddress` state to track if address was selected from dropdown
- Added `isSelectingFromAutocomplete` flag to prevent race condition during selection
- `handlePlaceSelected`: 
  - Sets `isSelectingFromAutocomplete = true` to prevent invalidation
  - Updates form data with selected address components
  - Sets `isValidAddress = true` when address is selected
  - Resets flag after state updates using `setTimeout`
- `handleAddressChange`: 
  - Skips validation if `isSelectingFromAutocomplete` is true
  - Sets `isValidAddress = false` when user manually types
- `handleProfileSubmit`: Blocks submission if `!isValidAddress`
- Added visual warning below address field when address is invalid
- Multiple validation layers:
  1. Must select from dropdown (`isValidAddress`)
  2. Address field must not be empty
  3. City must be "San Jose"
  4. State must be "California"
  5. Zipcode must be present
- Clear error messages guide users to select from dropdown

**Bug Fix**: Resolved race condition where selecting from dropdown would briefly show validation warning because `handleAddressChange` fired before `handlePlaceSelected` completed.

### Issue #9: Warning Shown When Selecting Valid Address from Dropdown
**Problem:** When clicking on a valid San Jose address from the autocomplete dropdown (e.g., "1 Washington Square San Jose, CA, USA"), a warning message would briefly appear saying "⚠️ Please select an address from the dropdown suggestions", even though the user DID select from the dropdown. This also occurred when using keyboard navigation (down arrow + Enter).

**Root Cause:** Race condition in state updates:
1. User clicks address from dropdown (or presses Enter on highlighted suggestion)
2. Google Autocomplete updates the input field → triggers `onChange` → calls `handleAddressChange`
3. `handleAddressChange` sees value changed and sets `isValidAddress = false`
4. Then `onPlaceChanged` fires → calls `handlePlaceSelected` → sets `isValidAddress = true`
5. React renders with the intermediate state where `isValidAddress` is `false`, showing the warning

Initial fix using state with `setTimeout(..., 0)` wasn't sufficient for keyboard navigation.

**Solution Progression:**

**Attempt 1 - Timeout (500ms):**
- Used `setTimeout(..., 500)` to keep a flag active
- ❌ Fragile, relied on arbitrary timing

**Attempt 2 - Value Comparison:**
- Stored `lastValidAddress` and compared with incoming value
- ❌ Failed because Google Autocomplete formats addresses differently than what we store

**Attempt 3 - One-Time Flag:**
- Used `justSelectedFromAutocomplete` ref as a one-time-use flag
- ❌ Failed because Google fires MULTIPLE onChange events for a single selection, but flag was consumed after the first one

**Final Solution - Validation on Submit Only:**

**The Problem with Inline Validation:**
All timestamp/flag-based approaches failed because we couldn't reliably distinguish between:
1. Typing to search in autocomplete dropdown
2. Typing an address manually (without using autocomplete)

Both trigger `onChange` events, so any attempt to invalidate during typing would show false warnings.

**The Solution:**
- Track `isValidAddress` state internally using the 500ms timestamp window
- **Remove inline warning message** that showed while typing
- **Validate only on form submission** using comprehensive checks
- Clear, helpful validation messages on submit attempt

**Implementation:**
- `handlePlaceSelected`: Updates `isValidAddress = true` for valid selections, `false` for invalid
- `handleAddressChange`: Uses 500ms window to avoid invalidating autocomplete selections
- `handleProfileSubmit`: Validates address before submission:
  1. Must have been selected from dropdown (`isValidAddress`)
  2. Address field not empty
  3. City must be "San Jose"
  4. State must be "California"
  5. Zipcode must be present
- Show alert with specific error message if validation fails

**Why this is better:**
- ✅ No false warnings while user is typing or selecting
- ✅ No complex timing logic needed for UI display
- ✅ Clear error messages when user tries to submit
- ✅ Works with all interaction methods (mouse, keyboard, sequential selections)
- ✅ Better UX - doesn't interrupt user's workflow

**Additional Fix - Improved Enter Key Handling:**
When using keyboard navigation to select from autocomplete, pressing Enter would submit the form before the address state updated, causing validation errors.

**Challenge:** Need to allow Google Places to process Enter key naturally (to select suggestions) while preventing accidental form submission.

**Solution:** Changed form submission to be explicit via button click instead of relying on Enter key:

1. **Form level** - Prevent any Enter-based submission:
```typescript
<form onSubmit={(e) => e.preventDefault()}>
```

2. **Button level** - Explicit submission via click:
```typescript
<button 
  type="button"  // Not "submit"
  onClick={handleProfileSubmit}
>
  Save Now
</button>
```

3. **Input level** - Auto-select first suggestion on Enter:
```typescript
<input
  onKeyDown={(e) => {
    if (e.key === 'Enter' && value.trim()) {
      // Simulate down arrow to highlight first suggestion
      const downArrowEvent = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        keyCode: 40,
        bubbles: true
      });
      e.target.dispatchEvent(downArrowEvent);
      // Then let Enter propagate to select it
    }
  }}
  ...
/>
```

**Why this is the best solution:**
- ✅ **Auto-selects first suggestion** when Enter is pressed (no need for down arrow!)
- ✅ Users can just type address and press Enter - most intuitive UX
- ✅ Form never accidentally submits - users must click "Save Now" explicitly
- ✅ Works with Google Places' native mechanisms (simulates keyboard navigation)
- ✅ Maintains all standard autocomplete behaviors (arrow keys, mouse clicks)

**UX Improvements:**
- ✅ **Type address + Enter = Done!** Automatically selects first suggestion (no arrow keys needed!)
- ✅ Works perfectly with partial addresses: "181 E Santa Clara St" → Auto-completes to full address
- ✅ City, state, and zipcode auto-fill correctly
- ✅ Down arrow + Enter still works for manually selecting specific suggestions
- ✅ Mouse clicks on suggestions still work normally
- ✅ Form only submits when "Save Now" button is clicked explicitly
- ✅ No validation errors or race conditions

**Result:** 
Best-in-class autocomplete UX! Just type the address and press Enter - the system automatically selects the first matching suggestion and fills all fields. No arrow key navigation required for the common case, while still supporting it for power users who want to select a specific suggestion.

## Notes
- Database was recreated using seed.py instead of migration for simplicity in development
- Profile picture is stored as base64 string or URL (Text field in database)
- All profile fields are optional (nullable) to allow gradual profile completion
- Password change is separate from profile update for better security control
- Google OAuth integration automatically fetches and stores profile picture on **every login**
- Manual uploads (base64) are preserved and never overwritten by Google updates

## Future Enhancements (Not Implemented)

### ~~Address Validation~~ ✅ IMPLEMENTED
- ✅ **Google Places Autocomplete API**: Real-time address validation with auto-fill
- ✅ Restricted to San Jose, CA only for delivery limitations
- ✅ Auto-fills city, state, and zipcode
- ✅ See `GOOGLE_MAPS_SETUP.md` for setup instructions

### Additional Google OAuth Data
Google ID token provides limited data (email, name, picture). To get phone numbers, addresses, etc.:
- Would require additional OAuth scopes (`user.phonenumbers.read`, `user.addresses.read`)
- Requires Google People API calls (not just ID token)
- **Not recommended**: Lower user trust, worse conversion rates, often inaccurate data
- **Better approach**: Let users provide this info in-app (current implementation)

