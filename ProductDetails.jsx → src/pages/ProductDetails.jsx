
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "./ProductDetails.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [product, setProduct] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);

  const affiliateCode = searchParams.get("affiliate") || "";

  // --------------------------------------------------
  // LOAD PRODUCT + SELLER
  // --------------------------------------------------
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");

        if (!id) {
          setError("Product ID is missing.");
          return;
        }

        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          setError("Product not found.");
          return;
        }

        const productData = {
          id: productSnap.id,
          ...productSnap.data(),
        };

        setProduct(productData);

        if (productData.sellerId) {
          const sellerRef = doc(
            db,
            "users",
            productData.sellerId
          );

          const sellerSnap = await getDoc(sellerRef);

          if (sellerSnap.exists()) {
            setSellerProfile(sellerSnap.data());
          }
        }
      } catch (err) {
        console.error("Error loading product:", err);

        setError(
          err.message || "Failed to load product."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // --------------------------------------------------
  // QUANTITY
  // --------------------------------------------------
  const increaseQuantity = () => {
    const available = Number(product?.quantity || 0);

    if (orderQuantity < available) {
      setOrderQuantity((prev) => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (orderQuantity > 1) {
      setOrderQuantity((prev) => prev - 1);
    }
  };

  // --------------------------------------------------
  // WHATSAPP ORDER
  // --------------------------------------------------
  const handleWhatsAppOrder = async () => {
    try {
      setError("");

      const user = auth.currentUser;

      if (!user) {
        alert("Please login before placing an order.");
        navigate("/login");
        return;
      }

      if (!product) {
        setError("Product information is unavailable.");
        return;
      }

      if (!product.sellerId) {
        setError("This product does not have a seller.");
        return;
      }

      const sellerWhatsapp =
        sellerProfile?.whatsapp ||
        product.whatsapp ||
        product.sellerWhatsapp ||
        "";

      if (!sellerWhatsapp) {
        setError(
          "The seller has not provided a WhatsApp number."
        );
        return;
      }

      if (orderQuantity < 1) {
        setError("Please select at least one item.");
        return;
      }

      const availableQuantity = Number(
        product.quantity || 0
      );

      if (
        availableQuantity <= 0
      ) {
        setError("This product is currently out of stock.");
        return;
      }

      if (orderQuantity > availableQuantity) {
        setError(
          `Only ${availableQuantity} item(s) are available.`
        );
        return;
      }

      setOrdering(true);

      // --------------------------------------------------
      // AFFILIATE COMMISSION
      // --------------------------------------------------
      const commissionRate = affiliateCode ? 0.09 : 0;

      const totalAmount =
        Number(product.price || 0) * orderQuantity;

      const affiliateCommission = affiliateCode
        ? totalAmount * commissionRate
        : 0;

      // --------------------------------------------------
      // CREATE ORDER
      // --------------------------------------------------
      const orderData = {
        productId: product.id,
        productName: product.name || "",
        price: Number(product.price || 0),
        quantity: orderQuantity,
        totalAmount: totalAmount,

        location: product.location || "",

        buyerId: user.uid,
        buyerEmail: user.email || "",

        sellerId: product.sellerId,
        sellerEmail: product.sellerEmail || "",

        sellerWhatsapp: sellerWhatsapp,

        sellerBusinessName:
          sellerProfile?.businessName ||
          product.seller ||
          product.sellerBusinessName ||
          "AgroBaz Seller",

        // Payment
        paymentMethod: "WhatsApp",
        paymentStatus: "Pending",
        escrowStatus: "Pending",

        // Order status
        status: "Pending",

        // Affiliate information
        affiliateCode: affiliateCode || "",
        commissionRate: commissionRate,
        affiliateCommission: affiliateCommission,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("Creating order:", orderData);

      const orderRef = await addDoc(
        collection(db, "orders"),
        orderData
      );

      console.log(
        "Order created successfully:",
        orderRef.id
      );

      // --------------------------------------------------
      // SELLER NOTIFICATION
      // --------------------------------------------------
      try {
        await addDoc(
          collection(db, "notifications"),
          {
            userId: product.sellerId,

            type: "new_order",

            title: "New order received",

            message: `You have received a new order for ${orderQuantity} × ${product.name}.`,

            orderId: orderRef.id,

            productId: product.id,

            productName: product.name || "",

            read: false,

            createdAt: serverTimestamp(),
          }
        );

        console.log("Seller notification created.");
      } catch (notificationError) {
        // Notification failure should NOT cancel the order.
        console.error(
          "Notification creation failed:",
          notificationError
        );
      }

      // --------------------------------------------------
      // WHATSAPP MESSAGE
      // --------------------------------------------------
      const message = `
Hello AgroBaz Seller,

I would like to order the following product:

Product: ${product.name}
Quantity: ${orderQuantity}
Price per item: UGX ${Number(
        product.price || 0
      ).toLocaleString()}
Total: UGX ${totalAmount.toLocaleString()}

Order ID: ${orderRef.id}

Buyer: ${user.email || "AgroBaz Buyer"}
Location: ${product.location || "Not provided"}

I placed this order through AgroBaz Market.
Please confirm availability and delivery details.

Thank you.
      `.trim();

      // --------------------------------------------------
      // CLEAN WHATSAPP NUMBER
      // --------------------------------------------------
      const cleanWhatsapp = sellerWhatsapp
        .replace(/\s+/g, "")
        .replace(/^\+/, "");

      const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
        message
      )}`;

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
      );

      alert(
        "Order created successfully! WhatsApp will open so you can contact the seller."
      );

      navigate("/orders");
    } catch (err) {
      console.error(
        "WhatsApp order error:",
        err
      );

      setError(
        err.message ||
          "Failed to create your order. Please try again."
      );
    } finally {
      setOrdering(false);
    }
  };

  // --------------------------------------------------
  // SELLER PROFILE
  // --------------------------------------------------
  const handleSellerProfile = () => {
    if (!product?.sellerId) {
      alert("Seller profile is unavailable.");
      return;
    }

    navigate(`/seller/${product.sellerId}`);
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="product-details-page">
        <div className="product-details-loading">
          <div className="loading-spinner"></div>
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR / NOT FOUND
  // --------------------------------------------------
  if (error && !product) {
    return (
      <div className="product-details-page">
        <div className="product-details-error">
          <h2>Product unavailable</h2>

          <p>{error}</p>

          <button
            onClick={() => navigate("/marketplace")}
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-page">
        <div className="product-details-error">
          <h2>Product not found</h2>

          <button
            onClick={() => navigate("/marketplace")}
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const totalAmount =
    Number(product.price || 0) * orderQuantity;

  const availableQuantity = Number(
    product.quantity || 0
  );

  return (
    <div className="product-details-page">

      {/* BACK BUTTON */}
      <div className="product-details-container">
        <button
          className="back-button"
          onClick={() => navigate("/marketplace")}
        >
          ← Back to Marketplace
        </button>
      </div>

      {/* PRODUCT */}
      <main className="product-details-container">

        <div className="product-details-grid">

          {/* IMAGE */}
          <div className="product-image-section">
            <div className="product-image-wrapper">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-main-image"
                />
              ) : (
                <div className="no-product-image">
                  No Image Available
                </div>
              )}
            </div>
          </div>

          {/* INFORMATION */}
          <div className="product-info-section">

            {/* CATEGORY */}
            {product.category && (
              <span className="product-category">
                {product.category}
              </span>
            )}

            {/* NAME */}
            <h1>{product.name}</h1>

            {/* PRICE */}
            <div className="product-price">
              UGX{" "}
              {Number(
                product.price || 0
              ).toLocaleString()}
            </div>

            {/* STOCK */}
            <div className="product-stock">
              {availableQuantity > 0 ? (
                <span className="in-stock">
                  ✓ {availableQuantity} available
                </span>
              ) : (
                <span className="out-of-stock">
                  Out of stock
                </span>
              )}
            </div>

            {/* LOCATION */}
            {product.location && (
              <div className="product-location">
                📍 {product.location}
              </div>
            )}

            {/* DESCRIPTION */}
            {product.description && (
              <div className="product-description">
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>
            )}

            {/* SELLER */}
            <div className="seller-card">

              <div className="seller-info">

                <div className="seller-avatar">
                  {(
                    sellerProfile?.businessName ||
                    product.seller ||
                    "A"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="seller-label">
                    Sold by
                  </p>

                  <h3>
                    {sellerProfile?.businessName ||
                      product.seller ||
                      product.sellerBusinessName ||
                      "AgroBaz Seller"}
                  </h3>

                  {product.verificationStatus ===
                    "Verified" && (
                    <span className="verified-badge">
                      ✓ Verified Seller
                    </span>
                  )}
                </div>

              </div>

              <button
                className="seller-profile-button"
                onClick={handleSellerProfile}
              >
                View Seller Profile
              </button>

            </div>

            {/* QUANTITY */}
            {availableQuantity > 0 && (
              <div className="quantity-section">

                <label>
                  Quantity
                </label>

                <div className="quantity-controls">

                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={
                      orderQuantity <= 1
                    }
                  >
                    −
                  </button>

                  <span>
                    {orderQuantity}
                  </span>

                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={
                      orderQuantity >=
                      availableQuantity
                    }
                  >
                    +
                  </button>

                </div>

              </div>
            )}

            {/* TOTAL */}
            {availableQuantity > 0 && (
              <div className="order-total">

                <span>
                  Total
                </span>

                <strong>
                  UGX{" "}
                  {totalAmount.toLocaleString()}
                </strong>

              </div>
            )}

            {/* ERROR */}
            {error && (
              <div className="product-order-error">
                {error}
              </div>
            )}

            {/* BUY BUTTON */}
            <button
              className="whatsapp-order-button"
              onClick={handleWhatsAppOrder}
              disabled={
                ordering ||
                availableQuantity <= 0
              }
            >
              {ordering ? (
                "Creating Order..."
              ) : (
                <>
                  <span className="whatsapp-icon">
                    💬
                  </span>

                  Buy on WhatsApp
                </>
              )}
            </button>

            {/* INFO */}
            <div className="order-info-box">
              <p>
                🔒 Your order is recorded securely
                on AgroBaz.
              </p>

              <p>
                💬 After placing the order,
                WhatsApp will open so you can
                communicate directly with the seller.
              </p>

              <p>
                📦 Confirm availability and
                delivery details with the seller.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductDetails;

