'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { listItems, ItemEmployee } from '@/lib/api/employee';

export default function EmployeeAlertsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [lowStockItems, setLowStockItems] = useState<ItemEmployee[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<ItemEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (user && !['employee', 'manager', 'admin'].includes(user.role)) {
      router.push('/home/dashboard');
      return;
    }

    loadAlerts();
  }, [token, user, router]);

  const loadAlerts = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const items = await listItems(token, { status: 'all', limit: 200 });
      
      // Filter for low stock items (1-10 units)
      const lowStock = items.filter(item => item.stock_qty > 0 && item.stock_qty <= 10);
      
      // Filter for out of stock items (0 units)
      const outOfStock = items.filter(item => item.stock_qty === 0);
      
      setLowStockItems(lowStock);
      setOutOfStockItems(outOfStock);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadAlerts}
            className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Stock Alerts</h1>
        <p className="text-gray-600">Items requiring attention</p>
      </div>

      {/* Out of Stock Items */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-semibold text-red-600">Out of Stock</h2>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
            {outOfStockItems.length} {outOfStockItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        
        {outOfStockItems.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">✓ No out of stock items</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {outOfStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-10 w-10 rounded-md object-cover mr-3"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-200 mr-3" />
                        )}
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Out of Stock
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => router.push('/employee/stock-management')}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low Stock Items */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-semibold text-yellow-600">Low Stock</h2>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
            {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        
        {lowStockItems.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">✓ No low stock items</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-10 w-10 rounded-md object-cover mr-3"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-200 mr-3" />
                        )}
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {item.stock_qty} units remaining
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => router.push('/employee/stock-management')}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-lg text-blue-800 font-semibold">🎉 All items are well stocked!</p>
          <p className="text-sm text-blue-600 mt-2">No immediate action required.</p>
        </div>
      )}
    </div>
  );
}

