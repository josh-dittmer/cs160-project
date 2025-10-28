"use client";
import "./profile.css";
import TopBar from "@/components/top-bar/top-bar";
import Sidebar from "@/components/sidebar/sidebar";
import AccountWindow from "@/components/account_window/account_window";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { getCurrentUser, updateProfile, UserInfo } from "@/lib/api/profile";
import EditProfilePanel from "./EditProfilePanel";

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState<UserInfo | null>(user);
  const [loading, setLoading] = useState(true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUser() {
      if (token) {
        try {
          const data = await getCurrentUser(token);
          setUserData(data);
          updateUser(data);
        } catch (error) {
          console.error('Failed to fetch user:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    fetchUser();
  }, [token]);

  // Sync userData with auth context user whenever it changes
  useEffect(() => {
    if (user) {
      setUserData(user);
    }
  }, [user]);

  // Generate initials from full name
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Format phone number to (XXX) XXX-XXXX
  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Only format if we have a valid 10-digit number
    if (digits.length !== 10) return phone;
    
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Handle image upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      // Clear the input
      e.target.value = '';
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const updatedUser = await updateProfile(token, { profile_picture: base64String });
        setUserData(updatedUser);
        updateUser(updatedUser);
        alert('Profile picture updated successfully!');
      } catch (error: any) {
        alert(error.message || 'Failed to upload image');
      } finally {
        // Clear the input so the same file can be selected again
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle URL submission
  const handleUrlSubmit = async () => {
    if (!imageUrl.trim() || !token) return;

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch {
      alert('Please enter a valid URL');
      return;
    }

    try {
      const updatedUser = await updateProfile(token, { profile_picture: imageUrl });
      setUserData(updatedUser);
      updateUser(updatedUser);
      setShowUrlInput(false);
      setImageUrl('');
      alert('Profile picture updated successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to update profile picture');
    }
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p>
        </div>
      </>
    );
  }


  return (
    <>
      <TopBar />
      <div className="grid grid-cols-[75px_auto] md:grid-cols-[200px_auto] overflow-hidden h-[calc(100vh-64px)]">
        <div className="relative border-bg-dark border-r bg-bg-light p-3">
          <Sidebar />
          <div className="absolute bottom-0 right-0 transform-[translateX(100%)] mb-3 z-10 pointer-events-none">
            <AccountWindow />
          </div>
        </div>

        <main className="p-8 overflow-y-auto">
          <header className="profile-header">
            <h1>Profile</h1>
          </header>

          <section className="profile-grid">
            {/* Left card (inline) */}
            <article className="card profile-card">
              <div className="avatar-wrap">
                {userData?.profile_picture ? (
                  <img src={userData.profile_picture} alt="User avatar" className="avatar" />
                ) : (
                  <div className="avatar" style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: 'white'
                  }}>
                    {getInitials(userData?.full_name || null)}
                  </div>
                )}

                <input 
                    type="file"
                    id="avatarInput"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{display: "none"}}
                />
                <button className="avatar-edit" aria-label="Edit photo" onClick={() => document.getElementById("avatarInput")?.click()}>
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41L18.37 3.29a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
              </div>
              
              {/* Image upload options */}
              <div className="mt-3 flex flex-col gap-2">
                <button 
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  {showUrlInput ? '✕ Cancel' : '🔗 Use image URL'}
                </button>
                
                {showUrlInput && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                    />
                    <button
                      type="button"
                      onClick={handleUrlSubmit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Save URL
                    </button>
                  </div>
                )}
              </div>
              <h2 className="name">{userData?.full_name || 'User'}</h2>
              <p className="address">
                {userData?.address || 'No address set'}
                {userData?.city && userData?.state && (
                  <>
                    <br /> {userData.city}, {userData.state} {userData.zipcode}
                  </>
                )}
              </p>
            </article>

            {/* Right pane: view vs edit */}
            {!editMode ? (
              <article className="card info-card">
                <div className="info-card__bar">
                  <h3>User Information</h3>
                  <button className="btn btn-primary" type="button" onClick={() => setEditMode(true)}>
                    Edit
                  </button>
                </div>

                <div className="info-grid">
                  <div className="info-field">
                    <span className="label">Name</span>
                    <span className="value">{userData?.full_name || 'Not set'}</span>
                  </div>
                  <div className="info-field">
                    <span className="label">E-Mail</span>
                    <span className="value">{userData?.email}</span>
                  </div>
                  <div className="info-field">
                    <span className="label">Phone</span>
                    <span className="value">{formatPhoneNumber(userData?.phone || null) || 'Not set'}</span>
                  </div>
                  <div className="info-field">
                    <span className="label">Password</span>
                    <span className="value ok">
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                      </svg>
                      Password has been set
                    </span>
                  </div>
                </div>
              </article>
            ) : (
              <EditProfilePanel 
                userData={userData} 
                token={token}
                onCancel={() => setEditMode(false)}
                onSuccess={(updatedUser) => {
                  setUserData(updatedUser);
                  updateUser(updatedUser);
                  setEditMode(false);
                }}
              />
            )}
          </section>
        </main>
      </div>
    </>
  );
}
