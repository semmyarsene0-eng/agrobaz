
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db, auth } from "../firebase";
import "./MyProducts.css";

const LOW_STOCK_THRESHOLD = 5;

function MyProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const user = auth.currentUser;

      if (!user) {
        setError(
          "Please login to manage your products."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const productsQuery = query(
          collection(db, "products"),
          where("sellerId", "==", user.uid)
        );

        const snapshot = await getDocs(
          productsQuery
        );

        const sellerProducts =
          snapshot.docs.map((productDoc) => {
            const data = productDoc.data();

            const stock = Math.max(
              0,
              Number(data.quantity ?? 0)
            );

            return {
              id: productDoc.id,
              ...data,
              quantity: stock,
            };
          });

        sellerProducts.sort((a, b) => {
          const dateA =
            a.createdAt?.seconds || 0;

          const dateB =
            b.createdAt?.seconds || 0;

          return dateB - dateA;
        });

        setProducts(sellerProducts);
      } catch (err) {
        console.error(
          "Load products error:",
          err
        );

        setError(
          err.message ||
            "Unable to load your products."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  function getStockStatus(product) {
    const stock = Math.max(
      0,
      Number(product.quantity ?? 0)
    );

    if (stock === 0) {
      return "out";
    }

    if (stock <= LOW_STOCK_THRESHOLD) {
      return "low";
    }

    return "good";
  }

  function getStockLabel(product) {
    const stock = Math.max(
      0,
      Number(product.quantity ?? 0)
    );

    const stockStatus =
      getStockStatus(product);

    if (stockStatus === "out") {
      return "🔴 Out of Stock";
    }

    if (stockStatus === "low") {
      return `🟡 Low Stock: ${stock}`;
    }

    return `🟢 In Stock: ${stock}`;
  }

  function getProductStatus(product) {
    const stock = Math.max(
      0,
      Number(product.quantity ?? 0)
    );

    if (stock === 0) {
      return "Out of Stock";
    }

    return product.status === "Active"
      ? "Active"
      : "Inactive";
  }

  async function handleDelete(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(productId);

      await deleteDoc(
        doc(db, "products", productId)
      );

      setProducts((previous) =>
        previous.filter(
          (product) =>
            product.id !== productId
        )
      );

      alert(
        "Product deleted successfully."
      );
    } catch (err) {
      console.error(
        "Delete product error:",
        err
      );

      alert(
        err.message ||
          "Unable to delete this product."
      );
    } finally {
      setDeletingId("");
    }
  }

  async function toggleStatus(product) {
    const stock = Math.max(
      0,
      Number(product.quantity ?? 0)
    );

    /*
     * Do not allow zero-stock products
     * to become Active.
     */
    if (
      product.status !== "Active" &&
      stock <= 0
    ) {
      alert(
        "This product has no stock. Add stock before activating it."
      );

      return;
    }

    const newStatus =
      product.status === "Active"
        ? "Inactive"
        : "Active";

    try {
      await updateDoc(
        doc(db, "products", product.id),
        {
          status: newStatus,
          updatedAt: serverTimestamp(),
        }
      );

      setProducts((previous) =>
        previous.map((item) =>
          item.id === product.id
            ? {
                ...item,
                status: newStatus,
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Update product status error:",
        err
      );

      alert(
        err.message ||
          "Unable to update product status."
      );
    }
  }

  function formatCurrency(price) {
    return `UGX ${Number(
      price || 0
    ).toLocaleString()}`;
  }

  /*
   * SUMMARY COUNTS
   */

  const totalProducts =
    products.length;

  const activeProducts =
    products.filter(
      (product) =>
        product.status === "Active" &&
        Number(product.quantity ?? 0) > 0
    ).length;

  const inactiveProducts =
    products.filter(
      (product) =>
        product.status !== "Active" &&
        Number(product.quantity ?? 0) > 0
    ).length;

  const lowStockProducts =
    products.filter(
      (product) =>
        getStockStatus(product) === "low"
    ).length;

  const outOfStockProducts =
    products.filter(
      (product) =>
        getStockStatus(product) === "out"
    ).length;

  if (loading) {
    return (
      <div className="my-products-page">
        <div className="my-products-container">
          <div className="my-products-loading">
            <div className="loading-icon">
              🌾
            </div>

            <h2>
              Loading Your Products...
            </h2>

            <p>
              Please wait while we
              prepare your inventory.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-products-page">
        <div className="my-products-container">
          <div className="my-products-error">
            <div className="error-icon">
              ⚠️
            </div>

            <h2>
              Unable to Load Products
            </h2>

            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                navigate("/dashboard")
              }
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-products-page">
      <div className="my-products-container">

        {/* HEADER */}

        <div className="my-products-header">
          <div>
            <button
              type="button"
              className="back-button"
              onClick={() =>
                navigate("/dashboard")
              }
            >
              ← Dashboard
            </button>

            <span className="dashboard-label">
              AGROBAZ SELLER CENTER
            </span>

            <h1>
              My Products 📦
            </h1>

            <p>
              Manage your products,
              inventory, and listings.
            </p>
          </div>

          <Link
            to="/add-product"
            className="add-product-button"
          >
            + Add Product
          </Link>
        </div>

        {/* SUMMARY */}

        <div className="products-summary">

          <div className="summary-card">
            <span className="summary-icon">
              📦
            </span>

            <div>
              <strong>
                {totalProducts}
              </strong>

              <span>
                Total Products
              </span>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">
              🟢
            </span>

            <div>
              <strong>
                {activeProducts}
              </strong>

              <span>
                Active
              </span>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">
              ⏸️
            </span>

            <div>
              <strong>
                {inactiveProducts}
              </strong>

              <span>
                Inactive
              </span>
            </div>
          </div>

          <div className="summary-card low-stock-summary">
            <span className="summary-icon">
              🟡
            </span>

            <div>
              <strong>
                {lowStockProducts}
              </strong>

              <span>
                Low Stock
              </span>
            </div>
          </div>

          <div className="summary-card out-stock-summary">
            <span className="summary-icon">
              🔴
            </span>

            <div>
              <strong>
                {outOfStockProducts}
              </strong>

              <span>
                Out of Stock
              </span>
            </div>
          </div>

        </div>

        {/* EMPTY STATE */}

        {products.length === 0 ? (
          <div className="my-products-empty">
            <div className="empty-icon">
              🌾
            </div>

            <h2>
              You haven't added any
              products yet.
            </h2>

            <p>
              Start selling by adding
              your first agricultural
              product.
            </p>

            <Link
              to="/add-product"
              className="add-product-button"
            >
              + Add Your First Product
            </Link>
          </div>
        ) : (
          <>
            {/* PRODUCT COUNT */}

            <div className="products-list-header">
              <div>
                <h2>
                  Your Inventory
                </h2>

                <p>
                  {totalProducts}{" "}
                  {totalProducts === 1
                    ? "product"
                    : "products"}{" "}
                  listed
                </p>
              </div>
            </div>

            {/* PRODUCTS GRID */}

            <div className="products-grid">
              {products.map(
                (product) => {
                  const stock =
                    Math.max(
                      0,
                      Number(
                        product.quantity ??
                          0
                      )
                    );

                  const stockStatus =
                    getStockStatus(
                      product
                    );

                  const productStatus =
                    getProductStatus(
                      product
                    );

                  return (
                    <div
                      className={`my-product-card ${
                        stockStatus ===
                        "out"
                          ? "product-out-of-stock"
                          : stockStatus ===
                            "low"
                          ? "product-low-stock"
                          : ""
                      }`}
                      key={product.id}
                    >

                      {/* IMAGE */}

                      <div className="my-product-image-wrapper">
                        {product.image ? (
                          <img
                            src={
                              product.image
                            }
                            alt={
                              product.name
                            }
                            className="my-product-image"
                          />
                        ) : (
                          <div className="no-image">
                            🌾

                            <span>
                              No Image
                            </span>
                          </div>
                        )}

                        {/* PRODUCT STATUS */}

                        <span
                          className={`product-status ${
                            stock === 0
                              ? "inactive"
                              : product.status ===
                                "Active"
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {productStatus}
                        </span>
                      </div>

                      {/* CONTENT */}

                      <div className="my-product-content">

                        <span className="product-category">
                          {product.category ||
                            "Agricultural Product"}
                        </span>

                        <h3>
                          {product.name ||
                            "Unnamed Product"}
                        </h3>

                        <div className="product-price">
                          {formatCurrency(
                            product.price
                          )}
                        </div>

                        {/* DETAILS */}

                        <div className="product-details">

                          <div className="product-detail-row">
                            <span>
                              📦 Stock
                            </span>

                            <strong
                              className={`stock-text ${stockStatus}`}
                            >
                              {stock}
                            </strong>
                          </div>

                          <div className="product-detail-row">
                            <span>
                              📍 Location
                            </span>

                            <strong>
                              {product.location ||
                                "Uganda"}
                            </strong>
                          </div>

                        </div>

                        {/* STOCK ALERT */}

                        <div
                          className={`product-stock-display ${stockStatus}`}
                        >
                          {getStockLabel(
                            product
                          )}
                        </div>

                        {/* MAIN ACTIONS */}

                        <div className="product-actions">

                          <Link
                            to={`/product/${product.id}`}
                            className="view-button"
                          >
                            👁 View
                          </Link>

                          <Link
                            to={`/edit-product/${product.id}`}
                            className="edit-button"
                          >
                            ✏️ Edit
                          </Link>

                        </div>

                        {/* BOTTOM ACTIONS */}

                        <div className="product-bottom-actions">

                          <button
                            type="button"
                            className={`status-button ${
                              product.status ===
                              "Active"
                                ? "deactivate"
                                : "activate"
                            }`}
                            onClick={() =>
                              toggleStatus(
                                product
                              )
                            }
                            disabled={
                              deletingId ===
                              product.id ||
                              stock === 0
                            }
                            title={
                              stock === 0
                                ? "Add stock before activating this product"
                                : ""
                            }
                          >
                            {product.status ===
                            "Active"
                              ? "⏸ Deactivate"
                              : stock === 0
                              ? "🔴 Add Stock First"
                              : "▶ Activate"}
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() =>
                              handleDelete(
                                product.id
                              )
                            }
                            disabled={
                              deletingId ===
                              product.id
                            }
                          >
                            {deletingId ===
                            product.id
                              ? "⏳ Deleting..."
                              : "🗑 Delete"}
                          </button>

                        </div>

                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MyProducts;

