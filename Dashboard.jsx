import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(true);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const navigate = useNavigate();

  /* =========================
     LOAD USER + DASHBOARD
  ========================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          navigate("/login");
          return;
        }

        setUser(currentUser);

        /* =========================
           LOAD AFFILIATE
        ========================= */

        try {
          const affiliateQuery = query(
            collection(db, "affiliates"),
            where("userId", "==", currentUser.uid)
          );

          const snapshot = await getDocs(affiliateQuery);

          if (!snapshot.empty) {
            setAffiliate({
              id: snapshot.docs[0].id,
              ...snapshot.docs[0].data(),
            });
          } else {
            setAffiliate(null);
          }
        } catch (error) {
          console.error(
            "Error checking affiliate account:",
            error
          );
        } finally {
          setLoadingAffiliate(false);
        }

        /* =========================
           LOAD BUYER ORDERS
        ========================= */

        try {
          const ordersQuery = query(
            collection(db, "orders"),
            where("buyerId", "==", currentUser.uid)
          );

          const ordersSnapshot = await getDocs(ordersQuery);

          const loadedOrders = ordersSnapshot.docs.map(
            (doc) => ({
              id: doc.id,
              ...doc.data(),
            })
          );

          loadedOrders.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;

            return bTime - aTime;
          });

          setOrders(loadedOrders);
        } catch (error) {
          console.error(
            "Error loading buyer orders:",
            error
          );

          setOrders([]);
        } finally {
          setLoadingOrders(false);
        }
      }
    );

    return unsubscribe;
  }, [navigate]);

  /* =========================
     APPLY AS AFFILIATE
  ========================= */

  const applyAsAffiliate = async () => {
    if (!user) return;

    try {
      setLoadingAffiliate(true);

      const affiliateQuery = query(
        collection(db, "affiliates"),
        where("userId", "==", user.uid)
      );

      const existing = await getDocs(affiliateQuery);

      if (!existing.empty) {
        setAffiliate({
          id: existing.docs[0].id,
          ...existing.docs[0].data(),
        });

        alert(
          "You already have an affiliate application."
        );

        return;
      }

      const affiliateCode =
        "AGB-" +
        user.uid.substring(0, 8).toUpperCase();

      const affiliateRef = await addDoc(
        collection(db, "affiliates"),
        {
          userId: user.uid,
          email: user.email,

          affiliateCode,

          status: "pending",

          commissionRate: 9,

          totalClicks: 0,
          totalSales: 0,
          totalEarned: 0,
          pendingCommission: 0,
          availableBalance: 0,

          createdAt: serverTimestamp(),
        }
      );

      setAffiliate({
        id: affiliateRef.id,
        userId: user.uid,
        email: user.email,
        affiliateCode,
        status: "pending",
        commissionRate: 9,
        totalClicks: 0,
        totalSales: 0,
        totalEarned: 0,
        pendingCommission: 0,
        availableBalance: 0,
      });

      alert(
        "Affiliate application submitted successfully 🔗"
      );
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoadingAffiliate(false);
    }
  };

  /* =========================
     BUYER STATISTICS
  ========================= */

  const totalOrders = orders.length;

  const pendingOrders = orders.filter((order) => {
    const status = String(order.status || "").toLowerCase();

    return (
      status === "pending" ||
      status === "processing" ||
      status === "confirmed"
    );
  }).length;

  const completedOrders = orders.filter((order) => {
    const status = String(order.status || "").toLowerCase();

    return (
      status === "completed" ||
      status === "delivered"
    );
  }).length;

  const totalSpending = orders.reduce((total, order) => {
    const amount =
      Number(order.totalPrice) ||
      Number(order.total) ||
      Number(order.amount) ||
      0;

    return total + amount;
  }, 0);

  const recentOrders = orders.slice(0, 5);

  /* =========================
     FORMAT MONEY
  ========================= */

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  /* =========================
     FORMAT DATE
  ========================= */

  const formatDate = (timestamp) => {
    if (!timestamp) return "Recently";

    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      return date.toLocaleDateString("en-UG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  /* =========================
     STATUS CLASS
  ========================= */

  const getStatusClass = (status) => {
    const value = String(status || "")
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (
      value === "completed" ||
      value === "delivered"
    ) {
      return "status-completed";
    }

    if (
      value === "cancelled" ||
      value === "rejected"
    ) {
      return "status-cancelled";
    }

    if (
      value === "processing" ||
      value === "confirmed"
    ) {
      return "status-processing";
    }

    return "status-pending";
  };

  /* =========================
     LOADING
  ========================= */

  if (!user) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loader"></div>
        <p>Loading your AgroBaz dashboard...</p>
      </div>
    );
  }

  /* =========================
     DASHBOARD
  ========================= */

  return (
    <div className="dashboard-page">

      {/* =========================
          HERO
      ========================= */}

      <section className="dashboard-hero">

        <div className="dashboard-hero-content">

          <span className="dashboard-eyebrow">
            AGROBAZ MARKET
          </span>

          <h1>
            Welcome back 👋
          </h1>

          <p>
            Manage your purchases, track orders,
            discover agricultural products and
            grow with AgroBaz.
          </p>

          <div className="dashboard-hero-actions">

            <Link
              to="/marketplace"
              className="dashboard-primary-btn"
            >
              🛒 Shop Marketplace
            </Link>

            <Link
              to="/orders"
              className="dashboard-secondary-btn"
            >
              📦 My Orders
            </Link>

          </div>

        </div>

        <div className="dashboard-hero-visual">

          <div className="dashboard-orbit orbit-one"></div>
          <div className="dashboard-orbit orbit-two"></div>

          <div className="dashboard-hero-icon">
            🌾
          </div>

        </div>

      </section>


      {/* =========================
          BUYER STATISTICS
      ========================= */}

      <section className="buyer-stats">

        <div className="buyer-stat-card">

          <div className="buyer-stat-icon">
            📦
          </div>

          <div>
            <span>Total Orders</span>
            <strong>
              {loadingOrders ? "..." : totalOrders}
            </strong>
          </div>

        </div>


        <div className="buyer-stat-card">

          <div className="buyer-stat-icon">
            ⏳
          </div>

          <div>
            <span>Active Orders</span>
            <strong>
              {loadingOrders ? "..." : pendingOrders}
            </strong>
          </div>

        </div>


        <div className="buyer-stat-card">

          <div className="buyer-stat-icon">
            ✅
          </div>

          <div>
            <span>Completed</span>
            <strong>
              {loadingOrders ? "..." : completedOrders}
            </strong>
          </div>

        </div>


        <div className="buyer-stat-card">

          <div className="buyer-stat-icon">
            💰
          </div>

          <div>
            <span>Total Spending</span>
            <strong>
              {loadingOrders
                ? "..."
                : formatMoney(totalSpending)}
            </strong>
          </div>

        </div>

      </section>


      {/* =========================
          MAIN DASHBOARD
      ========================= */}

      <div className="dashboard-main-grid">

        {/* =========================
            RECENT ORDERS
        ========================= */}

        <section className="dashboard-section orders-section">

          <div className="dashboard-section-header">

            <div>
              <span className="section-label">
                PURCHASE ACTIVITY
              </span>

              <h2>
                Recent Orders
              </h2>
            </div>

            <Link to="/orders">
              View all →
            </Link>

          </div>


          {loadingOrders ? (

            <div className="orders-loading">
              <div className="dashboard-loader"></div>
              <p>Loading your orders...</p>
            </div>

          ) : recentOrders.length === 0 ? (

            <div className="empty-orders">

              <div className="empty-orders-icon">
                🛒
              </div>

              <h3>
                No orders yet
              </h3>

              <p>
                Your agricultural purchases will
                appear here after you place an order.
              </p>

              <Link
                to="/marketplace"
                className="dashboard-primary-btn"
              >
                Explore Marketplace
              </Link>

            </div>

          ) : (

            <div className="orders-list">

              {recentOrders.map((order) => (

                <div
                  className="buyer-order-card"
                  key={order.id}
                >

                  <div className="buyer-order-image">

                    {order.image ? (
                      <img
                        src={order.image}
                        alt={order.productName || "Product"}
                      />
                    ) : (
                      <span>🌾</span>
                    )}

                  </div>


                  <div className="buyer-order-info">

                    <h3>
                      {order.productName ||
                        order.name ||
                        "Agricultural Product"}
                    </h3>

                    <p>
                      Order #{order.id.slice(0, 8)}
                    </p>

                    <span className="buyer-order-date">
                      {formatDate(order.createdAt)}
                    </span>

                  </div>


                  <div className="buyer-order-meta">

                    <strong>
                      {formatMoney(
                        Number(order.totalPrice) ||
                        Number(order.total) ||
                        Number(order.amount) ||
                        0
                      )}
                    </strong>

                    <span
                      className={`order-status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {order.status || "Pending"}
                    </span>

                  </div>


                  <Link
                    to={`/tracking?orderId=${order.id}`}
                    className="order-view-btn"
                  >
                    Track
                  </Link>

                </div>

              ))}

            </div>

          )}

        </section>


        {/* =========================
            QUICK ACTIONS
        ========================= */}

        <section className="dashboard-section quick-actions-section">

          <div className="dashboard-section-header">

            <div>
              <span className="section-label">
                QUICK ACCESS
              </span>

              <h2>
                What do you want to do?
              </h2>
            </div>

          </div>


          <div className="quick-actions-grid">

            <Link
              to="/marketplace"
              className="quick-action-card"
            >
              <span>🛒</span>
              <strong>Shop Products</strong>
              <small>
                Find crops, seeds and inputs
              </small>
            </Link>


            <Link
              to="/orders"
              className="quick-action-card"
            >
              <span>📦</span>
              <strong>My Orders</strong>
              <small>
                View all your purchases
              </small>
            </Link>


            <Link
              to="/tracking"
              className="quick-action-card"
            >
              <span>🚚</span>
              <strong>Track Orders</strong>
              <small>
                Follow your order progress
              </small>
            </Link>


            <Link
              to="/profile"
              className="quick-action-card"
            >
              <span>👤</span>
              <strong>My Profile</strong>
              <small>
                Manage your account
              </small>
            </Link>

          </div>

        </section>

      </div>


      {/* =========================
          SELLER + PROFILE
      ========================= */}

      <section className="account-tools">

        <div className="dashboard-section">

          <div className="dashboard-section-header">

            <div>
              <span className="section-label">
                AGROBAZ BUSINESS
              </span>

              <h2>
                Sell on AgroBaz
              </h2>
            </div>

          </div>

          <div className="seller-tools-grid">

            <Link
              to="/seller-dashboard"
              className="business-card"
            >
              <span className="business-card-icon">
                👨‍🌾
              </span>

              <div>
                <h3>
                  Seller Dashboard
                </h3>

                <p>
                  Manage products, orders,
                  sales and revenue.
                </p>
              </div>

              <span className="business-arrow">
                →
              </span>

            </Link>


            <Link
              to="/add-product"
              className="business-card"
            >
              <span className="business-card-icon">
                📦
              </span>

              <div>
                <h3>
                  Add Product
                </h3>

                <p>
                  Publish crops and agricultural
                  products.
                </p>
              </div>

              <span className="business-arrow">
                →
              </span>

            </Link>


            <Link
              to="/profile"
              className="business-card"
            >
              <span className="business-card-icon">
                🌱
              </span>

              <div>
                <h3>
                  Business Profile
                </h3>

                <p>
                  Build your seller identity
                  on AgroBaz.
                </p>
              </div>

              <span className="business-arrow">
                →
              </span>

            </Link>

          </div>

        </div>

      </section>


      {/* =========================
          AFFILIATE
      ========================= */}

      <section className="affiliate-dashboard-card">

        <div className="affiliate-content">

          <span className="affiliate-label">
            AGROBAZ AFFILIATE
          </span>

          <h2>
            Earn 9% by sharing AgroBaz
          </h2>

          <p>
            Refer customers to agricultural
            products and earn commission from
            qualifying sales.
          </p>


          {loadingAffiliate ? (

            <p className="affiliate-loading">
              Checking affiliate account...
            </p>

          ) : affiliate ? (

            <div className="affiliate-account">

              <div className="affiliate-detail">

                <span>Status</span>

                <strong>
                  {affiliate.status}
                </strong>

              </div>


              <div className="affiliate-detail">

                <span>Commission</span>

                <strong>
                  {affiliate.commissionRate}%
                </strong>

              </div>


              <div className="affiliate-detail">

                <span>Affiliate ID</span>

                <strong>
                  {affiliate.affiliateCode}
                </strong>

              </div>


              {affiliate.status === "approved" ? (

                <button
                  className="affiliate-button"
                  onClick={() =>
                    navigate(
                      "/affiliate-dashboard"
                    )
                  }
                >
                  🔗 Open Affiliate Dashboard
                </button>

              ) : (

                <div className="affiliate-status-message">
                  Your affiliate application is{" "}
                  <strong>
                    {affiliate.status}
                  </strong>.
                </div>

              )}

            </div>

          ) : (

            <div className="affiliate-apply">

              <p>
                You haven't joined the affiliate
                program yet.
              </p>

              <button
                className="affiliate-button"
                onClick={applyAsAffiliate}
              >
                🔗 Apply as Affiliate
              </button>

            </div>

          )}

        </div>

        <div className="affiliate-visual">
          🔗
        </div>

      </section>


      {/* =========================
          FINAL CTA
      ========================= */}

      <section className="dashboard-bottom-cta">

        <div>

          <span>
            READY TO SHOP?
          </span>

          <h2>
            Discover what Uganda's
            agricultural market has to offer.
          </h2>

        </div>

        <Link
          to="/marketplace"
          className="dashboard-cta-button"
        >
          Explore Marketplace →
        </Link>

      </section>

    </div>
  );
}

export default Dashboard;