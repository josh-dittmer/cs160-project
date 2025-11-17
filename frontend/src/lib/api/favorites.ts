import { Endpoints } from './endpoints';

export interface FavoriteItem {
    id: number;
    name: string;
    price_cents: number;
    weight_oz: number;
    category: string | null;
    image_url: string | null;
    video_url: string | null;
    avg_rating: number;
    ratings_count: number;
}

/**
 * Get all favorited items for the current user
 */
export async function getFavorites(token: string): Promise<FavoriteItem[]> {
    const response = await fetch(`${Endpoints.mainApiInternal}/api/favorites/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch favorites');
    }

    return response.json();
}

/**
 * Add an item to favorites
 */
export async function addFavorite(token: string, itemId: number): Promise<{ message: string }> {
    const response = await fetch(`${Endpoints.mainApiInternal}/api/favorites/${itemId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to add favorite');
    }

    return response.json();
}

/**
 * Remove an item from favorites
 */
export async function removeFavorite(token: string, itemId: number): Promise<{ message: string }> {
    const response = await fetch(`${Endpoints.mainApiInternal}/api/favorites/${itemId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to remove favorite');
    }

    return response.json();
}

/**
 * Check if an item is favorited
 */
export async function isFavorited(token: string, itemId: number): Promise<boolean> {
    try {
        const favorites = await getFavorites(token);
        return favorites.some(item => item.id === itemId);
    } catch (error) {
        console.error('Error checking favorite status:', error);
        return false;
    }
}

