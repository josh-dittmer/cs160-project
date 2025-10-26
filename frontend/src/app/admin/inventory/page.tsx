"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  activateItem,
  permanentlyDeleteItem,
  getCategories,
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
      alert('Failed to fetch items');
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
      alert('Item deactivated successfully');
      fetchItems();
    } catch (error: any) {
      console.error('Failed to deactivate item:', error);
      alert(error.message || 'Failed to deactivate item');
    }
  };

  const handlePermanentDelete = async (itemId: number, itemName: string) => {
    if (!token) return;
    
    const confirmed = confirm(
      `⚠️ WARNING: Are you sure you want to PERMANENTLY delete "${itemName}"?\n\n` +
      `This action CANNOT be undone! The item will be completely removed from the database.`
    );
    
    if (!confirmed) return;

    try {
      await permanentlyDeleteItem(token, itemId);
      alert('Item permanently deleted from database');
      fetchItems();
    } catch (error: any) {
      console.error('Failed to permanently delete item:', error);
      alert(error.message || 'Failed to permanently delete item');
    }
  };

  const handleActivate = async (itemId: number, isActive: boolean) => {
    if (!token) return;
    
    try {
      await activateItem(token, itemId, isActive);
      alert(`Item ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchItems();
    } catch (error: any) {
      console.error('Failed to update item status:', error);
      alert(error.message || 'Failed to update item status');
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
                  🗑️ Delete Permanently
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
    description: item?.description || '',
    nutrition_json: item?.nutrition_json || '',
    stock_qty: item?.stock_qty ?? '',
    is_active: item?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'upload'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [nutritionJsonError, setNutritionJsonError] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      alert('Image size should be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
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
        alert('Failed to read image file');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate price is entered
      if (!formData.price_usd || formData.price_usd === '') {
        alert('Please enter a price');
        setSaving(false);
        return;
      }
      
      // Convert USD to cents and string values to numbers for API
      const priceUsd = parseFloat(formData.price_usd as string);
      const priceCents = Math.round(priceUsd * 100);
      
      // Validate price is greater than 0
      if (priceCents <= 0) {
        alert('Price must be greater than $0.00');
        setSaving(false);
        return;
      }

      // Validate image is provided
      if (!formData.image_url || formData.image_url.trim() === '') {
        alert('Please provide a product image (either URL or upload an image)');
        setSaving(false);
        return;
      }

      // Validate nutrition JSON if provided
      if (formData.nutrition_json && formData.nutrition_json.trim() !== '') {
        if (!validateNutritionJson(formData.nutrition_json)) {
          alert(`Invalid nutrition JSON: ${nutritionJsonError}`);
          setSaving(false);
          return;
        }
      }
      
      const submitData = {
        name: formData.name,
        price_cents: priceCents,
        weight_oz: parseInt(formData.weight_oz as string) || 0,
        category: formData.category,
        image_url: formData.image_url,
        description: formData.description,
        nutrition_json: formData.nutrition_json,
        stock_qty: parseInt(formData.stock_qty as string) || 0,
        is_active: formData.is_active,
      };

      if (item) {
        // Update existing item
        await updateItem(token, item.id, submitData);
        alert('Item updated successfully');
      } else {
        // Create new item
        await createItem(token, submitData);
        alert('Item created successfully');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save item:', error);
      alert(error.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {item ? 'Edit Item' : 'Create New Item'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              />
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
                  min="0"
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
              
              {/* Toggle between URL and Upload */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setImageUploadMode('url')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    imageUploadMode === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Upload Image
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
              ) : (
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
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors border border-red-700"
                  >
                    Remove Image
                  </button>
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
                <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                  <span className="mt-0.5">⚠️</span>
                  <span>{nutritionJsonError}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Enter nutrition data as valid JSON format (must be an object)
                </p>
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

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

