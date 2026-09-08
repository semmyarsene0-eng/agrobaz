import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "../firebase";
import "./SellerDashboard.css";

function SellerDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    pendingOrders: 0,
    completedOrders: 0,
    revenue: 0,
    averageRating: 0,
    reviews: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe;

    unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        setError("Please log in to view your seller dashboard.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        // -----------------------------
        // LOAD PRODUCTS
        // -----------------------------

        const productsQuery = query(
          collection(db, "products"),
          where("sellerId", "==", user.uid)
        );

        const productsSnapshot = await getDocs(productsQuery);

        // -----------------------------
        // LOAD ORDERS
        // -----------------------------

        const ordersQuery = query(
          collection(db, "orders"),
          where("sellerId", "==", user.uid)
        );

        const ordersSnapshot = await getDocs(ordersQuery);

        const sellerOrders = ordersSnapshot.docs.map((orderDoc) => ({
          id: orderDoc.id,
          ...orderDoc.data(),
        }));

        const pendingOrders = sellerOrders.filter(
          (order) =>
            order.status === "Pending" ||
            order.status === "Accepted" ||
            order.status === "Ready"
        );

        const completedOrders = sellerOrders.filter(
          (order) => order.status === "Completed"
        );

        // -----------------------------
        // CALCULATE REVENUE
        // -----------------------------

        const totalRevenue = completedOrders.reduce(
          (total, order) => {
            const amount = Number(
              order.totalAmount || order.price || 0
            );

            return total + amount;
          },
          0
        );

        // -----------------------------
        // LOAD REVIEWS
        // -----------------------------

        const reviewsQuery = query(
          collection(db, "reviews"),
          where("sellerId", "==", user.uid)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);

        const sellerReviews = reviewsSnapshot.docs.map(
          (reviewDoc) => reviewDoc.data()
        );

        let averageRating = 0;

        if (sellerReviews.length > 0) {
          const totalRating = sellerReviews.reduce(
            (total, review) =>
              total + Number(review.rating || 0),
            0
          );

          averageRating = Number(
            (totalRating / sellerReviews.length).toFixed(1)
          );
        }

        // -----------------------------
        // SORT RECENT ORDERS
        // -----------------------------

        const sortedOrders = [...sellerOrders]
          .sort((a, b) => {
            const dateA =
              a.createdAt?.seconds || 0;

            const dateB =
              b.createdAt?.seconds || 0;

            return dateB - dateA;
          })
          .slice(0, 5);

        setRecentOrders(sortedOrders);

        setStats({
          products: productsSnapshot.size,
          pendingOrders: pendingOrders.length,
          completedOrders: completedOrders.length,
          revenue: totalRevenue,
          averageRating,
          reviews: sellerReviews.length,
        });
      } catch (err) {
        console.error(
          "Seller dashboard error:",
          err
        );

        setError(
          err.message ||
            "Unable to load seller dashboard."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  function formatCurrency(amount) {
    return `UGX ${Number(amount || 0).toLocaleString()}`;
  }

  function formatDate(timestamp) {
    if (!timestamp) {
      return "Recently";
    }

    try {
      if (timestamp.seconds) {
        return new Date(
          timestamp.seconds * 1000
        ).toLocaleDateString();
      }

      return new Date(timestamp).toLocaleDateString();
    } catch {
      return "Recently";
    }
  }

  function getStatusClass(status) {
    switch (status) {
      case "Completed":
        return "status-completed";

      case "Pending":
        return "status-pending";

      case "Accepted":
        return "status-accepted";

      case "Ready":
        return "status-ready";

      default:
        return "status-default";
    }
  }

  if (loading) {
    return (
      <div className="seller-dashboard">
        <div className="dashboard-loading">
          <div className="loading-icon">🌾</div>
          <h2>Loading Seller Dashboard...</h2>
          <p>
            Preparing your AgroBaz business overview.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seller-dashboard">
        <div className="dashboard-error">
          <div>⚠️</div>

          <h2>Dashboard unavailable</h2>

          <p>{error}</p>

          <Link to="/login">
            <button>Login</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <div className="seller-dashboard-container">

        {/* HEADER */}

        <div className="dashboard-header">
          <div>
            <span className="dashboard-label">
              AGROBAZ SELLER CENTER
            </span>

            <h1>
              Seller Dashboard 🌾
            </h1>

            <p>
              Manage your agricultural business,
              products, orders and earnings.
            </p>
          </div>

          <Link to="/add-product">
            <button className="header-add-button">
              + Add Product
            </button>
          </Link>
        </div>

        {/* STATS */}

        <section className="dashboard-stats">

          <div className="stat-card">
            <div className="stat-icon">
              📦
            </div>

            <div>
              <span>Total Products</span>
              <strong>{stats.products}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🚜
            </div>

            <div>
              <span>Pending Orders</span>
              <strong>{stats.pendingOrders}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              💰
            </div>

            <div>
              <span>Completed Sales</span>
              <strong>{stats.completedOrders}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ⭐
            </div>

            <div>
              <span>Average Rating</span>
              <strong>
                {stats.averageRating > 0
                  ? stats.averageRating
                  : "—"}
              </strong>
            </div>
          </div>

        </section>

        {/* REVENUE BANNER */}

        <section className="revenue-banner">

          <div className="revenue-banner-icon">
            💰
          </div>

          <div>
            <span>Total Completed Sales</span>

            <h2>
              {formatCurrency(stats.revenue)}
            </h2>

            <p>
              Revenue from completed orders
            </p>
          </div>

          <Link to="/revenue">
            <button>
              View Revenue →
            </button>
          </Link>

        </section>

        {/* QUICK ACTIONS */}

        <section className="dashboard-section">

          <div className="section-heading">
            <div>
              <h2>Quick Actions</h2>

              <p>
                Manage your AgroBaz business
              </p>
            </div>
          </div>

          <div className="seller-grid">

            <div className="seller-card">

              <div className="card-icon">
                📦
              </div>

              <h2>Products</h2>

              <p>
                Manage your crop and farm
                listings.
              </p>

              <Link to="/add-product">
                <button>
                  Add Product
                </button>
              </Link>

            </div>

            <div className="seller-card">

              <div className="card-icon">
                💬
              </div>

              <h2>Messages</h2>

              <p>
                Chat with buyers interested
                in your products.
              </p>

              <Link to="/seller-messages">
                <button>
                  Open Messages
                </button>
              </Link>

            </div>

            <div className="seller-card">

              <div className="card-icon">
                🚜
              </div>

              <h2>Orders</h2>

              <p>
                View and manage customer
                orders.
              </p>

              <Link to="/orders">
                <button>
                  View Orders
                </button>
              </Link>

            </div>

            <div className="seller-card">

              <div className="card-icon">
                💰
              </div>

              <h2>Earnings</h2>

              <p>
                Track your AgroBaz sales
                and earnings.
              </p>

              <Link to="/revenue">
                <button>
                  View Revenue
                </button>
              </Link>

            </div>

            <div className="seller-card">

              <div className="card-icon">
                👨‍🌾
              </div>

              <h2>Seller Profile</h2>

              <p>
                Manage your farm or business
                information.
              </p>

              <Link to="/profile">
                <button>
                  Edit Profile
                </button>
              </Link>

            </div>

            <div className="seller-card">

              <div className="card-icon">
                ⭐
              </div>

              <h2>Reviews</h2>

              <p>
                See what buyers think about
                your business.
              </p>

              <div className="review-card-rating">
                <strong>
                  {stats.averageRating > 0
                    ? stats.averageRating
                    : "No rating"}
                </strong>

                <span>
                  {stats.reviews} review
                  {stats.reviews !== 1
                    ? "s"
                    : ""}
                </span>
              </div>

            </div>

          </div>

        </section>

        {/* RECENT ORDERS */}

        <section className="recent-orders-section">

          <div className="section-heading">

            <div>
              <h2>Recent Orders 🚜</h2>

              <p>
                Your latest customer orders
              </p>
            </div>

            <Link to="/orders">
              View All →
            </Link>

          </div>

          {recentOrders.length === 0 ? (
            <div className="empty-orders">

              <div>
                📦
              </div>

              <h3>
                No orders yet
              </h3>

              <p>
                Customer orders will appear here
                when buyers purchase your products.
              </p>

            </div>
          ) : (
            <div className="orders-table-wrapper">

              <table className="orders-table">

                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Buyer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>

                  {recentOrders.map((order) => (
                    <tr key={order.id}>

                      <td>
                        <strong>
                          {order.productName ||
                            "Product"}
                        </strong>
                      </td>

                      <td>
                        {order.buyerName ||
                          "AgroBaz Buyer"}
                      </td>

                      <td>
                        {formatCurrency(
                          order.totalAmount ||
                            order.price ||
                            0
                        )}
                      </td>

                      <td>
                        <span
                          className={`order-status ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {order.status ||
                            "Pending"}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          order.createdAt
                        )}
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </div>
  );
}

export default SellerDashboard;