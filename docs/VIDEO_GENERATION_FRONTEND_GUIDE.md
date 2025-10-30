# Video Generation Frontend - User Guide

## Overview

The admin inventory management system now includes AI-powered video generation for product items. Admins can generate professional 8-second marketing videos with native audio using Google's Veo 3.1 model.

## Features Implemented

### Backend Updates
✅ Added `video_url` field to Item database model  
✅ Updated API schemas to accept video URLs in item creation/editing  
✅ Video generation API endpoints integrated  

### Frontend Updates
✅ Video generation UI in admin inventory form  
✅ Video preview in item detail page  
✅ Video quality selection (Fast vs Standard)  
✅ Cost warning before generation  

## How to Use

### 1. Navigate to Admin Inventory

1. Log in as an admin user
2. Go to **Admin Dashboard** → **Inventory Management**
3. Click **+ Add New Item** or click **Edit** on an existing item

### 2. Generate a Video

In the item form, scroll down to the **Product Video (Optional)** section:

1. **Select Video Quality:**
   - **Fast (~30s, $0.10)**: Quicker generation, good quality
   - **Best Quality (~60s, $0.15)**: Slower generation, highest quality

2. **Describe Your Video:**
   Enter a detailed description of what you want in the video. For example:
   ```
   A fresh organic apple rotating slowly on a white surface with soft 
   lighting and a subtle shadow
   ```

3. **Click "🎬 Generate Video with AI"**
   - You'll see a confirmation dialog about cost and time
   - Click OK to proceed
   - Wait 30-60 seconds for generation (the button will show a loading spinner)

4. **Preview the Video:**
   - Once generated, the video preview will appear below
   - You can play it to check if it meets your needs
   - Click **Remove Video** if you want to regenerate with a different prompt

5. **Save the Item:**
   - Click **Create Item** or **Update Item** to save with the video
   - The video is now associated with this product

### 3. View Videos on Product Pages

Videos automatically display on product detail pages:

1. Navigate to the customer-facing site
2. Click on any product that has a video
3. The video will appear below the product image
4. Customers can play the video with controls

## Prompt Writing Tips

### Good Prompts ✅

```
"A basket of fresh organic vegetables on a wooden table, camera 
slowly panning right, warm morning sunlight, farm-fresh aesthetic"
```

```
"Close-up of honey drizzling onto pancakes in slow motion, with 
the sound of liquid pouring, warm cinematic lighting"
```

```
"A red bell pepper rotating on a marble countertop, water droplets 
glistening, soft studio lighting, professional product photography style"
```

### Key Elements to Include

1. **Subject**: What's in the video (apple, vegetables, etc.)
2. **Action**: What's happening (rotating, drizzling, etc.)
3. **Environment**: Where it's happening (wooden table, marble countertop)
4. **Lighting**: Type of light (soft, warm, natural)
5. **Style**: Overall aesthetic (professional, cinematic, farm-fresh)
6. **Audio**: Sounds you want (optional but helpful)

### Poor Prompts ❌

- ❌ "A tomato" (too vague)
- ❌ "Food video" (not specific)
- ❌ "Make something cool" (no actionable details)

## Cost Management

**Important:** Video generation is a paid service

- **Fast Model**: ~$0.10 per video
- **Standard Model**: ~$0.15 per video
- Videos are 8 seconds long with audio
- Resolution: 720p or 1080p

**Best Practices:**
1. Use **Fast model** for testing and most products
2. Use **Best Quality** only for hero products or campaigns
3. Review your prompt before generating to avoid wasted generations
4. Videos are saved as base64 data, so they don't require external hosting

## Technical Details

### Video Specifications
- **Duration**: 8 seconds
- **Resolution**: 720p or 1080p (automatic)
- **Format**: MP4 with audio
- **Audio**: Native audio generation (dialogue, sound effects, ambiance)
- **Storage**: Base64-encoded data URI stored in database

### Generation Time
- **Fast Model**: 25-35 seconds average
- **Standard Model**: 45-60 seconds average

### Browser Compatibility
Videos use standard HTML5 `<video>` tags and work in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Troubleshooting

### "Failed to generate video"
- **Check your API key**: Ensure `GEMINI_API_KEY` is set in `backend/.env`
- **Check billing**: Video generation requires a paid Gemini API account
- **Try again**: Sometimes the service is temporarily busy
- **Simplify prompt**: Complex prompts might fail, try something simpler

### Video generation timeout
- This is normal for the first time
- The backend uses synchronous generation (blocks for 30-60s)
- Make sure your server timeout is set high enough

### Video won't play
- Check browser console for errors
- Verify the video was saved (check the database or preview in the form)
- Try a different browser
- Check if the base64 data is valid

### "Quota exceeded"
- You've hit your daily API quota
- Wait 24 hours or upgrade your Gemini API plan
- Check usage at https://ai.google.dev/usage

### Cost concerns
- Set up budget alerts in Google Cloud Console
- Monitor usage in the Gemini API dashboard
- Consider implementing additional rate limiting

## Database Migration

**Important:** You'll need to migrate your database to add the `video_url` field:

```bash
# Option 1: Drop and recreate (loses data)
rm backend/sqlite.db
PYTHONPATH=. python -m backend.app.seed

# Option 2: Manual migration (preserves data)
# Connect to your database and run:
# ALTER TABLE items ADD COLUMN video_url TEXT;
```

## API Endpoints Used

- `POST /api/admin/video/generate-sync` - Generate video (blocks until complete)
- `POST /api/admin/video/generate` - Generate async (returns operation ID)
- `GET /api/admin/video/status/{operation_id}` - Check generation status
- `GET /api/admin/video/health` - Check API configuration

## Future Enhancements

Potential features that could be added:

1. **Async Generation with Polling**: Better UX for long-running generations
2. **Video Extension**: Extend videos to create longer content
3. **Reference Images**: Guide generation with product images
4. **First & Last Frame**: Create transitions between images
5. **Video Library**: Store and reuse previously generated videos
6. **Batch Generation**: Generate videos for multiple products at once

## Support

For issues or questions:

1. Check the [Video API Documentation](../backend/docs/api/VIDEO_API.md)
2. Check the [Setup Guide](SETUP_AI_VIDEO_GENERATION.md)
3. Review the [Examples](../backend/docs/VIDEO_GENERATION_EXAMPLES.md)
4. Test the backend: `python backend/test_video_generation.py`
5. Check backend logs for error details

## Summary

Video generation is now fully integrated into the inventory management system! Admins can:
- Generate professional videos directly from the item form
- Choose between fast and best quality options
- Preview videos before saving
- Display videos on product detail pages

The feature is production-ready and follows the same patterns as the existing image generation feature.

