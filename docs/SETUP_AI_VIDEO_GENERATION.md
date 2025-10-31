# AI Video Generation Setup Guide

This guide explains how to set up and use the AI-powered video generation feature powered by Google's Veo 3.1 model.

## Overview

The video generation feature enables admins to create professional 8-second marketing videos with:
- **Cinematic quality** in 720p or 1080p resolution
- **Native audio generation** including dialogue and sound effects
- **Multiple generation modes** for speed vs. quality trade-offs
- **Async and sync workflows** for different use cases

## Prerequisites

### 1. Google Gemini API Key

You need a Gemini API key with **paid access**. Veo 3.1 video generation is NOT available on the free tier.

#### Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Get API key"**
4. Create a new project or select an existing one
5. **Enable billing** on your Google Cloud account
6. Copy your API key

#### Enable Billing

Video generation requires a paid API plan:

1. Visit [Google Cloud Console](https://console.cloud.google.com/billing)
2. Enable billing for your project
3. Visit [Gemini API Pricing](https://ai.google.dev/pricing) to understand costs
4. Veo 3.1 pricing (as of October 2025):
   - **Veo 3.1 Standard**: ~$0.15 per video
   - **Veo 3.1 Fast**: ~$0.10 per video

### 2. Backend Setup

Add your Gemini API key to the backend environment:

```bash
# backend/.env
GEMINI_API_KEY=your-gemini-api-key-here
```

The same API key works for both image generation and video generation.

### 3. Install Dependencies

The required package should already be installed:

```bash
pip install google-genai==0.3.0
```

If not, install it:

```bash
cd backend
pip install -r requirements.txt
```

### 4. Restart Backend Server

After adding the API key, restart your backend:

```bash
# Make sure you're in the project root with venv activated
PYTHONPATH=. uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080
```

## Testing the Setup

### Quick Health Check

Test if video generation is configured:

```bash
curl -X GET "http://localhost:8080/api/admin/video/health" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:
```json
{
  "configured": true,
  "message": "Gemini API key is configured for video generation",
  "models_available": [
    "veo-3.1-generate-preview",
    "veo-3.1-fast-generate-preview"
  ]
}
```

### Run Test Script

We've included a comprehensive test script:

```bash
cd backend
python test_video_generation.py
```

The script will:
1. Login as admin
2. Check API health
3. Test error handling
4. Generate test videos (with your permission)
5. Save generated videos to disk

Update the admin credentials in the script if needed:
```python
ADMIN_EMAIL = "admin@sjsu.edu"
ADMIN_PASSWORD = "admin123"
```

## Usage

### API Endpoints

#### 1. Async Generation (Recommended)

Best for production - doesn't block the connection:

```bash
# Start generation
curl -X POST "http://localhost:8080/api/admin/video/generate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A fresh red apple rotating on a white surface with soft lighting",
    "model": "veo-3.1-fast-generate-preview"
  }'

# Returns: { "operation_id": "operations/12345", "status": "processing" }

# Poll for completion
curl -X GET "http://localhost:8080/api/admin/video/status/operations/12345" \
  -H "Authorization: Bearer YOUR_TOKEN"

# When done, returns: { "status": "completed", "video_data": "data:video/mp4;base64,..." }
```

#### 2. Sync Generation (Simpler)

Blocks until complete (30-60 seconds):

```bash
curl -X POST "http://localhost:8080/api/admin/video/generate-sync" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A basket of fresh vegetables on a wooden table",
    "model": "veo-3.1-fast-generate-preview"
  }'
```

### Model Selection

Choose between two models:

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| `veo-3.1-generate-preview` | ~60s | Highest | ~$0.15 | Final marketing videos, hero content |
| `veo-3.1-fast-generate-preview` | ~30s | High | ~$0.10 | Social media, A/B testing, drafts |

## Writing Effective Prompts

### Basic Structure

A good prompt includes:
1. **Subject** - What's in the video
2. **Action** - What's happening
3. **Environment** - Where it's happening
4. **Style** - How it should look
5. **Audio** - What sounds to include

### Examples

#### ✅ Good Prompts

```
1. "A fresh organic tomato slowly rotating on a marble countertop, 
   water droplets glistening in soft morning light, professional 
   product photography style"

2. "Close-up shot of honey drizzling onto a stack of pancakes in 
   slow motion, with the sound of liquid pouring, warm cinematic 
   lighting, shallow depth of field"

3. "A chef's hand placing fresh basil leaves on a pizza, kitchen 
   sounds in background, warm overhead lighting, food documentary 
   style"

4. "Colorful bell peppers (red, yellow, green) arranged on a wooden 
   cutting board, camera slowly panning right, natural window light, 
   with ambient kitchen sounds"

5. "A barista pouring steaming milk into a cup creating latte art, 
   close-up shot, with milk pouring and coffee shop ambiance sounds, 
   warm tones"
```

#### ❌ Poor Prompts

```
1. "A tomato" 
   → Too vague, no context or style

2. "Make a video about vegetables"
   → Not specific about what, where, or how

3. "Food"
   → No actionable details

4. "Super amazing epic vegetables video with explosions"
   → Unrealistic for food content
```

### Prompt Tips

1. **Be Specific**: Include details about lighting, angle, movement
2. **Describe Audio**: Veo 3.1 generates audio, so mention sounds
3. **Specify Camera Work**: "close-up", "panning", "zooming"
4. **Add Style**: "cinematic", "product photography", "documentary style"
5. **Keep it Realistic**: 8 seconds is short, focus on simple actions
6. **Use Food Context**: Mention kitchen, countertop, restaurant, etc.

## Integration Example

### JavaScript/TypeScript Frontend

```typescript
// Generate video asynchronously
async function generateProductVideo(prompt: string) {
  // Step 1: Start generation
  const response = await fetch('/api/admin/video/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      model: 'veo-3.1-fast-generate-preview'
    })
  });

  const { operation_id, status } = await response.json();
  
  if (status !== 'processing') {
    throw new Error('Failed to start video generation');
  }

  // Step 2: Poll for completion
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      const statusResponse = await fetch(
        `/api/admin/video/status/${operation_id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        clearInterval(pollInterval);
        resolve(statusData.video_data);
      } else if (statusData.status === 'failed') {
        clearInterval(pollInterval);
        reject(new Error(statusData.message));
      }
      // Otherwise keep polling
    }, 5000); // Check every 5 seconds

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      reject(new Error('Video generation timeout'));
    }, 120000);
  });
}

// Usage
try {
  const videoDataUri = await generateProductVideo(
    'A fresh apple falling into water with splashes'
  );
  
  // Display video
  const video = document.createElement('video');
  video.src = videoDataUri;
  video.controls = true;
  document.body.appendChild(video);
} catch (error) {
  console.error('Video generation failed:', error);
}
```

### React Component Example

```typescript
import { useState } from 'react';

function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateVideo = async () => {
    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      // Use sync endpoint for simplicity
      const response = await fetch('/api/admin/video/generate-sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          model: 'veo-3.1-fast-generate-preview'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setVideoUrl(data.video_data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your video..."
      />
      
      <button onClick={generateVideo} disabled={loading}>
        {loading ? 'Generating... (30-60s)' : 'Generate Video'}
      </button>

      {error && <div className="error">{error}</div>}
      
      {videoUrl && (
        <video src={videoUrl} controls style={{ maxWidth: '100%' }} />
      )}
    </div>
  );
}
```

## Troubleshooting

### "GEMINI_API_KEY not configured"

- Make sure `GEMINI_API_KEY` is in `backend/.env`
- Restart the backend server after adding the key
- Check the health endpoint: `GET /api/admin/video/health`

### "Quota exceeded" or 429 Error

- Check your usage at https://ai.google.dev/usage
- Verify billing is enabled on your Google Cloud account
- Wait a moment before retrying
- Consider implementing exponential backoff in your code

### "Service temporarily unavailable" or 503 Error

- Google AI service may be experiencing issues
- Wait a moment and retry
- Try using the Fast model which may have more capacity

### Video generation timeout

- Use the async endpoint (`/generate`) instead of sync (`/generate-sync`)
- Poll the status endpoint every 5-10 seconds
- Standard model can take up to 60 seconds

### "Operation not found" when checking status

- Operations may expire after a certain time
- Make sure you're using the correct operation ID
- The operation may have already been deleted

### Videos not playing

- Some browsers may not support the video codec
- Try downloading and opening in VLC or another player
- Check that `video_data` contains a valid data URI starting with `data:video/mp4;base64,`

### Poor quality videos

- Use more descriptive prompts
- Switch to the standard model (`veo-3.1-generate-preview`)
- Include details about lighting, camera angle, and style
- Avoid very complex prompts

## Cost Management

### Estimating Costs

- Each video generation costs approximately:
  - Standard: $0.15 per video
  - Fast: $0.10 per video
- Set up budget alerts in Google Cloud Console
- Monitor usage at https://ai.google.dev/usage

### Best Practices

1. **Use Fast model for testing** - Switch to Standard only for final videos
2. **Implement rate limiting** - Prevent accidental bulk generation
3. **Cache videos** - Store generated videos to avoid regenerating
4. **Validate prompts** - Check prompt quality before generating
5. **Set usage alerts** - Get notified if spending exceeds threshold

## Security Considerations

1. **Admin-only access** - Video generation is restricted to admin users
2. **Rate limiting** - Consider implementing additional rate limits
3. **Input validation** - Prompts are limited to 1000 characters
4. **API key security** - Never expose GEMINI_API_KEY in frontend
5. **Cost monitoring** - Set up budget alerts to prevent unexpected charges

## Future Enhancements

Veo 3.1 supports additional features not yet implemented:

### Video Extension
Extend generated videos to create longer content:
```python
operation = client.models.generate_videos(
    model="veo-3.1-generate-preview",
    prompt="Continue the scene",
    video=previous_video  # Extend from this video
)
```

### First & Last Frame
Generate video between two images:
```python
operation = client.models.generate_videos(
    model="veo-3.1-generate-preview",
    prompt="Smooth transition between frames",
    image=first_frame,
    config=types.GenerateVideosConfig(last_frame=last_frame)
)
```

### Reference Images
Guide generation with up to 3 reference images:
```python
operation = client.models.generate_videos(
    model="veo-3.1-generate-preview",
    prompt="Video featuring this character",
    config=types.GenerateVideosConfig(
        reference_images=[ref_img1, ref_img2, ref_img3]
    )
)
```

These features can be added to the API in the future!

## Additional Resources

- [Veo 3.1 Announcement](https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/)
- [Veo API Documentation](https://ai.google.dev/gemini-api/docs/video)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Video API Endpoints](../backend/docs/api/VIDEO_API.md) - Complete API documentation
- [Google AI Studio](https://aistudio.google.com/) - Try Veo in the web UI

## Support

If you encounter issues:

1. Check the health endpoint
2. Review error messages - they provide specific guidance
3. Run the test script: `python backend/test_video_generation.py`
4. Check the [VIDEO_API.md](../backend/docs/api/VIDEO_API.md) documentation
5. Verify billing is enabled for your Google Cloud project

