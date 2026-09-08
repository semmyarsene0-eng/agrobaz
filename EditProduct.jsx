
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../firebase";
import "./EditProduct.css";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    location: "",
    whatsapp: "",
    description: "",
    status: "Active",
  });

  const [currentImage, setCurrentImage] = useState("");
  const [currentImagePath, setCurrentImagePath] = useState("");

  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      const user = auth.currentUser;

      if (!user) {
        setError("Please login to edit your product.");
        setLoading(false);
        return;
      }

      try {
        const productRef = doc(db, "products", id);
        const snapshot = await getDoc(productRef);

        if (!snapshot.exists()) {
          setError("Product not found.");
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        if (data.sellerId !== user.uid) {
          setError(
            "You do not have permission to edit this product."
          );
          setLoading(false);
          return;
        }

        const stock = Math.max(
          0,
          Number(data.quantity ?? 0)
        );

        setProduct({
          name: data.name || "",
          category: data.category || "",
          price: data.price ?? "",
          quantity: stock,
          location: data.location || "",
          whatsapp: data.whatsapp || "",
          description: data.description || "",
          status:
            stock === 0
              ? "Inactive"
              : data.status || "Active",
        });

        setCurrentImage(data.image || "");
        setCurrentImagePath(data.imagePath || "");
      } catch (err) {
        console.error("Load product error:", err);

        setError(
          err.message || "Unable to load this product."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;

    setProduct((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleQuantityChange(e) {
    const value = e.target.value;

    setProduct((previous) => ({
      ...previous,
      quantity: value,
      status:
        Number(value) === 0
          ? "Inactive"
          : previous.status,
    }));
  }

  function handleStatusChange(e) {
    const value = e.target.value;

    if (
      value === "Active" &&
      Number(product.quantity) <= 0
    ) {
      alert(
        "This product has no stock. Add stock before activating it."
      );
      return;
    }

    setProduct((previous) => ({
      ...previous,
      status: value,
    }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Please choose a JPG, PNG, or WEBP image."
      );

      e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Image must be smaller than 5MB.");

      e.target.value = "";
      return;
    }

    setNewImage(file);

    const previewUrl = URL.createObjectURL(file);

    setNewImagePreview(previewUrl);
  }

  function removeNewImage() {
    setNewImage(null);
    setNewImagePreview("");

    const fileInput =
      document.getElementById("new-product-image");

    if (fileInput) {
      fileInput.value = "";
    }
  }

  function formatUgandaWhatsAppNumber(number) {
    let cleanNumber = String(number || "").replace(
      /\D/g,
      ""
    );

    if (cleanNumber.startsWith("0")) {
      cleanNumber =
        "256" + cleanNumber.substring(1);
    } else if (
      cleanNumber.startsWith("7") &&
      cleanNumber.length === 9
    ) {
      cleanNumber = "256" + cleanNumber;
    } else if (
      cleanNumber.startsWith("6") &&
      cleanNumber.length === 9
    ) {
      cleanNumber = "256" + cleanNumber;
    }

    return cleanNumber;
  }

  async function uploadReplacementImage(user) {
    if (!newImage) {
      return {
        imageUrl: currentImage,
        imagePath: currentImagePath,
      };
    }

    const formData = new FormData();

    formData.append("image", newImage);
    formData.append("userId", user.uid);
    formData.append(
      "oldImagePath",
      currentImagePath
    );

    const response = await fetch(
      "http://localhost:5000/replace-product-image",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          result.error ||
          "Failed to replace product image."
      );
    }

    if (!result.imageUrl) {
      throw new Error(
        "The server did not return the new image URL."
      );
    }

    return {
      imageUrl: result.imageUrl,
      imagePath: result.imagePath || "",
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (saving) {
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Please login first 🌾");
      navigate("/login");
      return;
    }

    if (!product.name.trim()) {
      alert("Enter a product name.");
      return;
    }

    if (!product.category.trim()) {
      alert("Select a product category.");
      return;
    }

    const price = Number(product.price);

    if (!Number.isFinite(price) || price <= 0) {
      alert("Enter a valid product price.");
      return;
    }

    const quantity = Number(product.quantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      alert("Enter a valid quantity.");
      return;
    }

    if (!product.location.trim()) {
      alert("Enter the product location.");
      return;
    }

    if (!product.whatsapp.trim()) {
      alert("Please enter a WhatsApp number.");
      return;
    }

    const whatsappNumber =
      formatUgandaWhatsAppNumber(
        product.whatsapp
      );

    if (
      !whatsappNumber.startsWith("2567") &&
      !whatsappNumber.startsWith("2566")
    ) {
      alert(
        "Please enter a valid Ugandan WhatsApp number, e.g. 0700123456."
      );
      return;
    }

    /*
     * A product with zero stock cannot be Active.
     */
    const updatedStatus =
      quantity === 0
        ? "Inactive"
        : product.status;

    try {
      setSaving(true);

      const productRef = doc(
        db,
        "products",
        id
      );

      const snapshot = await getDoc(
        productRef
      );

      if (!snapshot.exists()) {
        throw new Error(
          "Product no longer exists."
        );
      }

      const existingProduct =
        snapshot.data();

      if (
        existingProduct.sellerId !==
        user.uid
      ) {
        throw new Error(
          "You do not have permission to edit this product."
        );
      }

      /*
       * Replace image if a new image was selected.
       */
      let updatedImage = currentImage;
      let updatedImagePath =
        currentImagePath;

      if (newImage) {
        const uploadedImage =
          await uploadReplacementImage(
            user
          );

        updatedImage =
          uploadedImage.imageUrl;

        updatedImagePath =
          uploadedImage.imagePath;
      }

      /*
       * Update Firestore.
       */
      await updateDoc(productRef, {
        name: product.name.trim(),
        category: product.category.trim(),
        price,
        quantity,
        location: product.location.trim(),
        whatsapp: whatsappNumber,
        description:
          product.description.trim(),
        status: updatedStatus,
        image: updatedImage,
        imagePath: updatedImagePath,
        updatedAt: serverTimestamp(),
      });

      if (quantity === 0) {
        alert(
          "Product updated. It is now Out of Stock and inactive."
        );
      } else if (
        Number(existingProduct.quantity || 0) === 0 &&
        quantity > 0
      ) {
        alert(
          "Product restocked successfully 🌾"
        );
      } else {
        alert(
          "Product updated successfully 🌾"
        );
      }

      navigate("/my-products");
    } catch (err) {
      console.error(
        "Update product error:",
        err
      );

      alert(
        err.message ||
          "Unable to update the product."
      );
    } finally {
      setSaving(false);
    }
  }

  const currentQuantity = Number(
    product.quantity || 0
  );

  let stockClass = "stock-good";
  let stockLabel = "🟢 In Stock";

  if (currentQuantity === 0) {
    stockClass = "stock-out";
    stockLabel = "🔴 Out of Stock";
  } else if (currentQuantity <= 5) {
    stockClass = "stock-low";
    stockLabel = "🟡 Low Stock";
  }

  if (loading) {
    return (
      <div className="edit-product-page">
        <div className="edit-product-loading">
          <div>🌾</div>

          <h2>Loading Product...</h2>

          <p>
            Preparing your product information.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="edit-product-page">
        <div className="edit-product-error">
          <div>⚠️</div>

          <h2>
            Unable to edit product
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              navigate("/my-products")
            }
          >
            ← Back to My Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-product-page">
      <div className="edit-product-container">

        {/* HEADER */}

        <div className="edit-product-header">
          <div>
            <button
              type="button"
              className="edit-back-button"
              onClick={() =>
                navigate(-1)
              }
            >
              ← Back
            </button>

            <span className="edit-dashboard-label">
              AGROBAZ SELLER CENTER
            </span>

            <h1>
              Edit Product ✏️
            </h1>

            <p>
              Update your agricultural
              product listing.
            </p>
          </div>
        </div>

        {/* FORM */}

        <div className="edit-product-card">
          <form onSubmit={handleSubmit}>

            {/* IMAGE */}

            <div className="edit-image-section">
              <h2>
                Product Image
              </h2>

              <div className="edit-image-wrapper">
                {newImagePreview ? (
                  <img
                    src={newImagePreview}
                    alt="New product preview"
                    className="edit-product-image"
                  />
                ) : currentImage ? (
                  <img
                    src={currentImage}
                    alt={product.name}
                    className="edit-product-image"
                  />
                ) : (
                  <div className="edit-no-image">
                    🌾

                    <span>
                      No Product Image
                    </span>
                  </div>
                )}

                {newImagePreview && (
                  <div className="new-image-badge">
                    New Image
                  </div>
                )}
              </div>

              <div className="image-upload-controls">
                <label
                  htmlFor="new-product-image"
                  className="change-image-button"
                >
                  📷 Change Image
                </label>

                <input
                  id="new-product-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleImageChange
                  }
                  disabled={saving}
                  hidden
                />

                {newImage && (
                  <button
                    type="button"
                    className="remove-image-button"
                    onClick={
                      removeNewImage
                    }
                    disabled={saving}
                  >
                    ✕ Remove New Image
                  </button>
                )}
              </div>

              <small>
                JPG, PNG, or WEBP. Maximum
                size: 5MB.
              </small>

              {newImage && (
                <p className="selected-image-name">
                  Selected: {newImage.name}
                </p>
              )}
            </div>

            {/* PRODUCT NAME */}

            <div className="form-group">
              <label htmlFor="name">
                Product Name
              </label>

              <input
                id="name"
                type="text"
                name="name"
                placeholder="e.g. Premium Maize"
                value={product.name}
                onChange={
                  handleChange
                }
                disabled={saving}
              />
            </div>

            {/* CATEGORY */}

            <div className="form-group">
              <label htmlFor="category">
                Category
              </label>

              <select
                id="category"
                name="category"
                value={
                  product.category
                }
                onChange={
                  handleChange
                }
                disabled={saving}
              >
                <option value="">
                  Select category
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

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            {/* PRICE */}

            <div className="form-group">
              <label htmlFor="price">
                Price (UGX)
              </label>

              <input
                id="price"
                type="number"
                name="price"
                min="1"
                placeholder="e.g. 20000"
                value={product.price}
                onChange={
                  handleChange
                }
                disabled={saving}
              />
            </div>

            {/* QUANTITY / STOCK */}

            <div className="form-group">
              <label htmlFor="quantity">
                Quantity / Stock
              </label>

              <input
                id="quantity"
                type="number"
                name="quantity"
                min="0"
                step="any"
                placeholder="e.g. 50"
                value={
                  product.quantity
                }
                onChange={
                  handleQuantityChange
                }
                disabled={saving}
              />

              <div
                className={`edit-stock-status ${stockClass}`}
              >
                {stockLabel}:{" "}
                {currentQuantity}
              </div>

              {currentQuantity === 0 && (
                <small>
                  Add stock to make this
                  product available to
                  buyers.
                </small>
              )}

              {currentQuantity > 0 &&
                currentQuantity <= 5 && (
                  <small>
                    Your stock is running
                    low. Consider restocking
                    soon.
                  </small>
                )}
            </div>

            {/* LOCATION */}

            <div className="form-group">
              <label htmlFor="location">
                Location
              </label>

              <input
                id="location"
                type="text"
                name="location"
                placeholder="e.g. Kampala"
                value={
                  product.location
                }
                onChange={
                  handleChange
                }
                disabled={saving}
              />
            </div>

            {/* WHATSAPP */}

            <div className="form-group">
              <label htmlFor="whatsapp">
                WhatsApp Number
              </label>

              <input
                id="whatsapp"
                type="tel"
                name="whatsapp"
                placeholder="e.g. 0700123456"
                value={
                  product.whatsapp
                }
                onChange={
                  handleChange
                }
                disabled={saving}
              />

              <small>
                Buyers use this number
                to contact you.
              </small>
            </div>

            {/* STATUS */}

            <div className="form-group">
              <label htmlFor="status">
                Product Status
              </label>

              <select
                id="status"
                name="status"
                value={
                  currentQuantity === 0
                    ? "Inactive"
                    : product.status
                }
                onChange={
                  handleStatusChange
                }
                disabled={
                  saving ||
                  currentQuantity === 0
                }
              >
                <option value="Active">
                  🟢 Active
                </option>

                <option value="Inactive">
                  ⏸️ Inactive
                </option>
              </select>

              {currentQuantity === 0 && (
                <small>
                  Product status is
                  automatically set to
                  Inactive while stock is
                  zero.
                </small>
              )}
            </div>

            {/* DESCRIPTION */}

            <div className="form-group">
              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows="6"
                placeholder="Describe your product..."
                value={
                  product.description
                }
                onChange={
                  handleChange
                }
                disabled={saving}
              />
            </div>

            {/* ACTIONS */}

            <div className="edit-product-actions">
              <button
                type="button"
                className="cancel-edit-button"
                onClick={() =>
                  navigate(
                    "/my-products"
                  )
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-product-button"
                disabled={saving}
              >
                {saving
                  ? newImage
                    ? "⏳ Uploading & Saving..."
                    : "⏳ Saving Changes..."
                  : "💾 Save Changes"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default EditProduct;

