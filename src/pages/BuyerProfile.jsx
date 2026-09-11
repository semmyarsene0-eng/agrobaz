import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";

import { db } from "../firebase";
import "./BuyerProfile.css";

function BuyerProfile() {
  const { buyerId } = useParams();
  const navigate = useNavigate();

  const [buyer, setBuyer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBuyerProfile = async () => {
      if (!buyerId) {
        setError("Buyer profile not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // ==============================
        // LOAD BUYER PROFILE
        // ==============================
        const buyerRef = doc(db, "users", buyerId);
        const buyerSnap = await getDoc(buyerRef);

        if (buyerSnap.exists()) {
          setBuyer({
            id: buyerSnap.id,
            ...buyerSnap.data(),
          });
        } else {
          setBuyer({
            id: buyerId,
            name: "AgroBaz Buyer",
          });
        }

        // ==============================
        // LOAD BUYER REVIEWS
        // ==============================
        const reviewsRef = collection(db, "reviews");

        const reviewsQuery = query(
          reviewsRef,
          where("reviewedUserId", "==", buyerId)
        );

        const reviewsSnap = await getDocs(reviewsQuery);

        const buyerReviews = reviewsSnap.docs
          .map((reviewDoc) => ({
            id: reviewDoc.id,
            ...reviewDoc.data(),
          }))
          .filter(
            (review) =>
              review.reviewedRole === "buyer" ||
              review.reviewerRole === "seller"
          );

        buyerReviews.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;

          return bTime - aTime;
        });

        setReviews(buyerReviews);

        // ==============================
        // LOAD BUYER ORDERS
        // ==============================
        const ordersRef = collection(db, "orders");

        const ordersQuery = query(
          ordersRef,
          where("buyerId", "==", buyerId)
        );

        const ordersSnap = await getDocs(ordersQuery);

        const buyerOrders = ordersSnap.docs.map((orderDoc) => ({
          id: orderDoc.id,
          ...orderDoc.data(),
        }));

        buyerOrders.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;

          return bTime - aTime;
        });

        setOrders(buyerOrders);
      } catch (err) {
        console.error("Buyer profile loading error:", err);
        setError("Unable to load this buyer profile.");
      } finally {
        setLoading(false);
      }
    };

    loadBuyerProfile();
  }, [buyerId]);

  // ==============================
  // CALCULATE RATING
  // ==============================
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (total, review) => total + Number(review.rating || 0),
            0
          ) / reviews.length
        ).toFixed(1)
      : "New";

  // ==============================
  // BUYER NAME
  // ==============================
  const buyerName =
    buyer?.businessName ||
    buyer?.name ||
    buyer?.displayName ||
    buyer?.fullName ||
    buyer?.email?.split("@")[0] ||
    "AgroBaz Buyer";

  // ==============================
  // LOCATION
  // ==============================
  const location =
    buyer?.location ||
    buyer?.city ||
    buyer?.district ||
    "Location not provided";

  // ==============================
  // INITIAL
  // ==============================
  const initial = buyerName.charAt(0).toUpperCase();

  // ==============================
  // LOADING
  // ==============================
  if (loading) {
    return (
      <div className="buyer-profile-page">
        <div className="buyer-profile-loading">
          <div className="buyer-profile-spinner"></div>
          <p>Loading buyer profile...</p>
        </div>
      </div>
    );
  }

  // ==============================
  // ERROR
  // ==============================
  if (error) {
    return (
      <div className="buyer-profile-page">
        <div className="buyer-profile-error">
          <h2>Buyer Profile</h2>
          <p>{error}</p>

          <button onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-profile-page">
      <div className="buyer-profile-container">

        {/* BACK BUTTON */}
        <button
          className="buyer-back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        {/* ==============================
            PROFILE HEADER
        ============================== */}
        <section className="buyer-profile-header">

          <div className="buyer-avatar">
            {initial}
          </div>

          <div className="buyer-profile-main">

            <div className="buyer-name-row">
              <h1>{buyerName}</h1>

              <span className="buyer-badge">
                Buyer
              </span>
            </div>

            <p className="buyer-location">
              📍 {location}
            </p>

            {buyer?.bio && (
              <p className="buyer-bio">
                {buyer.bio}
              </p>
            )}
          </div>

        </section>

        {/* ==============================
            STATISTICS
        ============================== */}
        <section className="buyer-stats">

          <div className="buyer-stat-card">
            <span className="buyer-stat-icon">⭐</span>

            <div>
              <strong>{averageRating}</strong>
              <p>Buyer Rating</p>
            </div>
          </div>

          <div className="buyer-stat-card">
            <span className="buyer-stat-icon">💬</span>

            <div>
              <strong>{reviews.length}</strong>
              <p>Reviews</p>
            </div>
          </div>

          <div className="buyer-stat-card">
            <span className="buyer-stat-icon">🛒</span>

            <div>
              <strong>{orders.length}</strong>
              <p>Orders</p>
            </div>
          </div>

        </section>

        {/* ==============================
            REVIEWS
        ============================== */}
        <section className="buyer-reviews-section">

          <div className="buyer-section-heading">
            <div>
              <span className="buyer-eyebrow">
                Reputation
              </span>

              <h2>Reviews from Sellers</h2>
            </div>

            <span className="buyer-review-count">
              {reviews.length} review
              {reviews.length !== 1 ? "s" : ""}
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="buyer-empty-state">
              <div className="buyer-empty-icon">
                ⭐
              </div>

              <h3>No reviews yet</h3>

              <p>
                This buyer hasn't received any seller reviews yet.
              </p>
            </div>
          ) : (
            <div className="buyer-review-list">

              {reviews.map((review) => (
                <article
                  className="buyer-review-card"
                  key={review.id}
                >
                  <div className="buyer-review-top">

                    <div>
                      <strong>
                        {review.reviewerName ||
                          "AgroBaz Seller"}
                      </strong>

                      <p>
                        Seller review
                      </p>
                    </div>

                    <div className="buyer-review-stars">
                      {"★".repeat(
                        Math.max(
                          0,
                          Math.min(5, Number(review.rating) || 0)
                        )
                      )}
                      <span>
                        {Number(review.rating) || 0}/5
                      </span>
                    </div>

                  </div>

                  {review.comment && (
                    <p className="buyer-review-comment">
                      "{review.comment}"
                    </p>
                  )}

                  <div className="buyer-review-meta">
                    {review.createdAt?.toDate
                      ? review.createdAt
                          .toDate()
                          .toLocaleDateString()
                      : "Recently"}
                  </div>
                </article>
              ))}

            </div>
          )}
        </section>

        {/* ==============================
            ORDER HISTORY
        ============================== */}
        <section className="buyer-orders-section">

          <div className="buyer-section-heading">
            <div>
              <span className="buyer-eyebrow">
                Activity
              </span>

              <h2>Order History</h2>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="buyer-empty-state">

              <div className="buyer-empty-icon">
                🛒
              </div>

              <h3>No orders yet</h3>

              <p>
                This buyer hasn't placed any orders yet.
              </p>

            </div>
          ) : (
            <div className="buyer-orders-list">

              {orders.slice(0, 10).map((order) => (
                <article
                  className="buyer-order-card"
                  key={order.id}
                >
                  <div className="buyer-order-info">

                    <h3>
                      {order.productName || "Product"}
                    </h3>

                    <p>
                      Quantity:{" "}
                      {order.quantity || 1}
                    </p>

                    <small>
                      {order.createdAt?.toDate
                        ? order.createdAt
                            .toDate()
                            .toLocaleDateString()
                        : "Recently"}
                    </small>

                  </div>

                  <div className="buyer-order-right">

                    <strong>
                      UGX{" "}
                      {Number(
                        order.totalAmount || 0
                      ).toLocaleString()}
                    </strong>

                    <span
                      className={`buyer-order-status buyer-status-${String(
                        order.status || "Pending"
                      ).toLowerCase()}`}
                    >
                      {order.status || "Pending"}
                    </span>

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

export default BuyerProfile;
