
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";
import { useNavigate, useParams } from "react-router-dom";

import "./SellerProfile.css";

function SellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSeller() {
      if (!sellerId) {
        setError("Seller ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        let sellerData = null;
        let actualSellerId = sellerId;

        // ==========================================
        // 1. FIRST: LOOK FOR users/{sellerId}
        // ==========================================

        const sellerRef = doc(db, "users", sellerId);
        const sellerSnapshot = await getDoc(sellerRef);

        if (sellerSnapshot.exists()) {
          sellerData = sellerSnapshot.data();
          actualSellerId = sellerSnapshot.id;
        }

        // ==========================================
        // 2. FALLBACK: SEARCH BY uid
        // ==========================================

        if (!sellerData) {
          const sellerQuery = query(
            collection(db, "users"),
            where("uid", "==", sellerId)
          );

          const sellerQuerySnapshot =
            await getDocs(sellerQuery);

          if (!sellerQuerySnapshot.empty) {
            const sellerDoc = sellerQuerySnapshot.docs[0];

            sellerData = sellerDoc.data();
            actualSellerId = sellerDoc.id;
          }
        }

        // ==========================================
        // 3. SELLER NOT FOUND
        // ==========================================

        if (!sellerData) {
          if (!cancelled) {
            setError(
              "Seller profile not found. The seller account may not have completed their profile."
            );
            setLoading(false);
          }

          return;
        }

        // ==========================================
        // 4. BUILD SELLER PROFILE
        // ==========================================

        const sellerProfile = {
          id: actualSellerId,

          businessName:
            sellerData.businessName ||
            sellerData.sellerBusinessName ||
            sellerData.name ||
            sellerData.displayName ||
            sellerData.email?.split("@")[0] ||
            "AgroBaz Seller",

          sellerName:
            sellerData.sellerName ||
            sellerData.name ||
            sellerData.displayName ||
            "",

          location:
            sellerData.location ||
            "Uganda",

          category:
            sellerData.category ||
            "Agricultural Seller",

          phone:
            sellerData.phone ||
            sellerData.phoneNumber ||
            "",

          whatsapp:
            sellerData.whatsapp ||
            sellerData.whatsappNumber ||
            "",

          bio:
            sellerData.bio ||
            sellerData.description ||
            "This seller has not added a description yet.",

          address:
            sellerData.address ||
            "",

          email:
            sellerData.email ||
            "",

          profilePhoto:
            sellerData.profilePhoto ||
            sellerData.photoURL ||
            sellerData.photo ||
            "",

          verificationStatus:
            sellerData.verificationStatus ||
            "pending",
        };

        if (!cancelled) {
          setSeller(sellerProfile);
        }

        // ==========================================
        // 5. LOAD SELLER PRODUCTS
        // ==========================================

        const productsQuery = query(
          collection(db, "products"),
          where("sellerId", "==", sellerId)
        );

        let productsSnapshot =
          await getDocs(productsQuery);

        // ==========================================
        // 6. FALLBACK FOR PRODUCTS
        // If old products use the actual user document ID
        // ==========================================

        if (
          productsSnapshot.empty &&
          actualSellerId !== sellerId
        ) {
          const fallbackProductsQuery = query(
            collection(db, "products"),
            where("sellerId", "==", actualSellerId)
          );

          productsSnapshot =
            await getDocs(fallbackProductsQuery);
        }

        const sellerProducts = productsSnapshot.docs
          .map((productDoc) => {
            const data = productDoc.data();

            return {
              id: productDoc.id,

              name:
                data.name ||
                "Unnamed Product",

              price:
                Number(data.price) || 0,

              image:
                data.image || "",

              location:
                data.location ||
                sellerData.location ||
                "Uganda",

              category:
                data.category ||
                "Agricultural Product",

              quantity:
                data.quantity !== undefined
                  ? Number(data.quantity)
                  : null,

              status:
                data.status ||
                "active",
            };
          })
          .filter(
            (product) =>
              product.status !== "inactive"
          );

        if (!cancelled) {
          setProducts(sellerProducts);
        }

      } catch (err) {
        console.error(
          "Seller profile error:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load seller profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSeller();

    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  // ==========================================
  // OPEN PRODUCT
  // ==========================================

  function openProduct(productId) {
    navigate(`/product/${productId}`);
  }

  // ==========================================
  // WHATSAPP
  // ==========================================

  function contactSeller() {
    if (!seller?.whatsapp) {
      alert(
        "This seller has not added a WhatsApp number yet."
      );
      return;
    }

    const cleanNumber = String(
      seller.whatsapp
    ).replace(/\D/g, "");

    if (!cleanNumber) {
      alert(
        "The seller's WhatsApp number is not valid."
      );
      return;
    }

    const message =
      "Hello! I found your products on AgroBaz and would like to know more.";

    const whatsappUrl =
      `https://wa.me/${cleanNumber}` +
      `?text=${encodeURIComponent(message)}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
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
      <div className="seller-profile-page">
        <div className="seller-profile-container">
          <div className="seller-loading">
            <h2>Loading seller profile...</h2>

            <p>
              Please wait while we load
              the seller information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div className="seller-profile-page">
        <div className="seller-profile-container">
          <div className="seller-error">
            <h2>Unable to load seller</h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={goBack}
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="seller-profile-page">
        <div className="seller-profile-container">
          <h2>Seller not found</h2>

          <button
            type="button"
            onClick={goBack}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const isVerified =
    String(
      seller.verificationStatus || ""
    ).toLowerCase() === "verified";

  return (
    <div className="seller-profile-page">
      <div className="seller-profile-container">

        {/* BACK */}

        <button
          type="button"
          className="seller-back-button"
          onClick={goBack}
        >
          ← Back
        </button>

        {/* SELLER HEADER */}

        <section className="seller-profile-header">

          <div className="seller-avatar">

            {seller.profilePhoto ? (
              <img
                src={seller.profilePhoto}
                alt={`${seller.businessName} profile`}
              />
            ) : (
              <span>👨‍🌾</span>
            )}

          </div>

          <div className="seller-header-info">

            <div className="seller-name-row">

              <h1>
                {seller.businessName}
              </h1>

              {isVerified && (
                <span className="seller-verified-badge">
                  ✓ Verified
                </span>
              )}

            </div>

            {seller.sellerName && (
              <p className="seller-person-name">
                👤 {seller.sellerName}
              </p>
            )}

            <p className="seller-location">
              📍 {seller.location}
            </p>

            <p className="seller-category">
              🌾 {seller.category}
            </p>

          </div>

        </section>

        {/* SELLER INFORMATION */}

        {(seller.address ||
          seller.phone ||
          seller.email) && (

          <section className="seller-details">

            <h2>Seller Information</h2>

            <div className="seller-details-grid">

              {seller.address && (
                <div className="seller-detail-item">

                  <span>🏠</span>

                  <div>
                    <strong>
                      Business Address
                    </strong>

                    <p>
                      {seller.address}
                    </p>
                  </div>

                </div>
              )}

              {seller.phone && (
                <div className="seller-detail-item">

                  <span>📞</span>

                  <div>
                    <strong>Phone</strong>

                    <p>
                      {seller.phone}
                    </p>
                  </div>

                </div>
              )}

              {seller.email && (
                <div className="seller-detail-item">

                  <span>✉️</span>

                  <div>
                    <strong>Email</strong>

                    <p>
                      {seller.email}
                    </p>
                  </div>

                </div>
              )}

            </div>

          </section>
        )}

        {/* VERIFICATION */}

        <section
          className={
            isVerified
              ? "seller-verification verified"
              : "seller-verification"
          }
        >

          {isVerified ? (
            <>
              <strong>
                🛡️ Verified AgroBaz Seller
              </strong>

              <p>
                This seller has been verified
                by AgroBaz.
              </p>
            </>
          ) : (
            <>
              <strong>
                🟡 Verification Pending
              </strong>

              <p>
                This seller has not completed
                AgroBaz verification yet.
              </p>
            </>
          )}

        </section>

        {/* ABOUT */}

        <section className="seller-about">

          <h2>About this seller</h2>

          <p>{seller.bio}</p>

        </section>

        {/* CONTACT */}

        <section className="seller-contact">

          <div>

            <h2>Contact Seller</h2>

            <p>
              {seller.whatsapp
                ? "Available on WhatsApp"
                : "This seller has not added a WhatsApp number yet."}
            </p>

          </div>

          {seller.whatsapp && (
            <button
              type="button"
              className="seller-whatsapp-button"
              onClick={contactSeller}
            >
              🟢 Contact on WhatsApp
            </button>
          )}

        </section>

        {/* PRODUCTS */}

        <section className="seller-products">

          <div className="seller-products-heading">

            <div>

              <h2>
                Products from{" "}
                {seller.businessName}
              </h2>

              <p>
                {products.length} product
                {products.length !== 1
                  ? "s"
                  : ""}{" "}
                listed
              </p>

            </div>

          </div>

          {products.length === 0 ? (

            <div className="no-seller-products">

              <h3>No products yet</h3>

              <p>
                This seller has not listed
                any active products yet.
              </p>

            </div>

          ) : (

            <div className="seller-products-grid">

              {products.map((product) => (

                <article
                  key={product.id}
                  className="seller-product-card"
                >

                  <div
                    className="seller-product-image"
                    onClick={() =>
                      openProduct(product.id)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" ||
                        e.key === " "
                      ) {
                        e.preventDefault();
                        openProduct(product.id);
                      }
                    }}
                  >

                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                      />
                    ) : (
                      <div className="no-product-image">
                        🌾
                        <span>No Image</span>
                      </div>
                    )}

                  </div>

                  <div className="seller-product-info">

                    <span className="seller-product-category">
                      {product.category}
                    </span>

                    <h3>{product.name}</h3>

                    <h4>
                      UGX{" "}
                      {product.price.toLocaleString()}
                    </h4>

                    {product.quantity !== null && (
                      <p>
                        Available:{" "}
                        {product.quantity}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openProduct(product.id)
                      }
                    >
                      View Product →
                    </button>

                  </div>

                </article>

              ))}

            </div>
          )}

        </section>

      </div>
    </div>
  );
}

export default SellerProfile;

