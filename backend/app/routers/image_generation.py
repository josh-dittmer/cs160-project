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
    prompt: str = Field(..., min_length=1, max_length=1000, description="Text prompt describing the desired image or edits")
    base_image: Optional[str] = Field(None, description="Optional base64-encoded image to edit (for image-to-image editing)")


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
        if request.base_image:
            # Image-to-image editing mode
            default_context = "Your job is to edit food product images for an online food store. Make professional, high-quality edits. Follow the prompt carefully; avoid adding unnecessary details. For example, if the user asks for image of a banana, only provide that, don't add other fruits in the background, etc. unless specified within the prompt."
        else:
            # Text-to-image generation mode
            default_context = "Your job is to generate extremely appealing food product images for an online food store. The images should be high-quality, professional, and appealing to the target audience. Follow the prompt carefully; avoid adding unnecessary details. For example, if the user asks for image of a banana, only provide that, don't add other fruits in the background, etc. unless specified within the prompt."
        
        full_prompt = default_context + request.prompt
        
        # Prepare content parts
        content_parts = [types.Part.from_text(text=full_prompt)]
        
        # If base image provided, add it to the content for image-to-image editing
        if request.base_image:
            # Remove data URI prefix if present (data:image/jpeg;base64,)
            image_data = request.base_image
            mime_type = "image/jpeg"  # default
            
            if image_data.startswith('data:'):
                # Extract mime type from data URI
                prefix = image_data.split(',', 1)[0]
                if 'image/' in prefix:
                    mime_type = prefix.split('data:')[1].split(';')[0]
                image_data = image_data.split(',', 1)[1]
            
            # Decode base64 to bytes
            try:
                image_bytes = base64.b64decode(image_data)
                
                # Preprocess the image: resize if too large and optimize
                img = Image.open(BytesIO(image_bytes))
                
                # Resize if image is too large (max dimension 2048px)
                max_size = 2048
                if max(img.size) > max_size:
                    ratio = max_size / max(img.size)
                    new_size = tuple(int(dim * ratio) for dim in img.size)
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = background
                
                # Save as JPEG to standardize format and reduce size
                processed_buffer = BytesIO()
                img.save(processed_buffer, format='JPEG', quality=85, optimize=True)
                processed_buffer.seek(0)
                image_bytes = processed_buffer.read()
                
                # Add image to content parts
                content_parts.append(
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/jpeg"
                    )
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid base image format: {str(e)}"
                )
        
        # Prepare content with the enhanced prompt and optional image
        contents = [
            types.Content(
                role="user",
                parts=content_parts,
            ),
        ]
        
        # Configure to explicitly request image output with 16:9 aspect ratio
        generate_content_config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
            image_config=types.ImageConfig(
                aspect_ratio="16:9",
            ),
        )
        
        # Generate image using streaming API
        image_bytes = None
        try:
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
        except Exception as api_error:
            error_msg = str(api_error)
            # Provide more helpful error messages for common issues
            if "500" in error_msg or "INTERNAL" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Google AI service is temporarily unavailable. Please try again in a moment. If the issue persists, try with a simpler prompt or a smaller image."
                )
            elif "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="AI service quota exceeded. Please wait a moment and try again."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"AI service error: {error_msg}"
                )
        
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
        error_str = str(e)
        
        # Parse Google API errors and provide helpful messages
        if "500" in error_str and ("INTERNAL" in error_str or "internal error" in error_str.lower()):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google AI service encountered an internal error. This usually happens when the image is too complex or large. Please try: 1) Using a simpler prompt, 2) Using a smaller/different image, 3) Waiting a moment and trying again."
            )
        elif "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI service quota exceeded. Please wait a moment (10-30 seconds) and try again."
            )
        elif "400" in error_str or "invalid" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request. Please check your prompt and image, then try again."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Image generation failed: {error_str[:200]}"  # Limit error message length
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

