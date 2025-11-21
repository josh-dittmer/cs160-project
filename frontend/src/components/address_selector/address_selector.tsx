"use client";

import GooglePlacesAutocomplete from "@/components/google_places_autocomplete/GooglePlacesAutocomplete";
import { AddressContext } from "@/contexts/address";
import { useAuth } from "@/contexts/auth";
import { MapsContext } from "@/contexts/maps";
import { ThemeContext } from "@/contexts/theme";
import { updateProfile } from "@/lib/api/profile";
import { GoogleMap, Marker, OverlayView } from "@react-google-maps/api";
import { ChevronDown, Crosshair, MapPin, X } from "lucide-react";
import toast from "react-hot-toast";
import { useContext, useEffect, useState } from "react";

const mapContainerStyle = {
    width: '100%',
    height: '400px'
};

const defaultCenter = {
    lat: 37.3352,
    lng: -121.8811
};

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

/**
 * Check if two locations are close enough to be considered the same
 * (within ~50 meters)
 */
function areLocationsSame(
    loc1: { lat: number; lng: number } | null,
    loc2: { lat: number; lng: number } | null
): boolean {
    if (!loc1 || !loc2) return false;

    const threshold = 0.0005; // ~50 meters
    return Math.abs(loc1.lat - loc2.lat) < threshold &&
        Math.abs(loc1.lng - loc2.lng) < threshold;
}

export default function AddressSelector() {
    const addressContext = useContext(AddressContext);

    const { user, token, updateUser } = useAuth();
    const themeContext = useContext(ThemeContext);
    const isDark = themeContext?.theme.name === 'dark';
    const [showMap, setShowMap] = useState(false);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Load Google Maps API with a unique ID to prevent duplicate loading
    /*const { isLoaded: isMapsLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
        id: 'google-maps-script', // Same ID as GooglePlacesAutocomplete to share the script
    });*/

    const mapsContext = useContext(MapsContext);

    // Address form state
    const [addressData, setAddressData] = useState({
        address: '',
        city: '',
        state: '',
        zipcode: ''
    });

    // Format address for display
    const getDisplayAddress = () => {
        if (!user?.address) {
            return "Set delivery address";
        }

        // If we have a full address, show the street address
        if (user.address) {
            // Truncate if too long
            const maxLength = 20;
            return user.address.length > maxLength
                ? user.address.substring(0, maxLength) + "..."
                : user.address;
        }

        return "Set delivery address";
    };

    // Reset coordinates when user's address changes (to trigger re-geocoding)
    useEffect(() => {
        if (user?.address) {
            const currentFullAddress = [
                user.address,
                user.city,
                user.state,
                user.zipcode
            ].filter(Boolean).join(', ');

            // Reset coordinates to trigger re-geocoding
            console.log('Address changed, resetting coordinates for:', currentFullAddress);
            setCoordinates(null);
        }
    }, [user?.address, user?.city, user?.state, user?.zipcode]);

    // Geocode address when map is opened and API is loaded
    useEffect(() => {
        if (showMap && user?.address && !coordinates && !isGeocoding && mapsContext?.loaded) {
            geocodeAddress();
        }
    }, [showMap, user?.address, mapsContext?.loaded, coordinates, isGeocoding]);

    // Geocode address when map is opened
    const geocodeAddress = () => {
        if (!user?.address || isGeocoding || !mapsContext?.loaded) return;

        // Check if Google Maps API is loaded
        if (typeof window === 'undefined' || !window.google || !window.google.maps) {
            console.warn('Google Maps API not loaded yet, using default center');
            setCoordinates(defaultCenter);
            return;
        }

        setIsGeocoding(true);

        try {
            // Build full address
            const fullAddress = [
                user.address,
                user.city,
                user.state,
                user.zipcode
            ].filter(Boolean).join(', ');

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: fullAddress }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    const coords = {
                        lat: location.lat(),
                        lng: location.lng()
                    };
                    console.log('Geocoded address:', fullAddress);
                    console.log('Coordinates:', coords);
                    console.log('San Jose should be: lat ~37.3, lng ~-121.9');

                    // Validate coordinates are in reasonable range for San Jose
                    if (coords.lat < 36 || coords.lat > 38 || coords.lng > -120 || coords.lng < -123) {
                        console.error('⚠️ Coordinates seem incorrect for San Jose!', coords);
                        console.error('Using default San Jose center instead');
                        setCoordinates(defaultCenter);
                    } else {
                        setCoordinates(coords);
                    }
                } else {
                    console.error('Geocoding failed:', status);
                    // Fallback to San Jose center if geocoding fails
                    setCoordinates(defaultCenter);
                }
                setIsGeocoding(false);
            });
        } catch (error) {
            console.error('Error geocoding address:', error);
            setCoordinates(defaultCenter);
            setIsGeocoding(false);
        }
    };

    useEffect(() => {
        if (addressContext?.windowVisible || showMap) {
            geocodeAddress();
        }
    }, [addressContext?.windowVisible, showMap])

    const handleClick = () => {
        if (user?.address) {
            setShowMap(true);
            // Get current location when opening map (for comparison)
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const currentCoords = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        console.log('Current location:', currentCoords);
                        setCurrentLocation(currentCoords);
                    },
                    (error) => {
                        console.log('Could not get current location for map:', error);
                        // Don't show error - it's optional for map viewing
                    },
                    { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
                );
            }
        } else {
            addressContext?.setWindowVisible(true);
        }
    };

    const handleCloseMap = () => {
        setShowMap(false);
        setCurrentLocation(null); // Clear current location when closing map
    };

    const handleCloseAddressInput = () => {
        addressContext?.setWindowVisible(false);
        setAddressData({
            address: '',
            city: '',
            state: '',
            zipcode: ''
        });
    };

    const handleEditAddress = () => {
        // Pre-populate the form with current address
        setAddressData({
            address: user?.address || '',
            city: user?.city || '',
            state: user?.state || '',
            zipcode: user?.zipcode || ''
        });
        // Close map and open address input
        setShowMap(false);
        addressContext?.setWindowVisible(true);
    };

    const handleAddressChange = (value: string) => {
        setAddressData(prev => ({ ...prev, address: value }));
    };

    const handlePlaceSelected = (place: { address: string; city: string; state: string; zipcode: string; }) => {
        setAddressData({
            address: place.address,
            city: place.city,
            state: place.state,
            zipcode: place.zipcode
        });
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Reverse geocode to get address
                try {
                    if (!window.google?.maps) {
                        toast.error('Google Maps is still loading. Please try again in a moment.');
                        setIsLocating(false);
                        return;
                    }

                    const geocoder = new google.maps.Geocoder();
                    const latlng = { lat: latitude, lng: longitude };

                    geocoder.geocode({ location: latlng }, (results, status) => {
                        if (status === 'OK' && results && results[0]) {
                            const place = results[0];

                            let streetNumber = '';
                            let route = '';
                            let city = '';
                            let state = '';
                            let zipcode = '';

                            place.address_components?.forEach((component) => {
                                const types = component.types;
                                if (types.includes('street_number')) {
                                    streetNumber = component.long_name;
                                }
                                if (types.includes('route')) {
                                    route = component.long_name;
                                }
                                if (types.includes('locality')) {
                                    city = component.long_name;
                                }
                                if (types.includes('administrative_area_level_1')) {
                                    state = component.long_name;
                                }
                                if (types.includes('postal_code')) {
                                    zipcode = component.long_name;
                                }
                            });

                            const fullAddress = `${streetNumber} ${route}`.trim();

                            // Validate it's in San Jose
                            if (city.toLowerCase() !== 'san jose') {
                                toast.error(`Your current location is in ${city}, but we only deliver to San Jose, CA. Please enter a San Jose address manually.`);
                                setIsLocating(false);
                                return;
                            }

                            // Validate we have a street address
                            if (!streetNumber || !route) {
                                toast.error('Could not determine your exact street address. Please enter it manually.');
                                setIsLocating(false);
                                return;
                            }

                            // Set the address data
                            setAddressData({
                                address: fullAddress,
                                city,
                                state,
                                zipcode
                            });

                            setIsLocating(false);
                        } else {
                            toast.error('Could not determine your address. Please enter it manually.');
                            setIsLocating(false);
                        }
                    });
                } catch (error) {
                    console.error('Reverse geocoding error:', error);
                    toast.error('Failed to get your address. Please enter it manually.');
                    setIsLocating(false);
                }
            },
            (error) => {
                setIsLocating(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        toast.error('Location permission denied. Please enable location access in your browser settings or enter your address manually.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        toast.error('Location information unavailable. Please enter your address manually.');
                        break;
                    case error.TIMEOUT:
                        toast.error('Location request timed out. Please try again or enter your address manually.');
                        break;
                    default:
                        toast.error('An error occurred while getting your location. Please enter your address manually.');
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const getSaveCoordinates = async (fullAddress: string): Promise<{ lat: number, lng: number }> => {
        const geocoder = new google.maps.Geocoder();

        return new Promise((resolve, reject) => geocoder.geocode({ address: fullAddress }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                const coords = {
                    lat: location.lat(),
                    lng: location.lng()
                };
                console.log('Save address: Geocoded address:', fullAddress);
                console.log('Save address: Coordinates:', coords);
                console.log('Save address: San Jose should be: lat ~37.3, lng ~-121.9');
                resolve(coords);
            } else {
                console.error('Save address: Geocoding failed:', status);
                reject(Error('Geocoding failed'));
            }
        }));
    };

    const handleSaveAddress = async () => {
        if (!token) {
            toast.error('You must be logged in to save your address');
            return;
        }

        // Validate required fields
        if (!addressData.address || !addressData.city || !addressData.state || !addressData.zipcode) {
            toast.error('Please select a complete address from the dropdown suggestions');
            return;
        }

        // Validate San Jose location
        if (!addressData.city.toLowerCase().includes('san jose')) {
            toast.error('Sorry, we only deliver to San Jose, CA');
            return;
        }

        const fullAddress = [
            addressData.address,
            addressData.city,
            addressData.state,
            addressData.zipcode
        ].filter(Boolean).join(', ');

        setIsSaving(true);
        try {
            const coords = await getSaveCoordinates(fullAddress);

            const updatedUser = await updateProfile(token, {
                address: addressData.address,
                city: addressData.city,
                state: addressData.state,
                zipcode: addressData.zipcode,
                longitude: coords.lng,
                latitude: coords.lat
            });

            updateUser(updatedUser);
            // Reset coordinates so they'll be geocoded again with new address
            setCoordinates(null);
            toast.success(user?.address ? 'Address updated successfully! 🎉' : 'Address saved successfully! 🎉');
            handleCloseAddressInput();
        } catch (error) {
            console.error('Failed to save address:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save address. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    return (
        <>
            <div
                className={`flex items-center gap-3 bg-bg-medium p-2 rounded-full transition-all cursor-pointer ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-300'
                    }`}
                onClick={handleClick}
                role="button"
                aria-label={user?.address ? "View delivery address on map" : "Set delivery address"}
            >
                <MapPin width={20} height={20} className="text-fg-medium" />
                <p className="text-fg-medium hidden md:block text-nowrap">
                    {getDisplayAddress()}
                </p>
                <ChevronDown width={20} height={20} className="text-fg-medium" />
            </div>

            {/* Address Input Modal (when no address is set) */}
            {addressContext?.windowVisible && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={handleCloseAddressInput}
                >
                    <div
                        className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-2xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div>
                                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {user?.address ? 'Change Delivery Address' : 'Set Delivery Address'}
                                </h2>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                    We currently deliver to San Jose, CA only
                                </p>
                            </div>
                            <button
                                onClick={handleCloseAddressInput}
                                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                aria-label="Close"
                            >
                                <X width={24} height={24} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                            </button>
                        </div>

                        {/* Address Input Form */}
                        <div className="p-6 space-y-4">
                            {/* Use Current Location Button */}
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    disabled={isLocating || isSaving}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-medium border-2 ${isDark
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 disabled:bg-blue-800 disabled:border-blue-800'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 disabled:bg-blue-400 disabled:border-blue-400'
                                        } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    {isLocating ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            <span>Detecting location...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Crosshair width={18} height={18} />
                                            <span>Use My Current Location</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="relative">
                                <div className={`absolute inset-0 flex items-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    <div className={`w-full border-t ${isDark ? 'border-gray-600' : 'border-gray-300'}`}></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className={`px-2 ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                                        or enter manually
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Street Address <span className="text-red-600">*</span>
                                </label>
                                <div className="relative">
                                    <GooglePlacesAutocomplete
                                        value={addressData.address}
                                        onChange={handleAddressChange}
                                        onPlaceSelected={handlePlaceSelected}
                                        placeholder="Start typing your address..."
                                        className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark
                                            ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400'
                                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                            }`}
                                    />
                                    {addressData.address && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAddressData({
                                                    address: '',
                                                    city: '',
                                                    state: '',
                                                    zipcode: ''
                                                });
                                            }}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                            aria-label="Clear address"
                                        >
                                            <X width={18} height={18} />
                                        </button>
                                    )}
                                </div>
                                <p className={`text-xs mt-2 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>ℹ️</span>
                                    Type your address and select from the dropdown suggestions
                                </p>
                            </div>

                            {/* Show parsed address components if available */}
                            {(addressData.city || addressData.state || addressData.zipcode) && (
                                <div className={`p-4 border-2 rounded-lg space-y-2 ${isDark
                                    ? 'bg-green-900/20 border-green-800'
                                    : 'bg-green-50 border-green-200'
                                    }`}>
                                    <p className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-green-100' : 'text-green-900'
                                        }`}>
                                        ✓ Address Details:
                                    </p>
                                    {addressData.address && (
                                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <span className="font-medium">Street:</span> {addressData.address}
                                        </p>
                                    )}
                                    {addressData.city && (
                                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <span className="font-medium">City:</span> {addressData.city}
                                        </p>
                                    )}
                                    {addressData.state && (
                                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <span className="font-medium">State:</span> {addressData.state}
                                        </p>
                                    )}
                                    {addressData.zipcode && (
                                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <span className="font-medium">ZIP:</span> {addressData.zipcode}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <button
                                onClick={handleCloseAddressInput}
                                className={`px-5 py-2.5 rounded-lg transition-colors font-medium ${isDark
                                    ? 'bg-gray-600 text-white hover:bg-gray-500'
                                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                                    }`}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAddress}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                disabled={!addressData.address || !addressData.city || !addressData.state || !addressData.zipcode || isSaving}
                                title={(!addressData.address || !addressData.city || !addressData.state || !addressData.zipcode) ? 'Please select a complete address from the dropdown' : ''}
                            >
                                {isSaving ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin">⏳</span>
                                        Saving...
                                    </span>
                                ) : (
                                    user?.address ? 'Update Address' : 'Save Address'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Modal (when address is already set) */}
            {showMap && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={handleCloseMap}
                >
                    <div
                        className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-3xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="flex-1">
                                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Delivery Address
                                </h2>
                                {user?.address && (
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                        {user.address}
                                        {user.city && `, ${user.city}`}
                                        {user.state && `, ${user.state}`}
                                        {user.zipcode && ` ${user.zipcode}`}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleEditAddress}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${isDark
                                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Edit Address
                                </button>
                                <button
                                    onClick={handleCloseMap}
                                    className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                    aria-label="Close map"
                                >
                                    <X width={24} height={24} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                                </button>
                            </div>
                        </div>

                        {/* Map Container */}
                        <div className="p-4">
                            {!apiKey ? (
                                <div className={`flex items-center justify-center h-[400px] rounded ${isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}>
                                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                        Google Maps API key not configured
                                    </p>
                                </div>
                            ) : !mapsContext?.loaded ? (
                                <div className={`flex items-center justify-center h-[400px] rounded ${isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}>
                                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                        Loading map...
                                    </p>
                                </div>
                            ) : (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={(() => {
                                        const mapCenter = coordinates || defaultCenter;
                                        console.log('Map centering on:', mapCenter);
                                        return mapCenter;
                                    })()}
                                    zoom={10.5}
                                    options={{
                                        styles: isDark ? [
                                            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                                            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                                            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] }
                                        ] : undefined
                                    }}
                                >
                                    {(() => {
                                        const locationsAreSame = areLocationsSame(coordinates, currentLocation);

                                        if (locationsAreSame) {
                                            // Combined pulsating marker when delivery address and current location are the same
                                            return coordinates && (
                                                <OverlayView
                                                    position={coordinates}
                                                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                >
                                                    <div
                                                        className="relative w-16 h-16 flex items-center justify-center"
                                                        title="You are at your delivery location"
                                                    >
                                                        {/* Expanding pulsating ring */}
                                                        <div className="absolute inset-0">
                                                            <div className="w-full h-full bg-green-500 rounded-full opacity-30 animate-ping"></div>
                                                        </div>
                                                        {/* Solid green circle with icon - perfectly centered */}
                                                        <div className="relative w-10 h-10 bg-green-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center z-10">
                                                            <span className="text-2xl">📍</span>
                                                        </div>
                                                    </div>
                                                </OverlayView>
                                            );
                                        }

                                        // Show separate markers when they're different
                                        return (
                                            <>
                                                {/* Delivery Address Marker (Red) - Prominent */}
                                                {coordinates && (
                                                    <Marker
                                                        position={coordinates}
                                                        title={user?.address || "Delivery Location"}
                                                        icon={{
                                                            path: window.google.maps.SymbolPath.CIRCLE,
                                                            scale: 16,
                                                            fillColor: '#EF4444',
                                                            fillOpacity: 1,
                                                            strokeColor: '#FFFFFF',
                                                            strokeWeight: 4,
                                                        }}
                                                        label={{
                                                            text: '📦',
                                                            fontSize: '24px',
                                                            fontWeight: 'bold',
                                                        }}
                                                        zIndex={1000}
                                                        animation={window.google.maps.Animation.DROP}
                                                    />
                                                )}

                                                {/* Current Location - Pulsating Blue Dot */}
                                                {currentLocation && (
                                                    <OverlayView
                                                        position={currentLocation}
                                                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                    >
                                                        <div className="relative w-10 h-10 flex items-center justify-center">
                                                            {/* Expanding ring */}
                                                            <div className="absolute inset-0">
                                                                <div className="w-full h-full bg-blue-500 rounded-full opacity-30 animate-ping"></div>
                                                            </div>
                                                            {/* Solid blue dot - perfectly centered */}
                                                            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10"></div>
                                                        </div>
                                                    </OverlayView>
                                                )}
                                            </>
                                        );
                                    })()}
                                </GoogleMap>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className={`flex justify-between items-center p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            {/* Legend */}
                            <div className="flex gap-4 text-sm flex-wrap">
                                {(() => {
                                    const locationsAreSame = areLocationsSame(coordinates, currentLocation);

                                    if (locationsAreSame) {
                                        // Show combined legend when at the same location
                                        return (
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-100 border border-green-300'
                                                }`}>
                                                <span className="text-lg">📍</span>
                                                <span className={isDark ? 'text-green-300 font-medium' : 'text-green-800 font-medium'}>
                                                    You're at your delivery location
                                                </span>
                                            </div>
                                        );
                                    }

                                    // Show separate legend items when different
                                    return (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">📦</span>
                                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Delivery Address</span>
                                            </div>
                                            {currentLocation && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-blue-600 rounded-full border border-white"></div>
                                                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Your Current Location</span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            <button
                                onClick={handleCloseMap}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}