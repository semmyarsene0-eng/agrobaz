
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { db, auth } from "../firebase";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    orders: 0,
    sellers: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  // ============================================================
  // LOAD ADMIN STATISTICS
  // ============================================================

  async function loadStatistics() {
    try {
      setLoadingStats(true);

      const [
        usersSnapshot,
        productsSnapshot,
        ordersSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "orders")),
      ]);

      const sellers = usersSnapshot.docs.filter((userDoc) => {
        const data = userDoc.data();

        return (
          data.role === "seller" ||
          data.businessName ||
          data.sellerName
        );
      });

      setStats({
        users: usersSnapshot.size,
        products: productsSnapshot.size,
        orders: ordersSnapshot.size,
        sellers: sellers.length,
      });
    } catch (error) {
      console.error("Admin statistics error:", error);
    } finally {
      setLoadingStats(false);
    }
  }

  // ============================================================
  // CHECK ADMIN ACCESS
  // ============================================================

  useEffect(() => {
    let unsubscribe;

    unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthorized(false);
        setCheckingAccess(false);
        navigate("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          setAuthorized(false);
          setCheckingAccess(false);
          navigate("/dashboard");
          return;
        }

        const userData = userSnapshot.data();

        if (userData.role !== "admin") {
          setAuthorized(false);
          setCheckingAccess(false);
          navigate("/dashboard");
          return;
        }

        // User is an admin
        setAuthorized(true);
        setCheckingAccess(false);

        await loadStatistics();
      } catch (error) {
        console.error("Admin access error:", error);

        setAuthorized(false);
        setCheckingAccess(false);

        navigate("/dashboard");
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigate]);

  // ============================================================
  // LOADING
  // ============================================================

  if (checkingAccess) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>

        <p>Checking admin access...</p>
      </div>
    );
  }

  // ============================================================
  // UNAUTHORIZED
  // ============================================================

  if (!authorized) {
    return null;
  }

  // ============================================================
  // ADMIN DASHBOARD
  // ============================================================

  return (
    <main className="admin-page">

      {/* ================= HEADER ================= */}

      <section className="admin-header">
        <div>
          <span className="admin-eyebrow">
            AGROBAZ CONTROL CENTER
          </span>

          <h1>Admin Dashboard</h1>

          <p>
            Manage your marketplace, sellers,
            products, orders and users.
          </p>
        </div>

        <div className="admin-badge">
          🔐 Administrator
        </div>
      </section>


      {/* ================= STATISTICS ================= */}

      <section className="admin-stats">

        <div className="admin-stat-card">
          <span className="admin-stat-icon">
            👥
          </span>

          <div>
            <p>Total Users</p>

            <strong>
              {loadingStats ? "..." : stats.users}
            </strong>
          </div>
        </div>


        <div className="admin-stat-card">
          <span className="admin-stat-icon">
            👨‍🌾
          </span>

          <div>
            <p>Sellers</p>

            <strong>
              {loadingStats ? "..." : stats.sellers}
            </strong>
          </div>
        </div>


        <div className="admin-stat-card">
          <span className="admin-stat-icon">
            📦
          </span>

          <div>
            <p>Products</p>

            <strong>
              {loadingStats ? "..." : stats.products}
            </strong>
          </div>
        </div>


        <div className="admin-stat-card">
          <span className="admin-stat-icon">
            🛒
          </span>

          <div>
            <p>Orders</p>

            <strong>
              {loadingStats ? "..." : stats.orders}
            </strong>
          </div>
        </div>

      </section>


      {/* ================= MANAGEMENT ================= */}

      <section className="admin-section">

        <div className="admin-section-heading">
          <span>CONTROL CENTER</span>

          <h2>Manage AgroBaz</h2>
        </div>


        <div className="admin-grid">

          {/* SELLERS */}

          <button
            className="admin-control-card"
            onClick={() =>
              navigate("/admin/sellers")
            }
          >
            <div className="admin-control-icon">
              👨‍🌾
            </div>

            <h3>Seller Management</h3>

            <p>
              Review sellers and manage
              verification.
            </p>

            <span>
              Manage sellers →
            </span>
          </button>


          {/* PRODUCTS */}

          <button
            className="admin-control-card"
            onClick={() =>
              navigate("/admin/products")
            }
          >
            <div className="admin-control-icon">
              📦
            </div>

            <h3>Product Management</h3>

            <p>
              Review and manage marketplace
              products.
            </p>

            <span>
              Manage products →
            </span>
          </button>


          {/* ORDERS */}

          <button
            className="admin-control-card"
            onClick={() =>
              navigate("/admin/orders")
            }
          >
            <div className="admin-control-icon">
              🛒
            </div>

            <h3>Order Management</h3>

            <p>
              Monitor marketplace orders
              and activity.
            </p>

            <span>
              View orders →
            </span>
          </button>


          {/* USERS */}

          <button
            className="admin-control-card"
            onClick={() =>
              navigate("/admin/users")
            }
          >
            <div className="admin-control-icon">
              👥
            </div>

            <h3>User Management</h3>

            <p>
              View buyers, sellers and
              marketplace accounts.
            </p>

            <span>
              Manage users →
            </span>
          </button>


          {/* REVIEWS */}

          <button
            className="admin-control-card"
            onClick={() =>
              navigate("/admin/reviews")
            }
          >
            <div className="admin-control-icon">
              ⭐
            </div>

            <h3>Review Moderation</h3>

            <p>
              Monitor reviews and remove
              inappropriate content.
            </p>

            <span>
              Manage reviews →
            </span>
          </button>


          {/* AFFILIATES */}

          <button
            className="admin-control-card"
            onClick={() =>
              navigate("/admin/affiliates")
            }
          >
            <div className="admin-control-icon">
              💰
            </div>

            <h3>Affiliate Management</h3>

            <p>
              Monitor affiliates, sales
              and commissions.
            </p>

            <span>
              Manage affiliates →
            </span>
          </button>

        </div>

      </section>

    </main>
  );
}

export default AdminDashboard;

