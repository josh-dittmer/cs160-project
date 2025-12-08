"use client";

import "./profile.css";
import "./profile_edit.css";
import { useState, useRef, useMemo, useContext } from "react";
import { UserInfo, updateProfile, changePassword } from "@/lib/api/profile";
import GooglePlacesAutocomplete from "@/components/google_places_autocomplete/GooglePlacesAutocomplete";
import toast from "react-hot-toast";
import { validatePassword, PASSWORD_MIN_LENGTH } from "@/lib/util/password-validation";
import { Check, X } from "lucide-react";
import { MapsContext } from "@/contexts/maps";

type Props = { 
  userData: UserInfo | null;
  token: string | null;
  onCancel?: () => void;
  onSuccess?: (user: UserInfo) => void;
};

const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming"
];

export default function EditProfilePanel({ userData, token, onCancel, onSuccess }: Props) {
  const mapsContext = useContext(MapsContext);

  // Format phone number helper (defined before state so we can use it in initialization)
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    // Format based on length
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    } else if (limitedDigits.length <= 6) {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    } else {
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
  };

  const [formData, setFormData] = useState({
    full_name: userData?.full_name || '',
    phone: userData?.phone ? formatPhoneNumber(userData.phone) : '',
    address: userData?.address || '',
    city: userData?.city || '',
    state: userData?.state || '',
    zipcode: userData?.zipcode || '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(!!userData?.address); // Track if address was selected from autocomplete
  const lastAutocompleteSelectionTime = useRef<number>(0); // Timestamp of last autocomplete selection
  const [isPasswordSectionExpanded, setIsPasswordSectionExpanded] = useState(false); // Track password section expansion
  const [newPasswordFocused, setNewPasswordFocused] = useState(false); // Track new password field focus

  const passwordChecks = useMemo(() => {
    const pwd = passwordData.new_password;
    return [
      { label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: pwd.length >= PASSWORD_MIN_LENGTH },
      { label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(pwd) },
      { label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(pwd) },
      { label: "At least one number (0-9)", met: /\d/.test(pwd) },
      { label: "At least one special character (!@#$%^&*...)", met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd) },
      { label: "No leading or trailing spaces", met: pwd.length === 0 || (!pwd.startsWith(' ') && !pwd.endsWith(' ')) },
    ];
  }, [passwordData.new_password]);

  // Handle phone number input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({...formData, phone: formatted});
  };

  // Handle Google Places selection
  const handlePlaceSelected = (place: { address: string; city: string; state: string; zipcode: string }) => {
    // Record the timestamp of this selection
    lastAutocompleteSelectionTime.current = Date.now();
    
    setFormData({
      ...formData,
      address: place.address,
      city: place.city,
      state: place.state,
      zipcode: place.zipcode,
    });
    
    // Only mark as valid if we have a non-empty address (valid selection)
    // Empty address means it was cleared due to invalid selection
    const isValid = place.address.trim().length > 0;
    setIsValidAddress(isValid);
  };

  // Handle manual address typing (invalidates address)
  const handleAddressChange = (value: string) => {
    setFormData({...formData, address: value});
    
    // Check if this onChange is within 500ms of last autocomplete selection
    // This allows multiple onChange events from a single autocomplete selection
    // Using 500ms to be safe for slower devices and all possible timing scenarios
    const timeSinceLastSelection = Date.now() - lastAutocompleteSelectionTime.current;
    if (timeSinceLastSelection < 500) {
      // This onChange came from autocomplete, keep the validation state
      return;
    }
    
    // Otherwise, user is manually typing - invalidate
    setIsValidAddress(false);
  };

  // Prevent non-digit input in phone field
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      return;
    }

    // Allow: Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      return;
    }

    // Block: anything that's not a digit
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Handle paste - only allow digits
  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const digitsOnly = pastedText.replace(/\D/g, '');
    
    if (pastedText !== digitsOnly) {
      e.preventDefault();
      const formatted = formatPhoneNumber(digitsOnly);
      setFormData({...formData, phone: formatted});
    }
  };

  const geocodeAddress = async (fullAddress: string): Promise<{ lat: number; lng: number }> => {
    if (!mapsContext?.loaded || !window.google?.maps) {
      throw new Error('Google Maps is not loaded. Please try again.');
    }

    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address: fullAddress }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          reject(new Error('Failed to geocode address'));
        }
      });
    });
  };

  // Helper function to validate profile data
  const validateProfileData = (): boolean => {
    // Validate address was selected from autocomplete
    if (!isValidAddress) {
      toast.error('Please select a valid address from the dropdown suggestions');
      return false;
    }

    // Validate address is provided
    if (!formData.address || !formData.address.trim()) {
      toast.error('Please select a valid address from the suggestions');
      return false;
    }

    // Validate city is San Jose
    if (!formData.city || formData.city.toLowerCase() !== 'san jose') {
      toast.error('Address must be in San Jose, CA. Please select a San Jose address from the dropdown.');
      return false;
    }

    // Validate state is California
    if (!formData.state || formData.state.toLowerCase() !== 'california') {
      toast.error('Address must be in California. Please select a San Jose, CA address from the dropdown.');
      return false;
    }

    // Validate zipcode is present
    if (!formData.zipcode) {
      toast.error('Please select a complete address from the dropdown suggestions');
      return false;
    }

    // Validate phone number if provided
    if (formData.phone) {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length > 0 && digits.length !== 10) {
        toast.error('Phone number must be 10 digits');
        return false;
      }
    }

    return true;
  };

  // Helper function to validate password data
  const validatePasswordData = (): boolean => {
    const hasPasswordData = passwordData.current_password || passwordData.new_password || passwordData.confirm_password;
    
    if (!hasPasswordData) {
      return true;
    }

    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error('Please fill in all password fields or leave them empty to skip password change');
      return false;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return false;
    }

    const validation = validatePassword(passwordData.new_password);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return false;
    }

    return true;
  };

  // Combined save handler for both profile and password
  const handleSaveAll = async () => {
    if (!token) return;

    setError('');
    setPasswordError('');

    // Validate profile data
    if (!validateProfileData()) {
      return;
    }

    // Validate password data (if user is trying to change password)
    if (!userData?.google_id && !validatePasswordData()) {
      return;
    }

    setSaving(true);

    try {
      // Geocode the address to get coordinates
      const fullAddress = [
        formData.address,
        formData.city,
        formData.state,
        formData.zipcode
      ].filter(Boolean).join(', ');

      const coords = await geocodeAddress(fullAddress);

      // Extract only digits from phone before sending to backend
      const dataToSend = {
        ...formData,
        phone: formData.phone ? formData.phone.replace(/\D/g, '') : formData.phone,
        latitude: coords.lat,
        longitude: coords.lng,
      };
      
      // Update profile
      const updatedUser = await updateProfile(token, dataToSend);

      // Update password if provided (and not a Google user)
      const hasPasswordData = passwordData.current_password || passwordData.new_password || passwordData.confirm_password;
      if (!userData?.google_id && hasPasswordData) {
        await changePassword(token, {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        });
        toast.success('Profile and password updated successfully!');
      } else {
        toast.success('Profile updated successfully!');
      }

      // Clear password fields
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      
      // Update user context and return to view mode
      onSuccess?.(updatedUser);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save changes';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card edit-card">
      <header className="edit-head">
        <h3>Profile</h3>
        <span className="sub">User Information</span>
      </header>

      <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input 
            id="name" 
            type="text" 
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            placeholder="Enter your full name"
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input 
            id="email" 
            type="email" 
            value={userData?.email || ''} 
            disabled
            className="bg-gray-100 cursor-not-allowed"
            title="Email cannot be changed"
          />
        </div>

        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input 
            id="phone" 
            type="tel" 
            value={formData.phone}
            onChange={handlePhoneChange}
            onKeyDown={handlePhoneKeyDown}
            onPaste={handlePhonePaste}
            placeholder="(555) 555-5555"
            maxLength={14}
          />
        </div>

        <div className="field">
          <label htmlFor="address">
            Delivery Address <span className="text-red-600">*</span>
            <span className="text-xs text-gray-500 ml-2">(San Jose, CA only - must select from dropdown)</span>
          </label>
          <GooglePlacesAutocomplete
            value={formData.address}
            onChange={handleAddressChange}
            onPlaceSelected={handlePlaceSelected}
            placeholder="Start typing address..."
            className="w-full"
          />
        </div>

        <div className="field">
          <label htmlFor="city">City</label>
          <input 
            id="city" 
            type="text" 
            value={formData.city}
            disabled
            placeholder="Auto-filled from address"
            className="bg-gray-100 cursor-not-allowed"
            title="Auto-filled when you select an address"
          />
        </div>

        <div className="field">
            <label htmlFor="state">State</label>
            <input 
              id="state" 
              type="text" 
              value={formData.state}
              disabled
              placeholder="Auto-filled from address"
              className="bg-gray-100 cursor-not-allowed"
              title="Auto-filled when you select an address"
            />
        </div>

        <div className="field">
          <label htmlFor="zipcode">Zipcode</label>
          <input 
            id="zipcode" 
            type="text" 
            value={formData.zipcode}
            disabled
            placeholder="Auto-filled from address"
            className="bg-gray-100 cursor-not-allowed"
            title="Auto-filled when you select an address"
            maxLength={10}
          />
        </div>

        {/* Only show password section for non-OAuth users */}
        {!userData?.google_id && (
          <>
            <hr className="sep" />
            
            {/* Collapsible Password Section */}
            <div className="password-section">
              <button 
                type="button"
                className="password-toggle-header"
                onClick={() => setIsPasswordSectionExpanded(!isPasswordSectionExpanded)}
                aria-expanded={isPasswordSectionExpanded}
              >
                <h4 className="section-title">Change Password</h4>
                <span className="toggle-icon">
                  {isPasswordSectionExpanded ? '▼' : '▶'}
                </span>
              </button>

              {isPasswordSectionExpanded && (
                <div className="password-fields">
                  <div className="field">
                    <label htmlFor="curpass">Current Password</label>
                    <div className="input-affix">
                      <input 
                        id="curpass" 
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="••••••••••"
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                      />
                      <button 
                        type="button" 
                        className="iconbtn" 
                        aria-label="Toggle visibility"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="newpass">New Password</label>
                    <div className="input-affix">
                      <input 
                        id="newpass" 
                        type={showNewPassword ? "text" : "password"}
                        placeholder="New password (min 14 characters)"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                        onFocus={() => setNewPasswordFocused(true)}
                        onBlur={() => setNewPasswordFocused(false)}
                      />
                      <button 
                        type="button" 
                        className="iconbtn" 
                        aria-label="Toggle visibility"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {(newPasswordFocused || passwordData.new_password.length > 0) && (
                      <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Password Requirements:
                        </p>
                        <ul className="space-y-1.5">
                          {passwordChecks.map((check, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              {passwordData.new_password.length > 0 ? (
                                check.met ? (
                                  <Check size={16} className="text-green-600 flex-shrink-0" />
                                ) : (
                                  <X size={16} className="text-red-500 flex-shrink-0" />
                                )
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                              )}
                              <span className={`text-sm ${
                                passwordData.new_password.length === 0 
                                  ? 'text-gray-600' 
                                  : check.met 
                                    ? 'text-green-700' 
                                    : 'text-red-600'
                              }`}>
                                {check.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="confpass">Confirm New Password</label>
                    <div className="input-affix">
                      <input 
                        id="confpass" 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                      />
                      <button 
                        type="button" 
                        className="iconbtn" 
                        aria-label="Toggle visibility"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Show info message for Google OAuth users */}
        {userData?.google_id && (
          <>
            <hr className="sep" />
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-900 dark:border-gray-300">
              <h4 className="text-gray-900 dark:text-white font-semibold mb-2">
                🔐 Signed in with Google
              </h4>
              <p className="text-gray-900 dark:text-gray-100 text-sm">
                Your password is managed by your Google account. To change your password, visit your Google Account settings.
              </p>
            </div>
          </>
        )}

        {/* Save All Button at the Bottom */}
        <div className="actions save-all-section">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn primary" 
            disabled={saving}
            onClick={handleSaveAll}
          >
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </form>
    </section>
  );
}
