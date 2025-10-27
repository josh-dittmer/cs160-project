# Google Maps API Setup for Address Autocomplete

## Overview
The profile edit feature uses Google Places Autocomplete API to restrict address selection to San Jose, CA only.

## Step 1: Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API**
   - **Maps JavaScript API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

## Step 2: Restrict Your API Key (Important for Security)

1. Click on your API key to edit it
2. Under **API restrictions**:
   - Select "Restrict key"
   - Enable only:
     - Maps JavaScript API
     - Places API
3. Under **Website restrictions** (Optional):
   - Add your domain: `localhost:3000` for development
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

## Step 4: Restart the Development Server

```bash
npm run dev
```

The Google Places Autocomplete will now work in the profile edit page!

## Pricing

### Free Tier
- **$200 credit per month** (enough for ~28,500 autocomplete requests)
- **No credit card required** for initial setup

### Beyond Free Tier
- **$2.83 per 1,000 requests** for Places Autocomplete (session-based)
- For a small project, the free tier is usually sufficient

## Features Implemented

- ✅ Address autocomplete restricted to San Jose, CA (20km radius)
- ✅ Auto-fills city, state, and zipcode
- ✅ Validates addresses are within San Jose
- ✅ Only shows valid US addresses
- ✅ Prevents typos and invalid addresses
- ✅ Real-time suggestions as you type

## Fallback Behavior

If the API key is not configured or fails to load:
- The address field falls back to a regular text input
- Users can still enter addresses manually
- Form validation still ensures city is "San Jose"

## Troubleshooting

### "This page can't load Google Maps correctly"
- Check that your API key is correct in `.env.local`
- Ensure Places API and Maps JavaScript API are enabled
- Check browser console for specific error messages

### Autocomplete not showing suggestions
- Verify API key has no domain restrictions (or includes localhost:3000)
- Check that you've enabled the correct APIs
- Wait a few minutes after enabling APIs (can take time to propagate)

### "You have exceeded your request quota"
- You've used up your $200 monthly credit
- Add billing information to continue using the API
- Consider implementing usage limits or caching

## Security Notes

- ✅ `.env.local` is in `.gitignore` (not committed to Git)
- ✅ `NEXT_PUBLIC_` prefix makes it available to client-side code
- ✅ Restrict API key to specific APIs and domains in production
- ⚠️ Never commit API keys to version control

