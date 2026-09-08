import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function AffiliateProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const user = auth.currentUser;

      if (!user) {
        navigate("/login");
        return;
      }

      try {
        // Find ONLY the current user's affiliate account
        const affiliateQuery = query(
          collection(db, "affiliates"),
          where("userId", "==", user.uid)
        );

        const affiliateSnapshot =
          await getDocs(affiliateQuery);

        if (affiliateSnapshot.empty) {
          alert("Affiliate account not found.");
          navigate("/dashboard");
          return;
        }

        const affiliateDoc =
          affiliateSnapshot.docs[0];

        const affiliateData = {
          id: affiliateDoc.id,
          ...affiliateDoc.data(),
        };

        if (affiliateData.status !== "approved") {
          alert(
            "Your affiliate account is not approved yet."
          );

          navigate("/affiliate-dashboard");
          return;
        }

        setAffiliate(affiliateData);

        // Products are publicly readable
        const productSnapshot = await getDocs(
          collection(db, "products")
        );

        const productData =
          productSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

        setProducts(productData);

      } catch (error) {
        console.error(
          "Affiliate products error:",
          error
        );

        alert(error.message);

      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [navigate]);

  function generateLink(product) {
    if (!affiliate?.affiliateCode) {
      alert("Affiliate code not found.");
      return;
    }

    const link =
      `${window.location.origin}/product/${product.id}` +
      `?affiliate=${affiliate.affiliateCode}`;

    navigator.clipboard
      .writeText(link)
      .then(() => {
        alert(
          "Affiliate link copied! 🔗\n\n" +
          link
        );
      })
      .catch(() => {
        alert(
          "Could not copy automatically.\n\n" +
          link
        );
      });
  }

  if (loading) {
    return (
      <div className="affiliate-products">
        <h2>
          Loading Affiliate Products... 🌾
        </h2>
      </div>
    );
  }

  return (
    <div className="affiliate-products">

      <h1>
        🔗 Affiliate Products
      </h1>

      <p>
        Share Agrobaz products and earn{" "}
        <strong>
          {affiliate?.commissionRate || 9}%
        </strong>{" "}
        on qualifying sales.
      </p>

      <button
        onClick={() =>
          navigate("/affiliate-dashboard")
        }
      >
        ← Back to Affiliate Dashboard
      </button>

      <div className="affiliate-product-grid">

        {products.length === 0 ? (
          <p>
            No products available yet.
          </p>
        ) : (
          products.map((product) => (

            <div
              className="affiliate-product-card"
              key={product.id}
            >

              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                />
              )}

              <h2>
                {product.name}
              </h2>

              <p>
                UGX{" "}
                {Number(
                  product.price || 0
                ).toLocaleString()}
              </p>

              <p>
                📍 {product.location || "Uganda"}
              </p>

              <button
                onClick={() =>
                  generateLink(product)
                }
              >
                🔗 Copy Affiliate Link
              </button>

            </div>

          ))
        )}

      </div>

    </div>
  );
}

export default AffiliateProducts;