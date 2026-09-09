import "./AdminSellers.css";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";
import "./AdminSellers.css";

function AdminSellers() {
  const navigate = useNavigate();

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function fetchSellers() {
      try {
        const snapshot = await getDocs(collection(db, "users"));

        if (cancelled) return;

        const sellerUsers = snapshot.docs
          .map((userDoc) => ({
            id: userDoc.id,
            ...userDoc.data(),
          }))
          .filter(
            (user) =>
              user.role === "seller" ||
              user.businessName ||
              user.sellerName
          );

        setSellers(sellerUsers);
      } catch (error) {
        console.error("Error loading sellers:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSellers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function updateVerification(seller, status) {
    try {
      setUpdatingId(seller.id);

      const sellerRef = doc(db, "users", seller.id);

      await updateDoc(sellerRef, {
        verificationStatus: status,
        updatedAt: serverTimestamp(),
      });

      let title = "Seller verification updated";
      let message =
        "Your AgroBaz seller verification status has been updated.";

      if (status === "verified") {
        title = "Seller account verified";
        message =
          "Congratulations! Your AgroBaz seller account has been verified.";
      }

      if (status === "rejected") {
        title = "Seller verification rejected";
        message =
          "Your AgroBaz seller verification was rejected. Please review your seller information.";
      }

      if (status === "pending") {
        title = "Verification pending";
        message =
          "Your AgroBaz seller verification has been placed back into pending status.";
      }

      try {
        await addDoc(collection(db, "notifications"), {
          userId: seller.id,
          type: "seller_verification",
          title,
          message,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (notificationError) {
        console.error(
          "Seller notification failed:",
          notificationError
        );
      }

      setSellers((current) =>
        current.map((item) =>
          item.id === seller.id
            ? {
                ...item,
                verificationStatus: status,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Verification update error:", error);
      alert("Could not update seller verification.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredSellers = sellers.filter((seller) => {
    const status = seller.verificationStatus || "pending";

    if (filter === "all") return true;

    return status === filter;
  });

  const verifiedCount = sellers.filter(
    (seller) => seller.verificationStatus === "verified"
  ).length;

  const pendingCount = sellers.filter(
    (seller) =>
      !seller.verificationStatus ||
      seller.verificationStatus === "pending"
  ).length;

  const rejectedCount = sellers.filter(
    (seller) => seller.verificationStatus === "rejected"
  ).length;

  if (loading) {
    return (
      <div className="admin-sellers-loading">
        <div className="admin-spinner"></div>
        <p>Loading sellers...</p>
      </div>
    );
  }

  return (
    <main className="admin-sellers-page">
      <header className="admin-sellers-header">
        <button
          className="admin-back-button"
          onClick={() => navigate("/admin")}
        >
          ← Back to Admin
        </button>

        <div>
          <span className="admin-eyebrow">
            AGROBAZ ADMINISTRATION
          </span>

          <h1>Seller Management</h1>

          <p>
            Review seller accounts and manage their verification status.
          </p>
        </div>
      </header>

      <section className="seller-summary">
        <div className="seller-summary-card">
          <span>Total Sellers</span>
          <strong>{sellers.length}</strong>
        </div>

        <div className="seller-summary-card verified">
          <span>Verified</span>
          <strong>{verifiedCount}</strong>
        </div>

        <div className="seller-summary-card pending">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="seller-summary-card rejected">
          <span>Rejected</span>
          <strong>{rejectedCount}</strong>
        </div>
      </section>

      <section className="seller-management">
        <div className="seller-toolbar">
          <div>
            <h2>Sellers</h2>
            <p>
              {filteredSellers.length} seller accounts shown
            </p>
          </div>

          <div className="seller-filters">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              All
            </button>

            <button
              className={filter === "pending" ? "active" : ""}
              onClick={() => setFilter("pending")}
            >
              Pending
            </button>

            <button
              className={filter === "verified" ? "active" : ""}
              onClick={() => setFilter("verified")}
            >
              Verified
            </button>

            <button
              className={filter === "rejected" ? "active" : ""}
              onClick={() => setFilter("rejected")}
            >
              Rejected
            </button>
          </div>
        </div>

        {filteredSellers.length === 0 ? (
          <div className="empty-sellers">
            <div>👥</div>
            <h3>No sellers found</h3>
            <p>
              There are no seller accounts in this category.
            </p>
          </div>
        ) : (
          <div className="seller-list">
            {filteredSellers.map((seller) => {
              const status =
                seller.verificationStatus || "pending";

              return (
                <article
                  className="seller-card"
                  key={seller.id}
                >
                  <div className="seller-card-main">
                    <div className="seller-avatar">
                      {seller.profilePhoto ? (
                        <img
                          src={seller.profilePhoto}
                          alt={
                            seller.businessName ||
                            seller.sellerName ||
                            "Seller"
                          }
                        />
                      ) : (
                        <span>
                          {(
                            seller.businessName ||
                            seller.sellerName ||
                            "S"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="seller-info">
                      <h3>
                        {seller.businessName ||
                          seller.sellerName ||
                          "Unnamed Seller"}
                      </h3>

                      {seller.businessName &&
                        seller.sellerName && (
                          <p className="seller-owner">
                            Owner: {seller.sellerName}
                          </p>
                        )}

                      <div className="seller-details">
                        {seller.location && (
                          <span>
                            📍 {seller.location}
                          </span>
                        )}

                        {seller.category && (
                          <span>
                            🌱 {seller.category}
                          </span>
                        )}

                        {seller.phone && (
                          <span>
                            📞 {seller.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="seller-card-side">
                    <span
                      className={`verification-badge ${status}`}
                    >
                      {status === "verified" &&
                        "✓ Verified"}

                      {status === "pending" &&
                        "⏳ Pending"}

                      {status === "rejected" &&
                        "✕ Rejected"}
                    </span>

                    <div className="seller-actions">
                      <button
                        className="approve-btn"
                        disabled={
                          updatingId === seller.id ||
                          status === "verified"
                        }
                        onClick={() =>
                          updateVerification(
                            seller,
                            "verified"
                          )
                        }
                      >
                        {updatingId === seller.id
                          ? "Updating..."
                          : "Approve"}
                      </button>

                      <button
                        className="reject-btn"
                        disabled={
                          updatingId === seller.id ||
                          status === "rejected"
                        }
                        onClick={() =>
                          updateVerification(
                            seller,
                            "rejected"
                          )
                        }
                      >
                        Reject
                      </button>

                      {status !== "pending" && (
                        <button
                          className="pending-btn"
                          disabled={
                            updatingId === seller.id
                          }
                          onClick={() =>
                            updateVerification(
                              seller,
                              "pending"
                            )
                          }
                        >
                          Pending
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminSellers;

