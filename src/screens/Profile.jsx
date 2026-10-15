
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRegisterRefresh } from '../hooks/RefreshContext';

// Center-crop to a square and resize to 256px.
const resizeToSquare = (file, size = 256) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not process that image'));
        return;
      }

      // White background prevents transparent PNGs turning black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Could not process that image')),
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };

    img.src = url;
  });

export default function Profile({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [showTooltip, setShowTooltip] = useState(false);

  const fileInputRef = useRef(null);
  const avatarRef = useRef(null);

  // Refresh authenticated user data.
  const refreshUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error) {
      setUser(user);
    }
  }, []);

  useRegisterRefresh(refreshUser);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (active && !error) {
        setUser(user);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const savedName = user?.user_metadata?.display_name || '';

  // Reset the image error when the avatar URL changes.
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  // Keep the input synchronized with the saved display name.
  useEffect(() => {
    setDisplayName(savedName);
  }, [savedName]);

  // Close the tooltip when clicking or tapping outside the avatar area.
  useEffect(() => {
    if (!showTooltip) return;

    const handleOutsideClick = (event) => {
      if (
        avatarRef.current &&
        !avatarRef.current.contains(event.target)
      ) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [showTooltip]);

  // Save display name.
  const handleNameSave = async () => {
    const trimmed = displayName.trim();

    if (!trimmed) {
      alert('Please enter a name.');
      return;
    }

    setSavingName(true);
    setNameSaved(false);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });

      if (error) throw error;

      setUser(data.user);
      setDisplayName(trimmed);
      setNameSaved(true);

      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      alert('Error saving name: ' + err.message);
    } finally {
      setSavingName(false);
    }
  };

  // Upload and update profile picture.
  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again.
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('That image is too large. Please choose one under 10 MB.');
      return;
    }

    if (!user) return;

    setUploading(true);

    try {
      const blob = await resizeToSquare(file);
      const path = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, {
          upsert: true,
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path);

      const { data, error: updateError } =
        await supabase.auth.updateUser({
          data: {
            avatar_url: `${publicUrl}?v=${Date.now()}`,
          },
        });

      if (updateError) throw updateError;

      setUser(data.user);
      setImgFailed(false);
      setShowTooltip(false);
    } catch (err) {
      alert('Error uploading photo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Remove profile picture.
  const handleRemovePhoto = async () => {
    if (!user || !avatarUrl) return;

    const confirmed = window.confirm(
      'Are you sure you want to remove your profile photo?'
    );

    if (!confirmed) return;

    setUploading(true);

    try {
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([`${user.id}/avatar.jpg`]);

      if (storageError) throw storageError;

      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });

      if (error) throw error;

      setUser(data.user);
      setImgFailed(false);
      setShowTooltip(false);
    } catch (err) {
      alert('Error removing photo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Permanently delete the account.
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure? This will permanently delete your account and ALL your financial data. This action cannot be undone.'
    );

    if (!confirmed || !user) return;

    setLoading(true);

    try {
      // Best-effort photo cleanup.
      await supabase.storage
        .from('avatars')
        .remove([`${user.id}/avatar.jpg`]);

      // Requires the secure delete_user RPC function.
      const { error } = await supabase.rpc('delete_user');

      if (error) throw error;

      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      alert('Error deleting account: ' + err.message);
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Profile</h1>
      <p className="screen-sub">Manage your account details.</p>

      <div className="profile-card">
        {/* Column 1: Avatar and Change Photo */}
        <div className="profile-col-avatar" ref={avatarRef}>
          <div className="profile-avatar-wrap">
            <button
              type="button"
              className="profile-avatar-large"
              onClick={() => {
                if (avatarUrl && !imgFailed && !uploading) {
                  setShowTooltip((prev) => !prev);
                }
              }}
              disabled={!avatarUrl || imgFailed || uploading}
              aria-label={
                avatarUrl
                  ? 'Manage profile photo'
                  : 'No profile photo'
              }
              aria-expanded={avatarUrl ? showTooltip : undefined}
              aria-haspopup={avatarUrl ? true : undefined}
            >
              {avatarUrl && !imgFailed ? (
                <>
                  <img
                    className="avatar-img"
                    src={avatarUrl}
                    alt="Profile"
                    onError={() => setImgFailed(true)}
                  />

                  <div className="profile-avatar-overlay">
                    <svg
                      className="profile-avatar-pencil"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </div>
                </>
              ) : (
                user.email?.charAt(0).toUpperCase() || '?'
              )}
            </button>

            {/* Remove Photo Tooltip */}
            {showTooltip && avatarUrl && (
              <div
                className="profile-avatar-tooltip"
                role="group"
                aria-label="Profile photo options"
              >
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                >
                  {uploading ? 'Removing...' : 'Remove photo'}
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
            aria-label="Choose profile photo"
          />

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? 'Uploading...'
              : avatarUrl
                ? 'Change photo'
                : 'Add photo'}
          </button>
        </div>

        {/* Column 2: Email and Membership Date */}
        <div className="profile-col-info">
          <label className="form-label">Email Address</label>
          <p className="profile-email">{user.email}</p>

          <label
            className="form-label"
            style={{ marginTop: 16 }}
          >
            Member Since
          </label>

          <p className="profile-email">
            {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Third row on mobile; third column on desktop */}
        <div className="profile-col-name">
          <label className="form-label" htmlFor="profile-display-name">
            Display Name
          </label>

          <input
            id="profile-display-name"
            type="text"
            className="auth-input"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setNameSaved(false);
            }}
            placeholder="What should we call you?"
            maxLength={30}
            autoComplete="nickname"
          />

          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: 8 }}
            onClick={handleNameSave}
            disabled={
              savingName ||
              !displayName.trim() ||
              displayName.trim() === savedName
            }
          >
            {savingName
              ? 'Saving...'
              : nameSaved
                ? 'Saved ✓'
                : 'Save name'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone">
        <h3 className="danger-title">Danger Zone</h3>

        <p className="danger-sub">
          Once you delete your account, there is no going back.
          Please be certain.
        </p>

        <button
          type="button"
          className="btn btn-danger"
          onClick={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? 'Deleting...' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
}
