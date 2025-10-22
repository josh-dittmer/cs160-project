"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  activateItem,
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
    
    if (!confirm('Are you sure you want to deactivate this item?')) {
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
                    className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
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
    price_cents: item?.price_cents || 0,
    weight_oz: item?.weight_oz || 0,
    category: item?.category || '',
    image_url: item?.image_url || '',
    description: item?.description || '',
    nutrition_json: item?.nutrition_json || '',
    stock_qty: item?.stock_qty || 0,
    is_active: item?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'upload'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (item) {
        // Update existing item
        await updateItem(token, item.id, formData);
        alert('Item updated successfully');
      } else {
        // Create new item
        await createItem(token, formData);
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
                  Price (cents) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price_cents}
                  onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
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
                  onChange={(e) => setFormData({ ...formData, weight_oz: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
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
                  onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
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
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-md border border-gray-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Invalid Image</text></svg>';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
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
                onChange={(e) => setFormData({ ...formData, nutrition_json: e.target.value })}
                placeholder='{"calories": 100, "protein": {"value": 5, "unit": "g"}, "totalFat": {"value": 2, "unit": "g"}}'
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter nutrition data as valid JSON format
              </p>
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

