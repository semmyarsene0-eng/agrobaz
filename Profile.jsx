
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../firebase";
import { supabase } from "../supabase";

import { useNavigate } from "react-router-dom";

import "./Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    businessName: "",
    sellerName: "",
    location: "",
    category: "",
    phone: "",
    whatsapp: "",
    bio: "",
    address: "",
    profilePhoto: "",
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================
  // LOAD PROFILE
  // ==========================================

  useEffect(() => {
    async function loadProfile() {
      const user = auth.currentUser;

      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data();

          const existingPhoto =
            data.profilePhoto ||
            data.photoURL ||
            data.photo ||
            "";

          setProfile({
            businessName: data.businessName || "",
            sellerName:
              data.sellerName ||
              data.name ||
              data.displayName ||
              user.displayName ||
              "",
            location: data.location || "",
            category: data.category || "",
            phone: data.phone || "",
            whatsapp: data.whatsapp || "",
            bio: data.bio || "",
            address: data.address || "",
            profilePhoto: existingPhoto,
          });

          setPreviewImage(existingPhoto);
        } else {
          setProfile((current) => ({
            ...current,
            sellerName: user.displayName || "",
          }));
        }
      } catch (err) {
        console.error("Profile loading error:", err);
        setError("Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [navigate]);

  // ==========================================
  // HANDLE TEXT CHANGES
  // ==========================================

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
    setError("");
  }

  // ==========================================
  // SELECT PROFILE IMAGE
  // ==========================================

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");
    setError("");

    // Allowed image types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please choose a JPG, PNG, or WEBP image."
      );

      event.target.value = "";
      return;
    }

    // Maximum 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Profile image must be smaller than 5MB."
      );

      event.target.value = "";
      return;
    }

    setSelectedImage(file);

    const imagePreview =
      URL.createObjectURL(file);

    setPreviewImage(imagePreview);
  }

  // ==========================================
  // REMOVE SELECTED PHOTO
  // ==========================================

  function removePhoto() {
    setSelectedImage(null);
    setPreviewImage("");

    setProfile((current) => ({
      ...current,
      profilePhoto: "",
    }));

    const fileInput =
      document.getElementById("profilePhoto");

    if (fileInput) {
      fileInput.value = "";
    }
  }

  // ==========================================
  // UPLOAD PROFILE IMAGE
  // ==========================================

  async function uploadProfileImage(userId) {
    if (!selectedImage) {
      return profile.profilePhoto;
    }

    const fileExtension =
      selectedImage.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const filePath =
      `${userId}/profile-${Date.now()}.${fileExtension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("profile-images")
        .upload(filePath, selectedImage, {
          cacheControl: "3600",
          upsert: true,
          contentType: selectedImage.type,
        });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData,
    } =
      supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error(
        "Unable to get uploaded image URL."
      );
    }

    return publicUrlData.publicUrl;
  }

  // ==========================================
  // SAVE PROFILE
  // ==========================================

  async function handleSave(event) {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      setError(
        "You must be logged in to save your profile."
      );
      return;
    }

    if (!profile.businessName.trim()) {
      setError(
        "Please enter your business name."
      );
      return;
    }

    if (!profile.location.trim()) {
      setError(
        "Please enter your location."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      // Upload selected image first
      let profilePhoto =
        profile.profilePhoto;

      if (selectedImage) {
        profilePhoto =
          await uploadProfileImage(user.uid);
      }

      const userRef =
        doc(db, "users", user.uid);

      await setDoc(
        userRef,
        {
          businessName:
            profile.businessName.trim(),

          sellerName:
            profile.sellerName.trim(),

          location:
            profile.location.trim(),

          category:
            profile.category,

          phone:
            profile.phone.trim(),

          whatsapp:
            profile.whatsapp.trim(),

          bio:
            profile.bio.trim(),

          address:
            profile.address.trim(),

          profilePhoto:
            profilePhoto || "",

          email:
            user.email || "",

          updatedAt:
            serverTimestamp(),
        },
        { merge: true }
      );

      setProfile((current) => ({
        ...current,
        profilePhoto,
      }));

      setSelectedImage(null);

      setMessage(
        "Your seller profile has been saved successfully."
      );

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error(
        "Profile save error:",
        err
      );

      setError(
        err.message ||
          "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // BACK
  // ==========================================

  function goBack() {
    navigate(-1);
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-loading">
            <div className="profile-spinner"></div>

            <h2>
              Loading your profile...
            </h2>

            <p>
              Please wait.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="profile-page">

      <div className="profile-container">

        {/* BACK */}

        <button
          type="button"
          className="profile-back-button"
          onClick={goBack}
        >
          ← Back
        </button>

        {/* HEADER */}

        <div className="profile-heading">

          <span className="profile-eyebrow">
            SELLER ACCOUNT
          </span>

          <h1>
            My Seller Profile
          </h1>

          <p>
            Create a professional seller profile
            so AgroBaz buyers can learn more
            about your business.
          </p>

        </div>

        {/* SUCCESS */}

        {message && (
          <div className="profile-success">
            ✓ {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="profile-error">
            ⚠️ {error}
          </div>
        )}

        <form
          className="profile-form"
          onSubmit={handleSave}
        >

          {/* ======================================
              PROFILE PHOTO
          ======================================= */}

          <section className="profile-card profile-photo-card">

            <div className="profile-photo-preview">

              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Seller profile preview"
                />
              ) : (
                <span>👨‍🌾</span>
              )}

            </div>

            <div className="profile-photo-info">

              <h2>
                Profile Photo
              </h2>

              <p>
                Add a photo of yourself,
                your farm, or your business.
              </p>

              <div className="profile-photo-actions">

                <label
                  htmlFor="profilePhoto"
                  className="profile-upload-button"
                >
                  📷 Choose Image
                </label>

                <input
                  id="profilePhoto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  hidden
                />

                {previewImage && (
                  <button
                    type="button"
                    className="profile-remove-button"
                    onClick={removePhoto}
                  >
                    Remove Photo
                  </button>
                )}

              </div>

              <small>
                JPG, PNG or WEBP • Maximum 5MB
              </small>

              {selectedImage && (
                <div className="selected-image-name">
                  Selected: {selectedImage.name}
                </div>
              )}

            </div>

          </section>

          {/* ======================================
              BUSINESS INFORMATION
          ======================================= */}

          <section className="profile-card">

            <div className="profile-card-heading">

              <div className="profile-card-icon">
                🏪
              </div>

              <div>
                <h2>
                  Business Information
                </h2>

                <p>
                  Tell buyers about your agricultural
                  business.
                </p>
              </div>

            </div>

            <div className="profile-grid">

              <div className="profile-field">

                <label htmlFor="businessName">
                  Business / Store Name *
                </label>

                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  value={profile.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Semmy Agro Supplies"
                  required
                />

              </div>

              <div className="profile-field">

                <label htmlFor="sellerName">
                  Seller Name
                </label>

                <input
                  id="sellerName"
                  name="sellerName"
                  type="text"
                  value={profile.sellerName}
                  onChange={handleChange}
                  placeholder="Your name"
                />

              </div>

              <div className="profile-field">

                <label htmlFor="location">
                  Location *
                </label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={profile.location}
                  onChange={handleChange}
                  placeholder="e.g. Kampala, Uganda"
                  required
                />

              </div>

              <div className="profile-field">

                <label htmlFor="category">
                  Business Category
                </label>

                <select
                  id="category"
                  name="category"
                  value={profile.category}
                  onChange={handleChange}
                >

                  <option value="">
                    Select a category
                  </option>

                  <option value="Fresh Crops">
                    Fresh Crops
                  </option>

                  <option value="Seeds & Seedlings">
                    Seeds & Seedlings
                  </option>

                  <option value="Fertilizers & Inputs">
                    Fertilizers & Inputs
                  </option>

                  <option value="Machinery & Tools">
                    Machinery & Tools
                  </option>

                  <option value="Livestock">
                    Livestock
                  </option>

                  <option value="Animal Feed">
                    Animal Feed
                  </option>

                  <option value="Other Agricultural Products">
                    Other Agricultural Products
                  </option>

                </select>

              </div>

            </div>

          </section>

          {/* ======================================
              CONTACT INFORMATION
          ======================================= */}

          <section className="profile-card">

            <div className="profile-card-heading">

              <div className="profile-card-icon">
                📞
              </div>

              <div>
                <h2>
                  Contact Information
                </h2>

                <p>
                  Give buyers ways to contact
                  your business.
                </p>
              </div>

            </div>

            <div className="profile-grid">

              <div className="profile-field">

                <label htmlFor="phone">
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="+256 7XX XXX XXX"
                />

              </div>

              <div className="profile-field">

                <label htmlFor="whatsapp">
                  WhatsApp Number
                </label>

                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  value={profile.whatsapp}
                  onChange={handleChange}
                  placeholder="2567XXXXXXXX"
                />

                <small>
                  Use the international format.
                </small>

              </div>

              <div className="profile-field profile-field-full">

                <label htmlFor="address">
                  Business Address
                </label>

                <input
                  id="address"
                  name="address"
                  type="text"
                  value={profile.address}
                  onChange={handleChange}
                  placeholder="e.g. Kalerwe Market, Kampala"
                />

              </div>

            </div>

          </section>

          {/* ======================================
              ABOUT BUSINESS
          ======================================= */}

          <section className="profile-card">

            <div className="profile-card-heading">

              <div className="profile-card-icon">
                📝
              </div>

              <div>
                <h2>
                  About Your Business
                </h2>

                <p>
                  Help buyers understand what
                  your business offers.
                </p>
              </div>

            </div>

            <div className="profile-field">

              <label htmlFor="bio">
                Business Description
              </label>

              <textarea
                id="bio"
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                placeholder="Tell buyers about your business, products and experience..."
                rows="6"
                maxLength="500"
              />

              <small>
                {profile.bio.length}/500 characters
              </small>

            </div>

          </section>

          {/* ======================================
              SAVE BUTTONS
          ======================================= */}

          <div className="profile-actions">

            <button
              type="button"
              className="profile-cancel-button"
              onClick={goBack}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="profile-save-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Profile"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default Profile;
