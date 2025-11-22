"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  activateItem,
  permanentlyDeleteItem,
  getCategories,
  generateImage,
  generateVideoSync,
  type ItemAdmin,
  type ItemCreateData,
  type ItemUpdateData
} from '@/lib/api/admin';

export default function InventoryManagement() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<ItemAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemAdmin | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [paramsProcessed, setParamsProcessed] = useState(false);

  useEffect(() => {
    const lowStockParam = searchParams.get('lowStock');
    const statusParam = searchParams.get('status');
    
    // Handle low stock filter
    if (lowStockParam === 'true') {
      setShowLowStockOnly(true);
      setStatusFilter('active');
      setParamsProcessed(true);
      return;
    }
    
    // Not in low stock mode
    setShowLowStockOnly(false);
    
    // Handle status filter from URL
    if (statusParam === 'active' || statusParam === 'inactive' || statusParam === 'all') {
      setStatusFilter(statusParam);
    } else {
      // Default to active when no parameter
      setStatusFilter('active');
    }
    
    setParamsProcessed(true);
  }, [searchParams]);

  useEffect(() => {
    if (!token || !paramsProcessed) return;
    fetchItems();
  }, [token, statusFilter, paramsProcessed]);

  // Cleanup: dismiss all toasts when component unmounts
  useEffect(() => {
    return () => {
      toast.dismiss();
    };
  }, []);

  const fetchItems = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await listItems(token, { 
        status: statusFilter,
        query: searchQuery || undefined,
        limit: 200 
      });
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchItems();
  };

  const handleDelete = async (itemId: number) => {
    if (!token) return;
    
    if (!confirm('Are you sure you want to deactivate this item? This can be reversed later.')) {
      return;
    }

    try {
      await deleteItem(token, itemId);
      toast.dismiss(); // Clear any previous toasts
      toast.success('Item deactivated successfully');
      fetchItems();
    } catch (error: any) {
      console.error('Failed to deactivate item:', error);
      toast.error(error.message || 'Failed to deactivate item');
    }
  };

  const handlePermanentDelete = async (itemId: number, itemName: string) => {
    if (!token) return;
    
    const confirmed = confirm(
      `WARNING: Are you sure you want to PERMANENTLY delete "${itemName}"?\n\n` +
      `This action CANNOT be undone! The item will be completely removed from the database.`
    );
    
    if (!confirmed) return;

    try {
      await permanentlyDeleteItem(token, itemId);
      toast.dismiss(); // Clear any previous toasts
      toast.success('Item permanently deleted from database');
      fetchItems();
    } catch (error: any) {
      console.error('Failed to permanently delete item:', error);
      toast.error(error.message || 'Failed to permanently delete item');
    }
  };

  const handleActivate = async (itemId: number, isActive: boolean) => {
    if (!token) return;
    
    try {
      await activateItem(token, itemId, isActive);
      toast.dismiss(); // Clear any previous toasts
      toast.success(`Item ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchItems();
    } catch (error: any) {
      console.error('Failed to update item status:', error);
      toast.error(error.message || 'Failed to update item status');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading inventory...</div>;
  }

  // Filter items for low stock if needed
  const filteredItems = showLowStockOnly 
    ? items.filter(item => item.stock_qty <= 10 && item.is_active)
    : items;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Inventory Management
          </h2>
          <p className="text-gray-600 mt-1">
            {showLowStockOnly ? 'Showing Low Stock Items (≤10 units)' : 'Manage product catalog'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          + Add New Item
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name or description..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                disabled={showLowStockOnly}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                disabled={showLowStockOnly}
              >
                Search
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                const newStatus = e.target.value as 'active' | 'inactive' | 'all';
                setStatusFilter(newStatus);
                // Update URL to keep it in sync
                router.push(`/admin/inventory?status=${newStatus}`);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              disabled={showLowStockOnly}
            >
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="all">All Items</option>
            </select>
          </div>
        </div>
        {showLowStockOnly && (
          <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <span className="text-sm text-yellow-800">
              Filtering low stock items (stock ≤ 10 units)
            </span>
            <button
              onClick={() => router.push('/admin/inventory')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-lg shadow overflow-hidden ${
              !item.is_active ? 'opacity-60' : ''
            }`}
          >
            <div className="relative h-48 bg-white border-b border-gray-200 flex items-center justify-center">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              )}
              {!item.is_active && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                  Inactive
                </div>
              )}
              {item.stock_qty <= 10 && item.is_active && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">
                  Low Stock
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">
                {item.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {item.category || 'Uncategorized'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Price:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    ${(item.price_cents / 100).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Stock:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {item.stock_qty}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Weight:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {item.weight_oz} oz
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                  >
                    Edit
                  </button>
                  {item.is_active ? (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(item.id, true)}
                      className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
                    >
                      Activate
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handlePermanentDelete(item.id, item.name)}
                  className="w-full px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium border border-red-800"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {showLowStockOnly ? 'No low stock items found' : 'No items found'}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingItem) && (
        <ItemFormModal
          item={editingItem}
          token={token!}
          onClose={() => {
            toast.dismiss(); // Clear any pending toasts when modal closes
            setShowCreateModal(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingItem(null);
            fetchItems();
          }}
        />
      )}
    </div>
  );
}

// Item Form Modal Component
function ItemFormModal({
  item,
  token,
  onClose,
  onSuccess,
}: {
  item: ItemAdmin | null;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    price_usd: item?.price_cents ? (item.price_cents / 100).toFixed(2) : '',
    weight_oz: item?.weight_oz ?? '',
    category: item?.category || '',
    image_url: item?.image_url || '',
    video_url: item?.video_url || '',
    description: item?.description || '',
    nutrition_json: item?.nutrition_json || '',
    stock_qty: item?.stock_qty ?? '',
    is_active: item?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'upload' | 'ai'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [nutritionJsonError, setNutritionJsonError] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const aiImageInputRef = React.useRef<HTMLInputElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [aiBaseImage, setAiBaseImage] = useState<string>('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoModel, setVideoModel] = useState<'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'>('veo-3.1-fast-generate-preview');
  const [videoMethod, setVideoMethod] = useState<'ai' | 'url' | 'upload'>('ai');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const videoFileInputRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [autoCase, setAutoCase] = useState(true);
  const [allowSpecialChars, setAllowSpecialChars] = useState(false);
  const [allowNumbers, setAllowNumbers] = useState(false);
  const [showNameOptions, setShowNameOptions] = useState(false);

  // Fetch categories when modal opens
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories(token);
        setCategories(cats);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [token]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingImage(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, image_url: base64String });
        setUploadingImage(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: '' });
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditPreviewWithAI = async () => {
    try {
      // Switch to AI mode
      setImageUploadMode('ai');
      
      // If the image is already base64, use it directly
      if (formData.image_url.startsWith('data:image')) {
        setAiBaseImage(formData.image_url);
      } else {
        // If it's a URL (like Unsplash), fetch and convert to base64
        const response = await fetch(formData.image_url);
        const blob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setAiBaseImage(base64String);
        };
        reader.readAsDataURL(blob);
      }
      
      // Clear the prompt (ready for new edit instructions)
      setAiPrompt('');
    } catch (error) {
      console.error('Error loading image for editing:', error);
      toast.error('Failed to load image for editing. Please try uploading the image directly.');
    }
  };

  const handleAiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAiBaseImage(base64String);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleRemoveAiBaseImage = () => {
    setAiBaseImage('');
    if (aiImageInputRef.current) {
      aiImageInputRef.current.value = '';
    }
  };


  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for the image you want to generate or edit');
      return;
    }

    setGeneratingImage(true);
    try {
      const result = await generateImage(token, aiPrompt, aiBaseImage || undefined);
      setFormData({ ...formData, image_url: result.image_data });
      toast.dismiss(); // Clear any previous toasts
      toast.success(aiBaseImage ? 'Image edited successfully! You can now preview it below.' : 'Image generated successfully! You can now preview it below.');
    } catch (error: any) {
      console.error('Failed to generate image:', error);
      toast.error(error.message || 'Failed to generate image. Please try again.');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Please enter a description for the video you want to generate');
      return;
    }

    if (!confirm('Video generation takes 30-60 seconds and costs ~$0.10-0.15. Continue?')) {
      return;
    }

    setGeneratingVideo(true);
    try {
      const result = await generateVideoSync(token, videoPrompt, videoModel);
      setFormData({ ...formData, video_url: result.video_data || '' });
      toast.dismiss(); // Clear any previous toasts
      toast.success('Video generated successfully! You can now preview it below.');
    } catch (error: any) {
      console.error('Failed to generate video:', error);
      toast.error(error.message || 'Failed to generate video. Please try again.');
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleRemoveVideo = () => {
    setFormData({ ...formData, video_url: '' });
    setVideoPrompt('');
    setVideoUrlInput('');
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
    }
  };

  const handleAddVideoUrl = () => {
    if (!videoUrlInput.trim()) {
      toast.error('Please enter a video URL');
      return;
    }
    
    // Convert YouTube URLs to embed URLs for better compatibility
    let processedUrl = videoUrlInput.trim();
    
    // Handle different YouTube URL formats
    if (processedUrl.includes('youtube.com/watch?v=')) {
      // Regular YouTube video: https://www.youtube.com/watch?v=VIDEO_ID
      const videoId = new URL(processedUrl).searchParams.get('v');
      if (videoId) {
        processedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (processedUrl.includes('youtube.com/shorts/')) {
      // YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID  
      const videoId = processedUrl.split('youtube.com/shorts/')[1]?.split('?')[0];
      if (videoId) {
        processedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (processedUrl.includes('youtu.be/')) {
      // Short YouTube URL: https://youtu.be/VIDEO_ID
      const videoId = processedUrl.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        processedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    setFormData({ ...formData, video_url: processedUrl });
  };

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validVideoTypes.includes(file.type)) {
      toast.error('Please select a valid video file (MP4, WebM, OGG, or MOV)');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('Video file is too large. Maximum size is 50MB. Consider compressing the video or using a URL instead.');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData({ ...formData, video_url: base64String });
    };
    reader.onerror = () => {
      toast.error('Error reading video file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Prevent non-numeric input in number fields
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      return;
    }
    
    // Allow Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
    
    // Prevent any non-numeric character
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Prevent pasting non-numeric content
  const handleNumericPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    // Only allow pasting if all characters are digits
    if (!/^\d*$/.test(pastedText)) {
      e.preventDefault();
    }
  };

  // Validate nutrition JSON
  const validateNutritionJson = (jsonString: string): boolean => {
    // Empty is allowed (optional field)
    if (!jsonString || jsonString.trim() === '') {
      setNutritionJsonError('');
      return true;
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // Check if it's an object (not array or primitive)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setNutritionJsonError('Nutrition data must be a JSON object (not an array or primitive value)');
        return false;
      }

      setNutritionJsonError('');
      return true;
    } catch (error) {
      if (error instanceof SyntaxError) {
        setNutritionJsonError(`Invalid JSON syntax: ${error.message}`);
      } else {
        setNutritionJsonError('Invalid JSON format');
      }
      return false;
    }
  };

  // Handle nutrition JSON change with validation
  const handleNutritionJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, nutrition_json: value });
    validateNutritionJson(value);
  };

  // Handle price input like a calculator (digits fill from right to left)
  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: tab, escape, enter (but prevent their default on the input)
    if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter') {
      return;
    }
    
    // Prevent default for all other keys
    e.preventDefault();
    
    const currentValue = formData.price_usd as string;
    
    // Handle backspace - remove last digit
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (currentValue === '') {
        return;
      }
      // Remove all non-digit characters and divide by 10 (remove last digit)
      const cents = Math.floor(parseFloat(currentValue.replace(/[^\d]/g, '')) / 10);
      
      // If we hit zero, clear the field to show placeholder
      if (cents === 0) {
        setFormData({ ...formData, price_usd: '' });
      } else {
        const newValue = (cents / 100).toFixed(2);
        setFormData({ ...formData, price_usd: newValue });
      }
      return;
    }
    
    // Allow Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v'].includes(e.key.toLowerCase())) {
      // Let the browser handle these
      return;
    }
    
    // Only allow digit input
    if (!/^\d$/.test(e.key)) {
      return;
    }
    
    // Add the digit to the right (shift everything left)
    const currentCents = currentValue === '' ? 0 : Math.round(parseFloat(currentValue) * 100);
    const newCents = currentCents * 10 + parseInt(e.key);
    
    // Limit to reasonable max (9999999.99 = 999999999 cents)
    if (newCents > 999999999) {
      return;
    }
    
    const newValue = (newCents / 100).toFixed(2);
    setFormData({ ...formData, price_usd: newValue });
  };

  // Handle price paste - convert pasted value to proper format
  const handlePricePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();
    
    // Try to parse as a number
    const parsed = parseFloat(pastedText);
    if (isNaN(parsed) || parsed < 0) {
      return;
    }
    
    // Convert to cents and back to ensure proper format
    const cents = Math.round(parsed * 100);
    if (cents > 999999999) {
      return;
    }
    
    const newValue = (cents / 100).toFixed(2);
    setFormData({ ...formData, price_usd: newValue });
  };

  // Handle name input validation based on checkbox settings
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: tab, escape, enter, backspace, delete, arrow keys
    const allowedControlKeys = ['Tab', 'Escape', 'Enter', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedControlKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Default allowed: letters, space, hyphen, apostrophe, ampersand
    const defaultAllowedRegex = /^[a-zA-Z\s\-'&]$/;
    const numberRegex = /^[0-9]$/;
    
    // Check if it's a letter or default special char (always allowed)
    if (defaultAllowedRegex.test(e.key)) {
      return;
    }
    
    // Check if it's a number
    if (numberRegex.test(e.key)) {
      if (!allowNumbers) {
        e.preventDefault();
      }
      return;
    }
    
    // For any other character (special chars like @, #, $, etc.)
    // Only allow if "allow special characters" is checked
    if (!allowSpecialChars) {
      e.preventDefault();
    }
  };

  const handleNamePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Build regex based on current settings
    let regex: RegExp;
    
    if (allowSpecialChars && allowNumbers) {
      // Allow everything - no restrictions
      return;
    } else if (allowSpecialChars) {
      // Allow letters, default special chars, and other special chars (but NOT numbers)
      regex = /^[a-zA-Z\s\-'&!@#$%^*()_+=\[\]{};:'"<>,.?/\\|`~]+$/;
    } else if (allowNumbers) {
      // Allow letters, default special chars, and numbers
      regex = /^[a-zA-Z0-9\s\-'&]+$/;
    } else {
      // Default: only letters and default special chars
      regex = /^[a-zA-Z\s\-'&]+$/;
    }
    
    // Reject paste if it contains disallowed characters
    if (!regex.test(pastedText)) {
      e.preventDefault();
      toast.error('Pasted text contains characters that are not allowed based on your current settings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate price is entered
      if (!formData.price_usd || formData.price_usd === '') {
        toast.error('Please enter a price');
        setSaving(false);
        return;
      }
      
      // Convert USD to cents and string values to numbers for API
      const priceUsd = parseFloat(formData.price_usd as string);
      const priceCents = Math.round(priceUsd * 100);
      
      // Validate price is greater than 0
      if (priceCents <= 0) {
        toast.error('Price must be greater than $0.00');
        setSaving(false);
        return;
      }

      // Validate weight is provided and greater than 0
      const weightOz = parseInt(formData.weight_oz as string);
      if (!formData.weight_oz || isNaN(weightOz) || weightOz <= 0) {
        toast.error('Weight must be greater than 0 ounces');
        setSaving(false);
        return;
      }

      // Validate image is provided
      if (!formData.image_url || formData.image_url.trim() === '') {
        toast.error('Please provide a product image (either URL or upload an image)');
        setSaving(false);
        return;
      }

      // Validate nutrition JSON if provided
      if (formData.nutrition_json && formData.nutrition_json.trim() !== '') {
        if (!validateNutritionJson(formData.nutrition_json)) {
          toast.error(`Invalid nutrition JSON: ${nutritionJsonError}`);
          setSaving(false);
          return;
        }
      }
      
      const submitData = {
        name: formData.name,
        price_cents: priceCents,
        weight_oz: weightOz,
        category: formData.category,
        image_url: formData.image_url,
        video_url: formData.video_url,
        description: formData.description,
        nutrition_json: formData.nutrition_json,
        stock_qty: parseInt(formData.stock_qty as string) || 0,
        is_active: formData.is_active,
      };

      if (item) {
        // Update existing item
        await updateItem(token, item.id, submitData, autoCase, allowSpecialChars, allowNumbers);
        toast.dismiss(); // Clear any error toasts before showing success
        toast.success('Item updated successfully');
      } else {
        // Create new item
        await createItem(token, submitData, autoCase, allowSpecialChars, allowNumbers);
        toast.dismiss(); // Clear any error toasts before showing success
        toast.success('Item created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white rounded-t-lg border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-xl font-bold text-gray-900">
                {item ? 'Edit Item' : 'Create New Item'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Name *
                </label>
                <div className="group relative inline-block">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label="Name field information"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="invisible group-hover:visible absolute left-0 top-6 z-50 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                    <p className="font-semibold mb-1">Default Allowed Characters:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Letters (A-Z, a-z)</li>
                      <li>Space</li>
                      <li>Hyphen (-)</li>
                      <li>Apostrophe (')</li>
                      <li>Ampersand (&)</li>
                    </ul>
                    <p className="mt-2 text-gray-300 italic">
                      Click "Name Validation Options" below for more settings.
                    </p>
                  </div>
                </div>
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={handleNameKeyDown}
                onPaste={handleNamePaste}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowNameOptions(!showNameOptions)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showNameOptions ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium">Name Validation Options</span>
                </button>
                
                {showNameOptions && (
                  <div className="mt-3 ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoCase"
                        checked={autoCase}
                        onChange={(e) => setAutoCase(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="autoCase" className="ml-2 text-sm text-gray-600">
                        Auto-format name to Title Case (e.g., "organic apples" → "Organic Apples")
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowSpecialChars"
                        checked={allowSpecialChars}
                        onChange={(e) => setAllowSpecialChars(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="allowSpecialChars" className="ml-2 text-sm text-gray-600">
                        Allow all special characters (@, #, $, %, etc.)
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowNumbers"
                        checked={allowNumbers}
                        onChange={(e) => setAllowNumbers(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="allowNumbers" className="ml-2 text-sm text-gray-600">
                        Allow numbers (0-9)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (USD) *
                </label>
                <div className="relative">
                  {formData.price_usd && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  )}
                  <input
                    type="text"
                    required
                    value={formData.price_usd}
                    placeholder="Enter Price"
                    onKeyDown={handlePriceKeyDown}
                    onPaste={handlePricePaste}
                    onChange={(e) => e.preventDefault()}
                    className={`w-full pr-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 ${
                      formData.price_usd ? 'pl-7' : 'pl-3'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (oz) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={formData.weight_oz}
                  onChange={(e) => setFormData({ ...formData, weight_oz: e.target.value })}
                  onKeyDown={handleNumericKeyDown}
                  onPaste={handleNumericPaste}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                {loadingCategories ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500">
                    Loading categories...
                  </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stock_qty}
                  onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                  onKeyDown={handleNumericKeyDown}
                  onPaste={handleNumericPaste}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image *
              </label>
              
              {/* Toggle between URL, Upload, and AI Generation */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setImageUploadMode('url')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    imageUploadMode === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageUploadMode('upload')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    imageUploadMode === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => setImageUploadMode('ai')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    imageUploadMode === 'ai'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Generate with AI
                </button>
              </div>

              {imageUploadMode === 'url' ? (
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
              ) : imageUploadMode === 'upload' ? (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadingImage && (
                    <p className="text-sm text-gray-600">Uploading image...</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Unified AI Generation Interface */}
                  <div className="space-y-3">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {aiBaseImage ? 'Describe the edits you want' : 'Describe the image you want to generate'}
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={
                          aiBaseImage
                            ? "Example: 'Change background to white' or 'Add a fresh label' or 'Make the colors more vibrant'"
                            : "Example: 'A fresh organic red apple on a white background, professional product photography'"
                        }
                        rows={4}
                        disabled={generatingImage}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      />
                      
                      {/* Optional image upload button - bottom left corner */}
                      {!aiBaseImage && (
                        <div className="absolute -bottom-2 left-2">
                          <input
                            ref={aiImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAiImageUpload}
                            className="hidden"
                            id="ai-image-upload-generate"
                          />
                          <label
                            htmlFor="ai-image-upload-generate"
                            className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium rounded-full border border-purple-300 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Upload image to edit
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Show uploaded base image if present */}
                    {aiBaseImage && (
                      <div className="border-2 border-purple-200 rounded-md p-3 bg-purple-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-purple-700">Base Image:</span>
                          <label
                            htmlFor="ai-image-change-generate"
                            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium rounded cursor-pointer transition-colors"
                          >
                            Replace
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAiImageUpload}
                            className="hidden"
                            id="ai-image-change-generate"
                          />
                        </div>
                        <div className="relative w-full h-24 bg-white rounded flex items-center justify-center overflow-hidden border border-purple-200 group">
                          <img
                            src={aiBaseImage}
                            alt="Base image"
                            className="w-full h-full object-contain"
                          />
                          {/* X icon on hover - centered */}
                          <button
                            type="button"
                            onClick={handleRemoveAiBaseImage}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                            title="Remove image"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={generatingImage || !aiPrompt.trim()}
                      className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingImage ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {aiBaseImage ? 'Editing Image...' : 'Generating Image...'}
                        </span>
                      ) : (
                        aiBaseImage ? 'Edit Image with AI' : 'Generate Image with AI'
                      )}
                    </button>
                    <p className="text-xs text-gray-500">
                      Tip: {aiBaseImage ? 'Be specific about what edits you want.' : 'Be specific about the product, lighting, background, and style. Or upload an image to edit it.'} Generation may take 10-30 seconds.
                    </p>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {formData.image_url && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <div className="w-full h-48 bg-white rounded-md border border-gray-300 flex items-center justify-center overflow-hidden">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Invalid Image</text></svg>';
                      }}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleEditPreviewWithAI}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors border border-purple-700"
                    >
                      Edit with AI
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors border border-red-700"
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nutrition Information (JSON)
                <span className="text-xs text-gray-500 ml-2">(Optional)</span>
              </label>
              <textarea
                rows={6}
                value={formData.nutrition_json}
                onChange={handleNutritionJsonChange}
                placeholder='{"calories": 100, "protein": {"value": 5, "unit": "g"}, "totalFat": {"value": 2, "unit": "g"}}'
                className={`w-full px-3 py-2 border rounded-md bg-white text-gray-900 font-mono text-sm ${
                  nutritionJsonError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              {nutritionJsonError ? (
                <p className="text-xs text-red-600 mt-1">
                  {nutritionJsonError}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Enter nutrition data as valid JSON format (must be an object)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Video (Optional)
                <span className="text-xs text-gray-500 ml-2">Add a marketing video</span>
              </label>
              
              {/* Video Method Selector */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setVideoMethod('ai')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    videoMethod === 'ai'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  AI Generate
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMethod('upload')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    videoMethod === 'upload'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMethod('url')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    videoMethod === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Add URL
                </button>
              </div>

              {/* AI Video Generation */}
              {videoMethod === 'ai' && (
                <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video Quality
                    </label>
                    <select
                      value={videoModel}
                      onChange={(e) => setVideoModel(e.target.value as any)}
                      disabled={generatingVideo}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm"
                    >
                      <option value="veo-3.1-fast-generate-preview">Fast (~30s, $0.10)</option>
                      <option value="veo-3.1-generate-preview">Best Quality (~60s, $0.15)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Describe your video
                    </label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Example: 'A fresh organic apple rotating slowly on a white surface with soft lighting and a subtle shadow'"
                      rows={3}
                      disabled={generatingVideo}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: Be specific about the product, action, lighting, and style. Veo 3.1 generates 8-second videos with audio.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateVideo}
                    disabled={generatingVideo || !videoPrompt.trim()}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingVideo ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating Video... (30-60s)
                      </span>
                    ) : (
                      'Generate Video with AI'
                    )}
                  </button>
                </div>
              )}

              {/* Video File Upload */}
              {videoMethod === 'upload' && (
                <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Video File
                    </label>
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      onChange={handleVideoFileSelect}
                      className="block w-full text-sm text-gray-900
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-green-50 file:text-green-700
                        hover:file:bg-green-100
                        cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: Accepts MP4, WebM, OGG, or MOV files (max 50MB)
                    </p>
                  </div>
                </div>
              )}

              {/* Video URL Input */}
              {videoMethod === 'url' && (
                <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {/* Copyright Warning */}
                  <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3">
                    <p className="text-xs text-yellow-800 font-medium">
                      <strong>Copyright Warning:</strong> Only use videos you own, created yourself, or have explicit permission to use. 
                      Using copyrighted content from other brands/creators without permission is illegal and may result in legal action.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL
                    </label>
                    <input
                      type="url"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="YouTube, YouTube Shorts, Vimeo, or direct video URL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: Use only your own videos, licensed stock videos, or AI-generated content
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVideoUrl}
                    disabled={!videoUrlInput.trim()}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Video URL
                  </button>
                </div>
              )}

              {/* Video Preview */}
              {formData.video_url && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <div className="w-full bg-black rounded-md overflow-hidden">
                    {formData.video_url.includes('youtube.com/embed') || formData.video_url.includes('vimeo.com') ? (
                      <iframe
                        src={formData.video_url}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={formData.video_url}
                        controls
                        className="w-full"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="mt-2 w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                  >
                    Remove Video
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active
              </label>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

