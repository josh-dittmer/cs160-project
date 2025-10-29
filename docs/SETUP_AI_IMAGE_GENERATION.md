# Quick Setup: AI Image Generation

## ✅ What's Been Implemented

The AI image generation feature is now fully integrated into your admin inventory system! Here's what you can do:

### Features Added:
1. **Third option for product images**: Alongside URL and file upload, admins can now generate images using AI
2. **Text-to-image generation**: Describe the product and get a professional image
3. **Preview before saving**: See the generated image before saving the product
4. **Seamless integration**: Works with existing create/edit item workflow

## 🚀 Quick Start

### 1. Get Your Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### 2. Add to Your .env File

Create or edit `backend/.env`:

```bash
GEMINI_API_KEY=your_api_key_here
```

### 3. Restart Backend

```bash
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload
```

### 4. Try It Out!

1. Log in as admin
2. Go to **Admin → Inventory**
3. Click **+ Add New Item**
4. Under **Product Image**, click **🤖 AI Generate**
5. Enter a prompt like:
   ```
   Fresh organic strawberries in a wooden basket, white background, professional product photography
   ```
6. Click **✨ Generate Image with AI**
7. Wait ~10-30 seconds
8. Preview and save!

## 📝 Example Prompts

Good prompts are specific:

- ✅ "A ripe yellow banana on a white background, studio lighting"
- ✅ "Fresh organic tomatoes in a wicker basket, natural lighting"
- ✅ "Glass bottle of extra virgin olive oil, professional product photo"
- ❌ "banana" (too vague)
- ❌ "food" (not specific)

## 🔧 Technical Details

**Backend:**
- New endpoint: `POST /api/admin/image/generate`
- Model: Google Gemini 2.0 Flash Experimental
- Returns: Base64-encoded JPEG image

**Frontend:**
- Three-tab interface in admin inventory form
- Real-time generation with loading state
- Preview before saving

## 📚 Full Documentation

See `docs/AI_IMAGE_GENERATION.md` for complete details including:
- Troubleshooting
- API documentation
- Best practices
- Rate limits

## ⚠️ Important Notes

- **Admin only**: Feature requires admin authentication
- **API key required**: Won't work without `GEMINI_API_KEY` in `.env`
- **Generation time**: 10-30 seconds per image
- **Rate limits**: 60 requests/minute on free tier

---

**That's it! You're ready to generate product images with AI! 🎉**

