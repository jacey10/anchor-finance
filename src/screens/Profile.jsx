import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRegisterRefresh } from '../hooks/RefreshContext';

// Center-crop to a square and shrink to 256px so uploads stay around 20-40 KB
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
      // White backdrop so transparent PNGs don't turn black as JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process that image'))),
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
  const fileInputRef = useRef(null);

  const refreshUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }, []);

  useRegisterRefresh(refreshUser);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url;

  // If a new photo is set, give the image another chance to load
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('That image is too large. Please choose one under 10 MB.');
      return;
    }

    setUploading(true);
    try {
      const blob = await resizeToSquare(file);
      const path = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      // ?v= makes browsers fetch the new picture instead of the cached one
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: `${publicUrl}?v=${Date.now()}` },
      });
      if (updateError) throw updateError;

      setUser(data.user);
    } catch (err) {
      alert('Error uploading photo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you absolutely sure? This will permanently delete your account and ALL your financial data. This action cannot be undone."
    );

    if (confirmed) {
      setLoading(true);
      try {
        // Best effort: remove the stored photo so it isn't left behind
        try {
          await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`]);
        } catch (e) {
          // ignore, deleting the account matters more
        }

        // Call the secure function we created in Step 1
        const { error } = await supabase.rpc('delete_user');
        if (error) throw error;
        await supabase.auth.signOut();
        onLogout();
      } catch (err) {
        alert("Error deleting account: " + err.message);
        setLoading(false);
      }
    }
  };

  if (!user) return <div className="loading">Loading profile...</div>;

  return (
    <div className="screen">
      <h1 className="screen-title">Profile</h1>
      <p className="screen-sub">Manage your account details.</p>
      <div className="profile-card">
        <div className="profile-avatar-large">
          {avatarUrl && !imgFailed
            ? <img className="avatar-img" src={avatarUrl} alt="Profile" onError={() => setImgFailed(true)} />
            : user.email.charAt(0).toUpperCase()}
        </div>
        
        <div className="profile-info">
          <label className="form-label">Email Address</label>
          <p className="profile-email">{user.email}</p>
          <label className="form-label" style={{ marginTop: 16 }}>Member Since</label>
          <p className="profile-email">{new Date(user.created_at).toLocaleDateString()}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-outline"
            style={{ marginTop: 16 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Add photo'}
          </button>
        </div>
      </div>

      <div className="danger-zone">
        <h3 className="danger-title">Danger Zone</h3>
        <p className="danger-sub">Once you delete your account, there is no going back. Please be certain.</p>
        <button 
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