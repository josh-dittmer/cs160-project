# AI Image Generation Integration

This document describes the AI-powered image generation feature for admin product management.

## Overview

Admins can now generate product images using AI (Google Gemini 2.0 Flash) directly from text prompts when adding or editing inventory items. This provides a third option alongside URL input and file upload.

## Features

- **Text-to-Image Generation**: Generate product images from descriptive text prompts
- **Real-time Preview**: Preview generated images before saving
- **Seamless Integration**: Works alongside existing URL and file upload options
- **Optimized Output**: Images are automatically converted to JPEG format for optimal size

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `google-genai==0.3.0` - Google's latest unified Gemini SDK
- `Pillow==11.0.0` - Image processing library

### 2. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Select or create a Google Cloud project
4. Copy the generated API key

### 3. Configure Environment Variables

Add your Gemini API key to the backend `.env` file:

```bash
# backend/.env
GEMINI_API_KEY=your_api_key_here
```

**Important**: Make sure this file is in `.gitignore` to keep your API key secure.

### 4. Restart the Backend Server

```bash
cd backend
uvicorn app.main:app --reload
```

## Usage

### For Admins

1. Log in as an admin user
2. Navigate to **Admin Dashboard** → **Inventory Management**
3. Click **"+ Add New Item"** or edit an existing item
4. In the **Product Image** section, you'll see three options:
   - **Image URL**: Enter a direct URL to an image
   - **Upload Image**: Upload a file from your computer
   - **🤖 AI Generate**: Generate an image using AI

### Generating Images with AI

1. Click the **"🤖 AI Generate"** button
2. Enter a detailed description in the text area, for example:
   ```
   A fresh organic red apple on a white background, professional product photography
   ```
3. Click **"✨ Generate Image with AI"**
4. Wait 10-30 seconds for the image to generate
5. Preview the generated image below
6. If satisfied, save the product to use this image

### Best Practices for Prompts

**Good prompts are specific and detailed:**

✅ **Good Examples:**
- "A bunch of fresh organic bananas on a white background, professional product photography, bright lighting"
- "A glass bottle of cold-pressed organic olive oil with a green label, studio lighting, white background"
- "A wooden crate filled with fresh farm strawberries, natural lighting, rustic background"

❌ **Avoid vague prompts:**
- "apple" (too vague)
- "food" (not specific)
- "product" (no details)

**Tips:**
- Specify the product clearly
- Mention the background (white, natural, rustic, etc.)
- Describe the lighting (studio, natural, bright, etc.)
- Include style hints (professional, product photography, etc.)

## Technical Details

### API Endpoints

#### Generate Image
```
POST /api/admin/image/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

Request Body:
{
  "prompt": "A fresh organic red apple on a white background"
}

Response:
{
  "image_data": "data:image/jpeg;base64,...",
  "prompt": "A fresh organic red apple on a white background"
}
```

#### Check API Health
```
GET /api/admin/image/health
Authorization: Bearer <admin_token>

Response:
{
  "configured": true,
  "message": "Gemini API key is configured",
  "key_preview": "AIzaSyBx...xyz"
}
```

### Architecture

**Backend:**
- Location: `backend/app/routers/image_generation.py`
- Model: Google Gemini 2.5 Flash Image (`gemini-2.5-flash-image`)
- SDK: `google-genai` (latest unified Gemini SDK)
- Image Processing: PIL/Pillow for format conversion and optimization
- Output: Base64-encoded JPEG data URI
- Streaming: Uses streaming API for efficient image generation

**Frontend:**
- Location: `frontend/src/app/admin/inventory/page.tsx`
- API Client: `frontend/src/lib/api/admin.ts`
- UI: Three-tab interface (URL / Upload / AI Generate)
- Loading States: Spinner animation during generation

### Error Handling

The system handles various error scenarios:

1. **Missing API Key**: Clear error message prompting configuration
2. **Invalid Prompt**: Validation before sending to API
3. **Generation Failure**: User-friendly error messages
4. **Image Processing Errors**: Fallback error handling

### Security

- **Admin-Only Access**: All image generation endpoints require admin authentication
- **API Key Protection**: Stored in environment variables, never exposed to frontend
- **Input Validation**: Prompt length limits (1-1000 characters)

## Troubleshooting

### "GEMINI_API_KEY not configured" Error

**Solution**: Add the API key to your backend `.env` file:
```bash
GEMINI_API_KEY=your_actual_api_key_here
```

### Generation Takes Too Long

**Solution**: 
- Normal generation takes 10-30 seconds
- Check your internet connection
- Try a simpler prompt
- Verify API key is valid and has quota remaining

### "No image was generated" Error

**Solution**:
- The AI may have blocked the request due to safety filters
- Try rephrasing your prompt
- Avoid prompts that could be interpreted as inappropriate
- Use more product-specific language

### Image Quality Issues

**Solution**:
- Be more specific in your prompt
- Mention "high quality" or "professional product photography"
- Specify lighting conditions (studio lighting, natural light, etc.)
- Try generating multiple times with slightly different prompts

## API Rate Limits

Google Gemini API has rate limits:
- Free tier: 60 requests per minute
- For production use, consider upgrading to a paid tier

Monitor your usage at: https://console.cloud.google.com/

## Future Enhancements

Potential improvements for future versions:
- Image-to-image editing (modify existing product images)
- Multi-image generation (generate multiple variations)
- Style presets (modern, rustic, minimalist, etc.)
- Image upscaling for higher resolution
- Batch generation for multiple products

## Support

For issues or questions:
1. Check the error messages in browser console (F12)
2. Verify backend logs for detailed error information
3. Ensure all dependencies are installed correctly
4. Confirm API key has sufficient quota

## References

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [FreeCodeCamp Tutorial: Nano Banana for Image Generation](https://www.freecodecamp.org/news/nano-banana-for-image-generation/)
- [Google AI Studio](https://aistudio.google.com/)

