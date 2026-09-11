import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./AffiliateDashboard.css";

function AffiliateDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [affiliate, setAffiliate] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let unsubscribe;

    const loadAffiliate = async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      try {
        // Find affiliate account
        const affiliateQuery = query(
          collection(db, "affiliates"),
          where("userId", "==", currentUser.uid),
          limit(1)
        );

        const affiliateSnapshot =
          await getDocs(affiliateQuery);

        if (affiliateSnapshot.empty) {
          setAffiliate(null);
          setLoading(false);
          return;
        }

        const affiliateDoc =
          affiliateSnapshot.docs[0];

        const affiliateData = {
          id: affiliateDoc.id,
          ...affiliateDoc.data(),
        };

        setAffiliate(affiliateData);

        // Load affiliate sales
        const salesQuery = query(
          collection(db, "affiliate_sales"),
          where(
            "affiliateId",
            "==",
            affiliateData.affiliateCode
          ),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const salesSnapshot =
          await getDocs(salesQuery);

        const salesData =
          salesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

        setSales(salesData);

      } catch (error) {
        console.error(
          "Affiliate dashboard error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    unsubscribe = onAuthStateChanged(
      auth,
      loadAffiliate
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="affiliate-dashboard">
        <h2>
          Loading Affiliate Dashboard... 🔗
        </h2>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!affiliate) {
    return (
      <div className="affiliate-dashboard">
        <div className="affiliate-empty">
          <h2>
            You're not an affiliate yet 🔗
          </h2>

          <p>
            Apply from your main Agrobaz dashboard
            to start earning 9% commissions.
          </p>

          <button
            onClick={() =>
              navigate("/dashboard")
            }
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalClicks =
    Number(affiliate.totalClicks) || 0;

  const totalSales =
    Number(affiliate.totalSales) || 0;

  const totalEarned =
    Number(affiliate.totalEarned) || 0;

  const pendingCommission =
    Number(affiliate.pendingCommission) || 0;

  const availableBalance =
    Number(affiliate.availableBalance) || 0;

  const commissionRate =
    Number(affiliate.commissionRate) || 9;

  // ==========================================
  // AFFILIATE LINK
  // ==========================================

  const affiliateLink =
    `${window.location.origin}/marketplace?ref=${affiliate.affiliateCode}`;

  // ==========================================
  // COPY AFFILIATE LINK
  // ==========================================

  async function copyAffiliateLink() {
    try {
      await navigator.clipboard.writeText(
        affiliateLink
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);

    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );

      alert(
        "Unable to copy link. Please copy it manually."
      );
    }
  }

  return (
    <div className="affiliate-dashboard">

      {/* HEADER */}

      <div className="affiliate-header">

        <div>
          <h1>
            Agrobaz Affiliate Dashboard 🔗
          </h1>

          <p>
            Welcome back, {user.email}
          </p>
        </div>

        <div
          className={`affiliate-status ${affiliate.status}`}
        >
          {affiliate.status}
        </div>

      </div>


      {/* PROFILE */}

      <div className="affiliate-profile-card">

        <h2>
          Affiliate Account
        </h2>

        <div className="affiliate-profile-grid">

          <div>
            <span>
              Affiliate ID
            </span>

            <strong>
              {affiliate.affiliateCode}
            </strong>
          </div>

          <div>
            <span>
              Commission Rate
            </span>

            <strong>
              {commissionRate}%
            </strong>
          </div>

          <div>
            <span>
              Account Status
            </span>

            <strong>
              {affiliate.status}
            </strong>
          </div>

          <div>
            <span>
              Email
            </span>

            <strong>
              {affiliate.email ||
                user.email}
            </strong>
          </div>

        </div>

      </div>


      {/* STATISTICS */}

      <div className="affiliate-stats">

        <div className="affiliate-stat-card">
          <span>👆</span>
          <p>Total Clicks</p>
          <h2>
            {totalClicks.toLocaleString()}
          </h2>
        </div>

        <div className="affiliate-stat-card">
          <span>🛒</span>
          <p>Total Sales</p>
          <h2>
            {totalSales.toLocaleString()}
          </h2>
        </div>

        <div className="affiliate-stat-card">
          <span>💰</span>
          <p>Total Earned</p>
          <h2>
            UGX {totalEarned.toLocaleString()}
          </h2>
        </div>

        <div className="affiliate-stat-card">
          <span>⏳</span>
          <p>Pending</p>
          <h2>
            UGX {pendingCommission.toLocaleString()}
          </h2>
        </div>

        <div className="affiliate-stat-card">
          <span>💵</span>
          <p>Available</p>
          <h2>
            UGX {availableBalance.toLocaleString()}
          </h2>
        </div>

      </div>


      {/* AFFILIATE LINK */}

      <div className="affiliate-section">

        <h2>
          🔗 Your Affiliate Link
        </h2>

        <p>
          Share this link with customers.
          When they visit Agrobaz through your
          link, the referral can be tracked.
        </p>

        {affiliate.status === "approved" ? (

          <div className="affiliate-link-box">

            <input
              type="text"
              value={affiliateLink}
              readOnly
            />

            <button
              onClick={copyAffiliateLink}
            >
              {copied
                ? "✅ Copied!"
                : "📋 Copy Link"}
            </button>

          </div>

        ) : (

          <div className="affiliate-notice">
            Your affiliate account is{" "}
            <strong>
              {affiliate.status}
            </strong>.
            <br />
            Your affiliate links will become
            available after approval.
          </div>

        )}

      </div>


      {/* PRODUCT LINKS */}

      <div className="affiliate-section">

        <div className="affiliate-section-header">

          <div>
            <h2>
              🛍️ Product Affiliate Links
            </h2>

            <p>
              Create links for specific
              Agrobaz products.
            </p>
          </div>

          {affiliate.status === "approved" && (
            <button
              onClick={() =>
                navigate(
                  "/affiliate-products"
                )
              }
            >
              Generate Product Links
            </button>
          )}

        </div>

      </div>


      {/* EARNINGS */}

      <div className="affiliate-section">

        <h2>
          📈 Earnings History
        </h2>

        {sales.length === 0 ? (

          <div className="affiliate-empty">

            <p>
              No affiliate sales yet.
            </p>

            <span>
              Your earnings will appear here
              when customers purchase through
              your affiliate links.
            </span>

          </div>

        ) : (

          <div className="affiliate-sales-table">

            <div className="sales-row sales-header">
              <span>
                Product
              </span>

              <span>
                Sale
              </span>

              <span>
                Commission
              </span>

              <span>
                Status
              </span>
            </div>

            {sales.map((sale) => (

              <div
                className="sales-row"
                key={sale.id}
              >

                <span>
                  {sale.productName ||
                    "Product"}
                </span>

                <span>
                  UGX{" "}
                  {(
                    Number(
                      sale.saleAmount
                    ) || 0
                  ).toLocaleString()}
                </span>

                <span>
                  UGX{" "}
                  {(
                    Number(
                      sale.commissionAmount
                    ) || 0
                  ).toLocaleString()}
                </span>

                <span>
                  {sale.status ||
                    "pending"}
                </span>

              </div>

            ))}

          </div>

        )}

      </div>


      {/* WITHDRAWAL */}

      <div className="affiliate-section">

        <h2>
          💸 Withdraw Earnings
        </h2>

        <p>
          Available balance
        </p>

        <h2>
          UGX{" "}
          {availableBalance.toLocaleString()}
        </h2>

        <button
          disabled={
            availableBalance <= 0
          }
          onClick={() =>
            navigate(
              "/affiliate-withdrawals"
            )
          }
        >
          Request Withdrawal
        </button>

      </div>

    </div>
  );
}

export default AffiliateDashboard;
