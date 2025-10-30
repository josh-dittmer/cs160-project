# Video Generation API

The Video Generation API enables AI-powered video creation using Google's Veo 3.1 model through the Gemini API.

## Overview

Veo 3.1 is Google's state-of-the-art model for generating high-fidelity, 8-second 720p or 1080p videos with:
- **Stunning realism** and cinematic quality
- **Natively generated audio** including dialogue and sound effects
- **Professional production quality** for marketing and advertising

### Available Models

- **veo-3.1-generate-preview**: Best quality, slower generation (~60 seconds)
- **veo-3.1-fast-generate-preview**: Faster generation (~30 seconds), optimized for speed

## Authentication

All endpoints require **admin authentication**. Include the authentication token in your request headers:

```http
Authorization: Bearer <your-token>
```

## Endpoints

### 1. Generate Video (Async)

Start video generation and get an operation ID for polling.

**Recommended for production** - Better UX for long-running operations.

```http
POST /api/admin/video/generate
```

**Request Body:**
```json
{
  "prompt": "A fresh organic tomato rotating slowly on a white background with soft lighting",
  "model": "veo-3.1-generate-preview"
}
```

**Response (202 Accepted):**
```json
{
  "status": "processing",
  "operation_id": "operations/12345",
  "prompt": "A fresh organic tomato rotating...",
  "message": "Video generation started. Use the operation_id to check status."
}
```

### 2. Check Video Status

Poll this endpoint to check if video generation is complete.

```http
GET /api/admin/video/status/{operation_id}
```

**Response (Processing):**
```json
{
  "status": "processing",
  "message": "Video generation in progress. Please check again in a few seconds."
}
```

**Response (Completed):**
```json
{
  "status": "completed",
  "video_data": "data:video/mp4;base64,AAAAHGZ0eXBpc29t...",
  "message": "Video generation completed successfully."
}
```

**Response (Failed):**
```json
{
  "status": "failed",
  "message": "Error details..."
}
```

### 3. Generate Video (Sync)

Generate video and wait for completion (blocks 30-60 seconds).

**Use for testing or simple workflows** - Easier to use but blocks the connection.

```http
POST /api/admin/video/generate-sync
```

**Request Body:**
```json
{
  "prompt": "A basket of fresh fruits on a wooden table, morning sunlight streaming in",
  "model": "veo-3.1-fast-generate-preview"
}
```

**Response (200 OK):**
```json
{
  "status": "completed",
  "video_data": "data:video/mp4;base64,AAAAHGZ0eXBpc29t...",
  "prompt": "A basket of fresh fruits...",
  "message": "Video generated successfully"
}
```

### 4. Delete Operation

Clean up completed/failed operations from memory.

```http
DELETE /api/admin/video/operation/{operation_id}
```

**Response:**
```json
{
  "message": "Operation deleted successfully"
}
```

### 5. Health Check

Verify API configuration and available models.

```http
GET /api/admin/video/health
```

**Response:**
```json
{
  "configured": true,
  "message": "Gemini API key is configured for video generation",
  "models_available": [
    "veo-3.1-generate-preview",
    "veo-3.1-fast-generate-preview"
  ],
  "key_preview": "AIzaSyAa...xyz"
}
```

## Workflow Examples

### Async Workflow (Recommended)

```javascript
// 1. Start generation
const response = await fetch('/api/admin/video/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'A fresh apple falling into water with splashes',
    model: 'veo-3.1-fast-generate-preview'
  })
});

const { operation_id } = await response.json();

// 2. Poll for completion
const checkStatus = async () => {
  const statusResponse = await fetch(`/api/admin/video/status/${operation_id}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  const status = await statusResponse.json();
  
  if (status.status === 'completed') {
    // Video is ready!
    const videoElement = document.createElement('video');
    videoElement.src = status.video_data;
    videoElement.controls = true;
    document.body.appendChild(videoElement);
  } else if (status.status === 'processing') {
    // Check again in 5 seconds
    setTimeout(checkStatus, 5000);
  } else {
    // Failed
    console.error('Generation failed:', status.message);
  }
};

checkStatus();
```

### Sync Workflow (Simpler)

```javascript
// Generate and wait (blocks 30-60 seconds)
const response = await fetch('/api/admin/video/generate-sync', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'A steaming cup of coffee on a cafe table',
    model: 'veo-3.1-fast-generate-preview'
  })
});

const { video_data } = await response.json();

// Display video immediately
const videoElement = document.createElement('video');
videoElement.src = video_data;
videoElement.controls = true;
document.body.appendChild(videoElement);
```

## Prompt Writing Tips

### Best Practices

1. **Be Specific**: Include details about subject, action, environment, lighting
   ```
   Good: "A red bell pepper rotating on a marble countertop with soft natural lighting"
   Bad: "A pepper"
   ```

2. **Describe Audio**: Veo 3.1 generates audio, so include sound descriptions
   ```
   "A chef dicing vegetables, with the sound of knife hitting cutting board"
   ```

3. **Specify Camera Work**: Mention camera angles and movements
   ```
   "Close-up shot of honey drizzling onto pancakes, camera slowly zooming in"
   ```

4. **Add Cinematic Style**: Describe the visual style you want
   ```
   "A bustling farmer's market in cinematic style with warm tones and shallow depth of field"
   ```

### Example Prompts for Food Products

```
1. "A freshly baked loaf of bread on a wooden cutting board, steam rising, 
   soft morning light from the side, close-up shot"

2. "A basket of colorful bell peppers (red, yellow, green) rotating slowly, 
   professional product photography style, clean white background"

3. "A chef's hand pouring olive oil over a fresh salad in slow motion, 
   with the sound of liquid pouring, cinematic lighting"

4. "Fresh oranges being sliced in half with water droplets splashing, 
   high-speed camera shot, bright and vibrant colors"

5. "A rustic wooden table with fresh vegetables arranged artistically, 
   camera panning across the scene, warm afternoon sunlight"
```

## Error Handling

### Common Errors

| Status Code | Error | Solution |
|------------|-------|----------|
| 400 | Invalid model | Use `veo-3.1-generate-preview` or `veo-3.1-fast-generate-preview` |
| 401 | Unauthorized | Check admin authentication token |
| 404 | Operation not found | Operation may have expired or been deleted |
| 429 | Quota exceeded | Wait and retry; daily quota may be reached |
| 500 | GEMINI_API_KEY not configured | Add API key to .env file |
| 503 | Service unavailable | Google AI service is down, retry later |
| 504 | Timeout (sync endpoint) | Use async endpoint for reliability |

### Retry Logic

For production, implement exponential backoff:

```javascript
async function generateVideoWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/admin/video/generate-sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });
      
      if (response.status === 429) {
        // Quota exceeded - wait longer
        await sleep(Math.pow(2, i) * 5000);
        continue;
      }
      
      if (response.ok) {
        return await response.json();
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

## Limitations

- **Video Length**: 8 seconds per generation
- **Resolution**: 720p or 1080p
- **File Format**: MP4 with audio
- **Quota**: Limited by Google Gemini API quota (check pricing)
- **Generation Time**: 30-60 seconds depending on model
- **Prompt Length**: Max 1,000 characters
- **Admin Only**: Only admin users can generate videos

## Future Enhancements

The following Veo 3.1 features are available in the API but not yet implemented:

1. **Video Extension**: Extend existing videos to create longer content
2. **First & Last Frame**: Generate video between two images
3. **Reference Images**: Guide generation with up to 3 reference images

These can be added by extending the `VideoGenerationRequest` model and using the appropriate Gemini API parameters.

## References

- [Veo 3.1 Announcement](https://developers.googleblog.com/en/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/)
- [Veo API Documentation](https://ai.google.dev/gemini-api/docs/video)
- [Gemini API Pricing](https://ai.google.dev/pricing)

## Support

For issues or questions:
1. Check the health endpoint: `GET /api/admin/video/health`
2. Verify GEMINI_API_KEY is set in `.env`
3. Review error messages for specific guidance
4. Check Google AI Studio quota limits

