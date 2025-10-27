import "./profile.css";
import "./profile_edit.css";
import { useState, useRef } from "react";
import { UserInfo, updateProfile, changePassword } from "@/lib/api/profile";
import GooglePlacesAutocomplete from "@/components/google_places_autocomplete/GooglePlacesAutocomplete";

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

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError('');

    // Validate address was selected from autocomplete
    if (!isValidAddress) {
      alert('Please select a valid address from the dropdown suggestions');
      return;
    }

    // Validate address is provided
    if (!formData.address || !formData.address.trim()) {
      alert('Please select a valid address from the suggestions');
      return;
    }

    // Validate city is San Jose
    if (!formData.city || formData.city.toLowerCase() !== 'san jose') {
      alert('Address must be in San Jose, CA. Please select a San Jose address from the dropdown.');
      return;
    }

    // Validate state is California
    if (!formData.state || formData.state.toLowerCase() !== 'california') {
      alert('Address must be in California. Please select a San Jose, CA address from the dropdown.');
      return;
    }

    // Validate zipcode is present
    if (!formData.zipcode) {
      alert('Please select a complete address from the dropdown suggestions');
      return;
    }

    // Validate phone number if provided
    if (formData.phone) {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length > 0 && digits.length !== 10) {
        alert('Phone number must be 10 digits');
        return;
      }
    }

    setSaving(true);

    try {
      // Extract only digits from phone before sending to backend
      const dataToSend = {
        ...formData,
        phone: formData.phone ? formData.phone.replace(/\D/g, '') : formData.phone,
      };
      
      const updatedUser = await updateProfile(token, dataToSend);
      onSuccess?.(updatedUser);
      alert('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setPasswordError('');

    // Validate passwords match
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match');
      alert('New passwords do not match');
      return;
    }

    // Validate password length
    if (passwordData.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      alert('Password must be at least 8 characters');
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword(token, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      alert('Password changed successfully!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
      alert(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="card edit-card">
      <header className="edit-head">
        <h3>Profile</h3>
        <span className="sub">User Information</span>
      </header>

      <form className="form-grid" onSubmit={handleProfileSubmit}>
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
            Address <span className="text-red-600">*</span>
            <span className="text-xs text-gray-500 ml-2">(San Jose, CA only - must select from dropdown)</span>
          </label>
          <div onKeyDown={(e) => {
            // Prevent Enter key from submitting the form while using autocomplete
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}>
            <GooglePlacesAutocomplete
              value={formData.address}
              onChange={handleAddressChange}
              onPlaceSelected={handlePlaceSelected}
              placeholder="Start typing address..."
              className="w-full"
            />
          </div>
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

        <div className="actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Now'}
          </button>
        </div>

        {/* Only show password section for non-OAuth users */}
        {!userData?.google_id && (
          <>
            <hr className="sep" />
            <h4 className="section-title">Password</h4>

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
              placeholder="New password (min 8 characters)"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
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

        <div className="actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={savingPassword}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn primary" 
            onClick={handlePasswordSubmit}
            disabled={savingPassword || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
          >
            {savingPassword ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
          </>
        )}

        {/* Show info message for Google OAuth users */}
        {userData?.google_id && (
          <>
            <hr className="sep" />
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-blue-900 dark:text-blue-100 font-semibold mb-2">
                🔐 Signed in with Google
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Your password is managed by your Google account. To change your password, visit your Google Account settings.
              </p>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
