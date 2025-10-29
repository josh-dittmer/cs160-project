"""
AI Image Generation Router
Handles image generation using Google Gemini API
"""
import os
import base64
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from PIL import Image

from ..auth import require_admin, UserCtx

router = APIRouter(prefix="/api/admin/image", tags=["image-generation"])


class ImageGenerationRequest(BaseModel):
    """Request model for AI image generation"""
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text prompt describing the desired image")


class ImageGenerationResponse(BaseModel):
    """Response model containing the generated image"""
    image_data: str = Field(..., description="Base64-encoded image data URI")
    prompt: str = Field(..., description="The prompt that was used")


def initialize_gemini_client():
    """Initialize Gemini client with API key from environment"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY not configured. Please add it to your .env file."
        )
    return genai.Client(api_key=api_key)


@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    admin: UserCtx = Depends(require_admin),
):
    """
    Generate an image using AI based on a text prompt.
    
    This endpoint uses Google's Gemini 2.5 Flash Image model to generate
    product images from text descriptions. The generated image is
    returned as a base64-encoded data URI that can be used directly
    in the frontend.
    
    Admin only.
    """
    try:
        # Initialize Gemini client
        client = initialize_gemini_client()
        
        # Use the specialized image generation model
        model = "gemini-2.5-flash-image"
        
        # Prepend default context to ensure high-quality food product images
        default_context = "Your job is to generate extremely appealing food product images for an online food store. The images should be high-quality, professional, and appealing to the target audience."
        full_prompt = default_context + request.prompt
        
        # Prepare content with the enhanced prompt
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=full_prompt),
                ],
            ),
        ]
        
        # Configure to explicitly request image output
        generate_content_config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        )
        
        # Generate image using streaming API
        image_bytes = None
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            # Check if chunk has valid data
            if (
                chunk.candidates is None
                or chunk.candidates[0].content is None
                or chunk.candidates[0].content.parts is None
            ):
                continue
            
            # Extract image data from inline_data
            part = chunk.candidates[0].content.parts[0]
            if part.inline_data and part.inline_data.data:
                image_bytes = part.inline_data.data
                break  # We got the image, no need to continue streaming
        
        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No image was generated. The AI model may have blocked the request or encountered an error. Try rephrasing your prompt."
            )
        
        # Convert to PIL Image to validate and optimize
        try:
            img = Image.open(BytesIO(image_bytes))
            
            # Convert to RGB if necessary (some formats may have alpha channel)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            
            # Save as JPEG to reduce size
            output_buffer = BytesIO()
            img.save(output_buffer, format='JPEG', quality=85, optimize=True)
            output_buffer.seek(0)
            
            # Encode as base64 data URI
            base64_image = base64.b64encode(output_buffer.read()).decode('utf-8')
            image_data_uri = f"data:image/jpeg;base64,{base64_image}"
            
        except Exception as img_error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process generated image: {str(img_error)}"
            )
        
        return ImageGenerationResponse(
            image_data=image_data_uri,
            prompt=request.prompt
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log the error for debugging
        print(f"Image generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate image: {str(e)}"
        )


@router.get("/health")
async def check_api_health(
    admin: UserCtx = Depends(require_admin),
):
    """
    Check if the Gemini API is properly configured.
    Admin only.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return {
            "configured": False,
            "message": "GEMINI_API_KEY not found in environment variables"
        }
    
    return {
        "configured": True,
        "message": "Gemini API key is configured",
        "key_preview": f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
    }

