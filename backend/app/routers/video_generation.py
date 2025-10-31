"""
AI Video Generation Router
Handles video generation using Google Gemini Veo 3.1 API
"""
import os
import time
import base64
import requests
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import Response
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from ..auth import require_admin, UserCtx

router = APIRouter(prefix="/api/admin/video", tags=["video-generation"])


class VideoGenerationRequest(BaseModel):
    """Request model for AI video generation"""
    prompt: str = Field(
        ..., 
        min_length=1, 
        max_length=1000, 
        description="Text prompt describing the desired video content"
    )
    model: str = Field(
        default="veo-3.1-generate-preview",
        description="Video generation model to use (veo-3.1-generate-preview or veo-3.1-fast-generate-preview)"
    )


class VideoGenerationResponse(BaseModel):
    """Response model containing video generation status"""
    status: str = Field(..., description="Status of video generation (processing, completed, failed)")
    video_data: Optional[str] = Field(None, description="Base64-encoded video data (MP4) when completed")
    operation_id: Optional[str] = Field(None, description="Operation ID for polling status")
    prompt: str = Field(..., description="The prompt that was used")
    message: Optional[str] = Field(None, description="Status message or error details")


class VideoStatusResponse(BaseModel):
    """Response model for checking video generation status"""
    status: str = Field(..., description="Status of video generation (processing, completed, failed)")
    video_data: Optional[str] = Field(None, description="Base64-encoded video data (MP4) when completed")
    message: Optional[str] = Field(None, description="Status message")


def initialize_gemini_client():
    """Initialize Gemini client with API key from environment"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY not configured. Please add it to your .env file."
        )
    # Create and return client
    client = genai.Client(api_key=api_key)
    return client


# In-memory storage for operation tracking (in production, use Redis or database)
video_operations = {}


@router.post("/generate", response_model=VideoGenerationResponse)
async def generate_video(
    request: VideoGenerationRequest,
    admin: UserCtx = Depends(require_admin),
):
    """
    Generate a video using AI based on a text prompt.
    
    This endpoint uses Google's Veo 3.1 model to generate videos from text descriptions.
    Video generation is asynchronous and may take 30-60 seconds. This endpoint initiates
    the generation and returns an operation ID that can be used to poll for completion.
    
    For synchronous generation (blocks until complete), use the /generate-sync endpoint.
    
    Admin only.
    """
    try:
        # Initialize Gemini client
        client = initialize_gemini_client()
        
        # Validate model selection
        valid_models = ["veo-3.1-generate-preview", "veo-3.1-fast-generate-preview"]
        if request.model not in valid_models:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid model. Must be one of: {', '.join(valid_models)}"
            )
        
        # Add context for food/product videos if appropriate
        default_context = "Only in English language. Create an EXCITING, CAPTIVATING, and VISUALLY STUNNING advertisement video that makes customers desperately want to buy this food product. Use dynamic camera angles, vibrant colors, appetizing close-ups, creative lighting, and emotional storytelling to create maximum impact and desire. The video should be professional, cinematic, and highly engaging - think premium food commercials that make viewers crave the product immediately. Be creative and bold with presentation while staying realistic: all physics/motion must be realistic (objects move naturally, proper gravity/momentum), food preparation must follow food safety practices (wash produce, use clean ingredients), and human actions must be physically possible (realistic bites, natural movements). Content must be logically believable - no impossible health claims or absurd scenarios, keep it credible. Do not include any logos, brand names, or text overlays. If dialogue or speech is specified in quotes, the person must say EXACTLY those words and ONLY those words - nothing before, nothing after, no additional speech or sounds. Start immediately with the specified content. "
        full_prompt = default_context + request.prompt
        
        # Start video generation operation
        try:
            # Create source and config using proper types
            # Note: Veo 3.1 currently supports text-to-video OR image-to-video, not both simultaneously
            print("Submitting async video generation request to Gemini API...")
            
            source = types.GenerateVideosSource(prompt=full_prompt)
            config = types.GenerateVideosConfig(
                number_of_videos=1,
                resolution="720p",
                aspect_ratio="16:9"
            )
            
            operation = client.models.generate_videos(
                model=request.model,
                source=source,
                config=config
            )
            
            # Store operation for polling
            operation_id = operation.name
            video_operations[operation_id] = {
                "operation": operation,
                "operation_name": operation.name,  # Store the name string separately
                "prompt": request.prompt,
                "status": "processing",
                "client": client  # Store client for polling
            }
            
            return VideoGenerationResponse(
                status="processing",
                operation_id=operation_id,
                prompt=request.prompt,
                message="Video generation started. Use the operation_id to check status."
            )
            
        except Exception as api_error:
            error_msg = str(api_error)
            # Provide more helpful error messages for common issues
            if "500" in error_msg or "INTERNAL" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Google AI service is temporarily unavailable. Please try again in a moment."
                )
            elif "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="AI service quota exceeded. Please wait a moment and try again."
                )
            elif "quota" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Daily video generation quota exceeded. Please try again tomorrow."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"AI service error: {error_msg}"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Video generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video generation failed: {str(e)[:200]}"
        )


@router.get("/status/{operation_id}", response_model=VideoStatusResponse)
async def check_video_status(
    operation_id: str,
    admin: UserCtx = Depends(require_admin),
):
    """
    Check the status of a video generation operation.
    
    Poll this endpoint to check if video generation is complete.
    When status is 'completed', the video_data field will contain the base64-encoded video.
    
    Admin only.
    """
    if operation_id not in video_operations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found. It may have expired or never existed."
        )
    
    op_data = video_operations[operation_id]
    
    try:
        # Get the stored client and operation
        client = op_data.get("client")
        if not client:
            client = initialize_gemini_client()
        
        # Refresh operation status by passing the operation object itself
        operation = client.operations.get(op_data["operation"])
        
        if not operation.done:
            return VideoStatusResponse(
                status="processing",
                message="Video generation in progress. Please check again in a few seconds."
            )
        
        if operation.error:
            video_operations[operation_id]["status"] = "failed"
            return VideoStatusResponse(
                status="failed",
                message=f"Video generation failed: {operation.error.message}"
            )
        
        # Operation completed - get the video using response attribute (official API pattern)
        if operation.response and hasattr(operation.response, 'generated_videos'):
            videos = operation.response.generated_videos
            
            if not videos or len(videos) == 0:
                video_operations[operation_id]["status"] = "failed"
                return VideoStatusResponse(
                    status="failed",
                    message="No videos were generated."
                )
            
            first_video = videos[0]
            if not first_video.video or not first_video.video.uri:
                video_operations[operation_id]["status"] = "failed"
                return VideoStatusResponse(
                    status="failed",
                    message="Generated video is missing a URI."
                )
            
            video_object = first_video.video
            url = video_object.uri
            
            # Download video file using the URI with API key
            api_key = os.getenv("GEMINI_API_KEY")
            download_url = f"{url}&key={api_key}"
            
            response = requests.get(download_url)
            if not response.ok:
                raise Exception(f"Failed to fetch video: {response.status_code} {response.reason}")
            
            video_bytes = response.content
            
            # Convert to base64 for response
            video_base64 = base64.b64encode(video_bytes).decode('utf-8')
            video_data_uri = f"data:video/mp4;base64,{video_base64}"
            
            # Update operation status
            video_operations[operation_id]["status"] = "completed"
            video_operations[operation_id]["video_data"] = video_data_uri
            
            return VideoStatusResponse(
                status="completed",
                video_data=video_data_uri,
                message="Video generation completed successfully."
            )
        else:
            # Operation completed but no video generated
            video_operations[operation_id]["status"] = "failed"
            return VideoStatusResponse(
                status="failed",
                message="Video generation completed but no video was produced."
            )
            
    except Exception as e:
        print(f"Error checking video status: {str(e)}")
        video_operations[operation_id]["status"] = "failed"
        return VideoStatusResponse(
            status="failed",
            message=f"Error retrieving video: {str(e)[:200]}"
        )


@router.post("/generate-sync", response_model=VideoGenerationResponse)
async def generate_video_sync(
    request: VideoGenerationRequest,
    admin: UserCtx = Depends(require_admin),
):
    """
    Generate a video synchronously (blocks until complete).
    
    This endpoint waits for video generation to complete before returning.
    Video generation typically takes 30-60 seconds. Use this for simpler workflows
    where you want to wait for the result.
    
    For better UX with long-running operations, use the async /generate endpoint
    and poll /status/{operation_id}.
    
    Admin only.
    """
    try:
        # Initialize Gemini client
        client = initialize_gemini_client()
        
        # Validate model selection
        valid_models = ["veo-3.1-generate-preview", "veo-3.1-fast-generate-preview"]
        if request.model not in valid_models:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid model. Must be one of: {', '.join(valid_models)}"
            )
        
        # Add context for food/product videos
        default_context = "Only in English language. Create an EXCITING, CAPTIVATING, and VISUALLY STUNNING advertisement video that makes customers desperately want to buy this food product. Use dynamic camera angles, vibrant colors, appetizing close-ups, creative lighting, and emotional storytelling to create maximum impact and desire. The video should be professional, cinematic, and highly engaging - think premium food commercials that make viewers crave the product immediately. Be creative and bold with presentation while staying realistic: all physics/motion must be realistic (objects move naturally, proper gravity/momentum), food preparation must follow food safety practices (wash produce, use clean ingredients), and human actions must be physically possible (realistic bites, natural movements). Content must be logically believable - no impossible health claims or absurd scenarios, keep it credible. Do not include any logos, brand names, or text overlays. If dialogue or speech is specified in quotes, the person must say EXACTLY those words and ONLY those words - nothing before, nothing after, no additional speech or sounds. Start immediately with the specified content. "
        full_prompt = default_context + request.prompt
        
        # Start video generation operation
        try:
            # Create source and config using proper types
            # Note: Veo 3.1 currently supports text-to-video OR image-to-video, not both simultaneously
            print("Submitting video generation request to Gemini API...")
            
            source = types.GenerateVideosSource(prompt=full_prompt)
            config = types.GenerateVideosConfig(
                number_of_videos=1,
                resolution="720p",
                aspect_ratio="16:9"
            )
            
            operation = client.models.generate_videos(
                model=request.model,
                source=source,
                config=config
            )
            
            print(f"Video generation operation started: {operation.name}")
            
            # Poll until completion (with timeout)
            max_wait_time = 1200  # 20 minutes max
            poll_interval = 10  # Check every 10 seconds
            elapsed_time = 0
            
            while not operation.done and elapsed_time < max_wait_time:
                time.sleep(poll_interval)
                elapsed_time += poll_interval
                print(f"...Generating... ({elapsed_time}s)")
                # Refresh operation status by passing the operation object itself
                operation = client.operations.get(operation)
            
            if not operation.done:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Video generation timed out after 20 minutes. This may happen with complex prompts or API delays. Please try again with a simpler prompt or contact support."
                )
            
            if operation.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Video generation failed: {operation.error.message}"
                )
            
            # Debug: Print the operation response structure
            print(f"Operation done! Checking response...")
            print(f"Has response: {hasattr(operation, 'response')}")
            if hasattr(operation, 'response'):
                print(f"Response type: {type(operation.response)}")
                print(f"Response attributes: {dir(operation.response)}")
            
            # Get the generated video using the response attribute (official API pattern)
            if operation.response and hasattr(operation.response, 'generated_videos'):
                videos = operation.response.generated_videos
                print(f"Number of videos: {len(videos) if videos else 0}")
                
                if not videos or len(videos) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="No videos were generated. The operation completed but returned an empty video list."
                    )
                
                first_video = videos[0]
                if not first_video.video or not first_video.video.uri:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Generated video is missing a URI."
                    )
                
                video_object = first_video.video
                url = video_object.uri
                
                # Download video file using the URI with API key
                api_key = os.getenv("GEMINI_API_KEY")
                download_url = f"{url}&key={api_key}"
                
                print(f"Fetching video from: {url}")
                response = requests.get(download_url)
                
                if not response.ok:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to fetch video: {response.status_code} {response.reason}"
                    )
                
                video_bytes = response.content
                
                # Convert to base64 for response
                video_base64 = base64.b64encode(video_bytes).decode('utf-8')
                video_data_uri = f"data:video/mp4;base64,{video_base64}"
                
                return VideoGenerationResponse(
                    status="completed",
                    video_data=video_data_uri,
                    prompt=request.prompt,
                    message="Video generated successfully"
                )
            else:
                # Debug what we actually have
                print(f"Operation response doesn't have generated_videos!")
                if operation.response:
                    print(f"Response content: {operation.response}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No video was generated. The operation completed but the response doesn't contain generated_videos."
                )
                
        except HTTPException:
            raise
        except Exception as api_error:
            error_msg = str(api_error)
            print(f"Video generation error: {error_msg}")
            
            if "500" in error_msg or "INTERNAL" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Google AI service is temporarily unavailable. Please try again in a moment."
                )
            elif "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="AI service quota exceeded. Please wait a moment and try again."
                )
            elif "quota" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Daily video generation quota exceeded. Please try again tomorrow."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"AI service error: {error_msg[:200]}"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Video generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video generation failed: {str(e)[:200]}"
        )


@router.delete("/operation/{operation_id}")
async def delete_operation(
    operation_id: str,
    admin: UserCtx = Depends(require_admin),
):
    """
    Delete a video generation operation from memory.
    
    Use this to clean up completed or failed operations.
    
    Admin only.
    """
    if operation_id in video_operations:
        del video_operations[operation_id]
        return {"message": "Operation deleted successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )


@router.get("/health")
async def check_video_api_health(
    admin: UserCtx = Depends(require_admin),
):
    """
    Check if the Gemini Veo API is properly configured.
    Admin only.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return {
            "configured": False,
            "available": False,
            "message": "GEMINI_API_KEY not found in environment variables",
            "models_available": []
        }
    
    return {
        "configured": True,
        "available": True,
        "message": "Gemini API key is configured for video generation with Veo 3.1",
        "models_available": [
            "veo-3.1-generate-preview",
            "veo-3.1-fast-generate-preview"
        ],
        "key_preview": f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***",
        "note": "Veo 3.1 requires a paid API account with billing enabled. Free tier not supported."
    }

