
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";

import { db, auth } from "../firebase";

import "./AddProduct.css";

function AddProduct() {
  const navigate = useNavigate();

  const [product, setProduct] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    location: "",
    description: "",
    whatsapp: "",
  });

  const [profileLoaded, setProfileLoaded] =
    useState(false);

  const [imageFile, setImageFile] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // ==================================================
  // LOAD SELLER PROFILE
  // ==================================================

  useEffect(() => {
    async function loadSellerProfile() {
      const user = auth.currentUser;

      if (!user) {
        setProfileLoaded(true);
        return;
      }

      try {
        const profileRef = doc(
          db,
          "users",
          user.uid
        );

        const profileSnapshot =
          await getDoc(profileRef);

        if (profileSnapshot.exists()) {
          const profileData =
            profileSnapshot.data();

          setProduct((previous) => ({
            ...previous,

            location:
              profileData.location ||
              previous.location,

            whatsapp:
              profileData.whatsapp ||
              previous.whatsapp,
          }));
        }
      } catch (error) {
        console.error(
          "Unable to load seller profile:",
          error
        );
      } finally {
        setProfileLoaded(true);
      }
    }

    loadSellerProfile();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setProduct((previous) => ({
      ...previous,
      [name]: value,
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

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "Image must be smaller than 5MB."
      );

      e.target.value = "";
      return;
    }

    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  }

  function formatUgandaWhatsAppNumber(number) {
    let cleanNumber =
      String(number || "").replace(
        /\D/g,
        ""
      );

    // 07XXXXXXXX → 2567XXXXXXXX
    if (
      cleanNumber.startsWith("0")
    ) {
      cleanNumber =
        "256" +
        cleanNumber.substring(1);
    }

    // 7XXXXXXXX → 2567XXXXXXXX
    else if (
      cleanNumber.startsWith("7") &&
      cleanNumber.length === 9
    ) {
      cleanNumber =
        "256" + cleanNumber;
    }

    return cleanNumber;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) {
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert(
        "Please login first 🌾"
      );

      navigate("/login");
      return;
    }

    // ==================================================
    // VALIDATE PRODUCT
    // ==================================================

    if (!product.name.trim()) {
      alert(
        "Enter a product name."
      );
      return;
    }

    if (!product.category.trim()) {
      alert(
        "Select a product category."
      );
      return;
    }

    const price =
      Number(product.price);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      alert(
        "Enter a valid product price."
      );
      return;
    }

    const quantity =
      Number(product.quantity);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      alert(
        "Enter a valid quantity."
      );
      return;
    }

    if (!product.location.trim()) {
      alert(
        "Enter the product location."
      );
      return;
    }

    if (!product.whatsapp.trim()) {
      alert(
        "Please add a WhatsApp number in your Seller Profile first."
      );
      return;
    }

    const whatsappNumber =
      formatUgandaWhatsAppNumber(
        product.whatsapp
      );

    if (
      !whatsappNumber.startsWith(
        "2567"
      ) &&
      !whatsappNumber.startsWith(
        "2566"
      )
    ) {
      alert(
        "Please enter a valid Ugandan WhatsApp number, e.g. 0700123456."
      );
      return;
    }

    if (!imageFile) {
      alert(
        "Please choose a product image."
      );
      return;
    }

    try {
      setLoading(true);

      // ==================================================
      // STEP 1: UPLOAD IMAGE
      // ==================================================

      const formData =
        new FormData();

      formData.append(
        "image",
        imageFile
      );

      formData.append(
        "userId",
        user.uid
      );

      const uploadResponse =
        await fetch(
          "http://localhost:5000/upload-product-image",
          {
            method: "POST",
            body: formData,
          }
        );

      const uploadResult =
        await uploadResponse.json();

      if (
        !uploadResponse.ok ||
        !uploadResult.success
      ) {
        throw new Error(
          uploadResult.message ||
            uploadResult.error ||
            "Failed to upload product image."
        );
      }

      console.log(
        "Image uploaded:",
        uploadResult.imageUrl
      );

      // ==================================================
      // STEP 2: GET IMAGE DATA
      // ==================================================

      const imageUrl =
        uploadResult.imageUrl;

      const imagePath =
        uploadResult.imagePath;

      if (!imageUrl) {
        throw new Error(
          "The server did not return an image URL."
        );
      }

      // ==================================================
      // STEP 3: LOAD SELLER PROFILE
      // ==================================================

      const profileRef =
        doc(
          db,
          "users",
          user.uid
        );

      const profileSnapshot =
        await getDoc(profileRef);

      const profileData =
        profileSnapshot.exists()
          ? profileSnapshot.data()
          : {};

      // ==================================================
      // STEP 4: SAVE PRODUCT
      // ==================================================

      const productData = {
        name:
          product.name.trim(),

        category:
          product.category.trim(),

        price,

        quantity,

        location:
          product.location.trim(),

        image:
          imageUrl,

        imagePath:
          imagePath || "",

        description:
          product.description.trim(),

        seller:
          profileData.businessName ||
          user.email ||
          "AgroBaz Seller",

        sellerId:
          user.uid,

        sellerEmail:
          user.email || "",

        sellerBusinessName:
          profileData.businessName ||
          "",

        // Seller WhatsApp
        whatsapp:
          whatsappNumber,

        // Seller verification
        verificationStatus:
          profileData.verificationStatus ||
          "pending",

        status:
          "Active",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      const productRef =
        await addDoc(
          collection(
            db,
            "products"
          ),
          productData
        );

      console.log(
        "Product created:",
        productRef.id
      );

      alert(
        "Product published successfully 🌾"
      );

      navigate(
        "/marketplace"
      );

    } catch (error) {
      console.error(
        "Add product error:",
        error
      );

      alert(
        error.message ||
          "Failed to publish product."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="add-product">

      <div className="add-product-card">

        <h1>
          Add New Product 🌱
        </h1>

        <p>
          List your agricultural
          product on AgroBaz
          Marketplace.
        </p>

        <form
          onSubmit={handleSubmit}
        >

          <label>
            Product Name
          </label>

          <input
            type="text"
            name="name"
            placeholder="e.g. Premium Maize"
            value={product.name}
            onChange={handleChange}
            disabled={loading}
          />

          <label>
            Category
          </label>

          <select
            name="category"
            value={product.category}
            onChange={handleChange}
            disabled={loading}
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

          <label>
            Price (UGX)
          </label>

          <input
            type="number"
            name="price"
            placeholder="e.g. 20000"
            min="1"
            value={product.price}
            onChange={handleChange}
            disabled={loading}
          />

          <label>
            Quantity
          </label>

          <input
            type="number"
            name="quantity"
            placeholder="e.g. 50"
            min="1"
            value={product.quantity}
            onChange={handleChange}
            disabled={loading}
          />

          <label>
            Location
          </label>

          <input
            type="text"
            name="location"
            placeholder="e.g. Kampala"
            value={product.location}
            onChange={handleChange}
            disabled={loading}
          />

          {/* ================================ */}
          {/* WHATSAPP */}
          {/* ================================ */}

          <label>
            WhatsApp Number
          </label>

          <input
            type="tel"
            name="whatsapp"
            placeholder="e.g. 0700123456"
            value={product.whatsapp}
            onChange={handleChange}
            disabled={loading}
          />

          <small>
            This was loaded from your
            Seller Profile. You normally
            only need to enter it once.
          </small>

          {/* ================================ */}
          {/* IMAGE */}
          {/* ================================ */}

          <label>
            Product Image
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            disabled={loading}
          />

          <small>
            JPG, PNG, or WEBP.
            Maximum size: 5MB.
          </small>

          {imagePreview && (
            <div className="image-preview">

              <img
                src={imagePreview}
                alt="Product preview"
              />

            </div>
          )}

          {/* ================================ */}
          {/* DESCRIPTION */}
          {/* ================================ */}

          <label>
            Description
          </label>

          <textarea
            name="description"
            placeholder="Describe your product..."
            rows="5"
            value={product.description}
            onChange={handleChange}
            disabled={loading}
          />

          {/* ================================ */}
          {/* SELLER INFO */}
          {/* ================================ */}

          <div className="seller-info-note">

            <p>
              👨‍🌾 Your seller information
              comes from your AgroBaz
              profile.
            </p>

            <p>
              📱 WhatsApp:
              {" "}
              {product.whatsapp ||
                "Not added yet"}
            </p>

          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !profileLoaded
            }
          >
            {loading
              ? "⏳ Uploading & Publishing..."
              : "🌾 Publish Product"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default AddProduct;

