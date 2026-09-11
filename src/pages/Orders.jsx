import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

import { db, auth } from "../firebase";
import "./Orders.css";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("purchases");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // BUYER REVIEW STATES
  // ==========================================

  const [reviewedOrderIds, setReviewedOrderIds] = useState([]);
  const [activeReviewOrderId, setActiveReviewOrderId] =
    useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] =
    useState(false);

  // ==========================================
  // SELLER → BUYER REVIEW STATES
  // ==========================================

  const [sellerReviewedOrderIds, setSellerReviewedOrderIds] =
    useState([]);
  const [
    activeSellerReviewOrderId,
    setActiveSellerReviewOrderId,
  ] = useState(null);
  const [sellerReviewRating, setSellerReviewRating] =
    useState(5);
  const [sellerReviewComment, setSellerReviewComment] =
    useState("");
  const [submittingSellerReview, setSubmittingSellerReview] =
    useState(false);

  // ==========================================
  // STATUS UPDATE STATE
  // ==========================================

  const [updatingOrderId, setUpdatingOrderId] =
    useState(null);

  // ==========================================
  // LOAD ORDERS
  // ==========================================

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const user = auth.currentUser;

        if (!user) {
          setError("Please log in to view your orders.");
          setLoading(false);
          return;
        }

        // ------------------------------------------
        // BUYER ORDERS
        // ------------------------------------------

        const buyerQuery = query(
          collection(db, "orders"),
          where("buyerId", "==", user.uid)
        );

        // ------------------------------------------
        // SELLER ORDERS
        // ------------------------------------------

        const sellerQuery = query(
          collection(db, "orders"),
          where("sellerId", "==", user.uid)
        );

        const [buyerSnapshot, sellerSnapshot] =
          await Promise.all([
            getDocs(buyerQuery),
            getDocs(sellerQuery),
          ]);

        const buyerOrders = buyerSnapshot.docs.map(
          (orderDoc) => ({
            id: orderDoc.id,
            ...orderDoc.data(),
            orderType: "purchase",
          })
        );

        const sellerOrders = sellerSnapshot.docs.map(
          (orderDoc) => ({
            id: orderDoc.id,
            ...orderDoc.data(),
            orderType: "sale",
          })
        );

        // ------------------------------------------
        // COMBINE ORDERS
        // ------------------------------------------

        const allOrders = [
          ...buyerOrders,
          ...sellerOrders,
        ];

        const uniqueOrders = Array.from(
          new Map(
            allOrders.map((order) => [
              order.id,
              order,
            ])
          ).values()
        );

        uniqueOrders.sort((a, b) => {
          const dateA =
            a.createdAt?.seconds || 0;

          const dateB =
            b.createdAt?.seconds || 0;

          return dateB - dateA;
        });

        setOrders(uniqueOrders);

        // ==========================================
        // LOAD ALL REVIEWS MADE BY CURRENT USER
        // ==========================================

        const reviewsQuery = query(
          collection(db, "reviews"),
          where("reviewerId", "==", user.uid)
        );

        let reviewsSnapshot;

        try {
          reviewsSnapshot = await getDocs(
            reviewsQuery
          );
        } catch (reviewQueryError) {
          console.warn(
            "New reviewerId query failed. Using compatibility query.",
            reviewQueryError
          );

          // Compatibility with old buyer reviews
          const oldReviewsQuery = query(
            collection(db, "reviews"),
            where("buyerId", "==", user.uid)
          );

          reviewsSnapshot = await getDocs(
            oldReviewsQuery
          );
        }

        const buyerReviewedIds = [];
        const sellerReviewedIds = [];

        reviewsSnapshot.docs.forEach(
          (reviewDoc) => {
            const review = reviewDoc.data();

            if (
              review.reviewerRole === "seller" ||
              review.reviewedRole === "buyer"
            ) {
              if (review.orderId) {
                sellerReviewedIds.push(
                  review.orderId
                );
              }
            } else {
              // Old review format = buyer reviewing seller
              if (review.orderId) {
                buyerReviewedIds.push(
                  review.orderId
                );
              }
            }
          }
        );

        setReviewedOrderIds(buyerReviewedIds);
        setSellerReviewedOrderIds(
          sellerReviewedIds
        );
      } catch (err) {
        console.error(
          "Error loading orders:",
          err
        );

        setError(
          err.message ||
            "Unable to load orders. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  // ==========================================
  // CREATE BUYER NOTIFICATION
  // ==========================================

  async function createOrderNotification(
    order,
    newStatus
  ) {
    try {
      if (!order?.buyerId) {
        console.warn(
          "Cannot create notification: buyerId is missing."
        );
        return;
      }

      const notificationDetails = {
        Accepted: {
          type: "order_accepted",
          title: "Order accepted",
          message: `Your order for ${
            order.productName ||
            "your product"
          } has been accepted by the seller.`,
        },

        Ready: {
          type: "order_ready",
          title: "Order ready",
          message: `Your order for ${
            order.productName ||
            "your product"
          } is now ready for pickup or delivery.`,
        },

        Completed: {
          type: "order_completed",
          title: "Order completed",
          message: `Your order for ${
            order.productName ||
            "your product"
          } has been completed.`,
        },
      };

      const details =
        notificationDetails[newStatus];

      if (!details) {
        return;
      }

      await addDoc(
        collection(db, "notifications"),
        {
          userId: order.buyerId,
          type: details.type,
          title: details.title,
          message: details.message,
          orderId: order.id,
          productId: order.productId || "",
          productName:
            order.productName || "",
          read: false,
          createdAt: serverTimestamp(),
        }
      );

      console.log(
        `Buyer notification created for ${newStatus}.`
      );
    } catch (notificationError) {
      console.error(
        "Buyer notification creation failed:",
        notificationError
      );
    }
  }

  // ==========================================
  // UPDATE ORDER STATUS
  // ==========================================

  async function updateStatus(
    id,
    newStatus,
    order
  ) {
    try {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        alert("Please log in first.");
        return;
      }

      if (
        order.sellerId !==
        currentUser.uid
      ) {
        alert(
          "You are not authorized to update this order."
        );
        return;
      }

      const currentStatus =
        order.status || "Pending";

      const validTransitions = {
        Pending: "Accepted",
        Accepted: "Ready",
        Ready: "Completed",
      };

      if (
        validTransitions[currentStatus] !==
        newStatus
      ) {
        alert(
          "This order cannot be moved to that status."
        );
        return;
      }

      // ------------------------------------------
      // CONFIRM COMPLETION
      // ------------------------------------------

      if (
        newStatus === "Completed"
      ) {
        const confirmed =
          window.confirm(
            "Are you sure you want to mark this order as completed?"
          );

        if (!confirmed) {
          return;
        }
      }

      setUpdatingOrderId(id);

      const orderRef = doc(
        db,
        "orders",
        id
      );

      // ==========================================
      // ACCEPT ORDER + REDUCE STOCK ATOMICALLY
      // ==========================================

      if (
        newStatus === "Accepted"
      ) {
        const result =
          await runTransaction(
            db,
            async (transaction) => {
              const orderSnapshot =
                await transaction.get(
                  orderRef
                );

              if (
                !orderSnapshot.exists()
              ) {
                throw new Error(
                  "This order no longer exists."
                );
              }

              const latestOrder =
                orderSnapshot.data();

              if (
                latestOrder.sellerId !==
                currentUser.uid
              ) {
                throw new Error(
                  "You are not authorized to accept this order."
                );
              }

              if (
                (latestOrder.status ||
                  "Pending") !==
                "Pending"
              ) {
                throw new Error(
                  "This order has already been updated by another action."
                );
              }

              if (
                !latestOrder.productId
              ) {
                throw new Error(
                  "This order is missing its product information."
                );
              }

              const productRef =
                doc(
                  db,
                  "products",
                  latestOrder.productId
                );

              const productSnapshot =
                await transaction.get(
                  productRef
                );

              if (
                !productSnapshot.exists()
              ) {
                throw new Error(
                  "The product connected to this order no longer exists."
                );
              }

              const product =
                productSnapshot.data();

              if (
                product.sellerId !==
                currentUser.uid
              ) {
                throw new Error(
                  "This product does not belong to your seller account."
                );
              }

              const availableStock =
                Number(
                  product.quantity
                );

              const requestedQuantity =
                Number(
                  latestOrder.quantity
                );

              if (
                !Number.isFinite(
                  availableStock
                ) ||
                availableStock < 0
              ) {
                throw new Error(
                  "The product has invalid stock information."
                );
              }

              if (
                !Number.isFinite(
                  requestedQuantity
                ) ||
                requestedQuantity < 1
              ) {
                throw new Error(
                  "This order has an invalid quantity."
                );
              }

              if (
                requestedQuantity >
                availableStock
              ) {
                throw new Error(
                  `Not enough stock. Available: ${availableStock}. Requested: ${requestedQuantity}.`
                );
              }

              const newStock =
                availableStock -
                requestedQuantity;

              transaction.update(
                productRef,
                {
                  quantity: newStock,

                  status:
                    newStock === 0
                      ? "Inactive"
                      : product.status ||
                        "Active",

                  updatedAt:
                    serverTimestamp(),
                }
              );

              transaction.update(
                orderRef,
                {
                  status: "Accepted",
                  updatedAt:
                    serverTimestamp(),
                  sellerAcceptedAt:
                    serverTimestamp(),
                }
              );

              return {
                newStock,
                requestedQuantity,
              };
            }
          );

        // ------------------------------------------
        // UPDATE LOCAL UI
        // ------------------------------------------

        setOrders(
          (currentOrders) =>
            currentOrders.map(
              (currentOrder) =>
                currentOrder.id === id
                  ? {
                      ...currentOrder,
                      status: "Accepted",
                      sellerAcceptedAt:
                        new Date(),
                    }
                  : currentOrder
            )
        );

        // ------------------------------------------
        // NOTIFY BUYER
        // ------------------------------------------

        await createOrderNotification(
          order,
          "Accepted"
        );

        alert(
          `Order accepted successfully.\n\nStock remaining: ${result.newStock}`
        );

        return;
      }

      // ==========================================
      // READY / COMPLETED
      // ==========================================

      const updateData = {
        status: newStatus,
        updatedAt:
          serverTimestamp(),
      };

      if (
        newStatus === "Ready"
      ) {
        updateData.sellerReadyAt =
          serverTimestamp();
      }

      if (
        newStatus === "Completed"
      ) {
        updateData.sellerCompletedAt =
          serverTimestamp();
      }

      // ==========================================
      // AFFILIATE COMMISSION
      // ==========================================

      if (
        newStatus === "Completed" &&
        order.affiliateCode
      ) {
        const commissionRate =
          0.09;

        const price =
          Number(order.price) || 0;

        const quantity =
          Number(order.quantity) || 1;

        const totalAmount =
          Number(
            order.totalAmount
          ) ||
          price * quantity;

        const commission =
          totalAmount *
          commissionRate;

        updateData.commission =
          commission;

        updateData.platformEarning =
          commission;
      }

      await updateDoc(
        orderRef,
        updateData
      );

      // ------------------------------------------
      // UPDATE LOCAL UI
      // ------------------------------------------

      setOrders(
        (currentOrders) =>
          currentOrders.map(
            (currentOrder) =>
              currentOrder.id === id
                ? {
                    ...currentOrder,
                    status: newStatus,

                    commission:
                      updateData.commission ??
                      currentOrder.commission,

                    platformEarning:
                      updateData.platformEarning ??
                      currentOrder.platformEarning,
                  }
                : currentOrder
          )
      );

      // ------------------------------------------
      // NOTIFY BUYER
      // ------------------------------------------

      await createOrderNotification(
        order,
        newStatus
      );

      if (
        newStatus === "Ready"
      ) {
        alert(
          "Order marked as ready."
        );
      }

      if (
        newStatus === "Completed"
      ) {
        alert(
          "Order completed successfully."
        );
      }
    } catch (err) {
      console.error(
        "Error updating order:",
        err
      );

      alert(
        err.message ||
          "Unable to update the order."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // ==========================================
  // CONTACT SELLER
  // ==========================================

  function contactSeller(order) {
    if (!order.sellerWhatsapp) {
      alert(
        "The seller has not added a WhatsApp number."
      );
      return;
    }

    const cleanNumber =
      String(
        order.sellerWhatsapp
      )
        .replace(/\s+/g, "")
        .replace(/^\+/, "");

    const message = `
Hello! 👋

I am contacting you about my AgroBaz order.

🌾 Product: ${
      order.productName ||
      "Product"
    }

📦 Quantity: ${
      order.quantity || 1
    }

💰 Price: UGX ${Number(
      order.price || 0
    ).toLocaleString()}

🧾 Order ID: ${order.id}

I would like to discuss my order with you.

Thank you.
    `.trim();

    const url =
      `https://wa.me/${cleanNumber}` +
      `?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ==========================================
  // BUYER REVIEW
  // ==========================================

  function openReview(orderId) {
    setActiveReviewOrderId(
      orderId
    );
    setReviewRating(5);
    setReviewComment("");
  }

  function closeReview() {
    setActiveReviewOrderId(null);
    setReviewRating(5);
    setReviewComment("");
  }

  async function submitReview(order) {
    try {
      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "Please log in to leave a review."
        );
        return;
      }

      if (
        order.status !==
        "Completed"
      ) {
        alert(
          "You can only review completed orders."
        );
        return;
      }

      if (
        reviewedOrderIds.includes(
          order.id
        )
      ) {
        alert(
          "You have already reviewed this order."
        );
        return;
      }

      if (
        reviewRating < 1 ||
        reviewRating > 5
      ) {
        alert(
          "Please select a rating between 1 and 5."
        );
        return;
      }

      if (
        reviewComment.length > 500
      ) {
        alert(
          "Your review must be 500 characters or less."
        );
        return;
      }

      setSubmittingReview(true);

      const buyerName =
        user.displayName ||
        user.email ||
        "AgroBaz Buyer";

      const sellerName =
        order.sellerBusinessName ||
        order.sellerEmail ||
        "AgroBaz Seller";

      const reviewData = {
        // Existing fields - kept for compatibility
        orderId: order.id,
        productId:
          order.productId || "",
        productName:
          order.productName ||
          "Product",
        sellerId:
          order.sellerId,
        buyerId:
          user.uid,
        buyerName,

        // New two-way review fields
        reviewerId:
          user.uid,
        reviewerName:
          buyerName,
        reviewerRole:
          "buyer",

        reviewedUserId:
          order.sellerId,
        reviewedUserName:
          sellerName,
        reviewedRole:
          "seller",

        rating:
          reviewRating,

        comment:
          reviewComment.trim(),

        createdAt:
          serverTimestamp(),
      };

      await addDoc(
        collection(db, "reviews"),
        reviewData
      );

      setReviewedOrderIds(
        (current) => [
          ...current,
          order.id,
        ]
      );

      closeReview();

      alert(
        "Thank you! Your review has been submitted."
      );
    } catch (err) {
      console.error(
        "Error submitting buyer review:",
        err
      );

      alert(
        err.message ||
          "Unable to submit your review."
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  // ==========================================
  // SELLER REVIEW → RATE BUYER
  // ==========================================

  function openSellerReview(
    orderId
  ) {
    setActiveSellerReviewOrderId(
      orderId
    );

    setSellerReviewRating(5);
    setSellerReviewComment("");
  }

  function closeSellerReview() {
    setActiveSellerReviewOrderId(
      null
    );

    setSellerReviewRating(5);
    setSellerReviewComment("");
  }

  async function submitSellerReview(
    order
  ) {
    try {
      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "Please log in to leave a review."
        );
        return;
      }

      // ------------------------------------------
      // SECURITY CHECK
      // ------------------------------------------

      if (
        order.sellerId !==
        user.uid
      ) {
        alert(
          "You are not authorized to review this buyer."
        );
        return;
      }

      if (
        order.status !==
        "Completed"
      ) {
        alert(
          "You can only review buyers after completing the order."
        );
        return;
      }

      if (
        sellerReviewedOrderIds.includes(
          order.id
        )
      ) {
        alert(
          "You have already reviewed this buyer for this order."
        );
        return;
      }

      if (
        sellerReviewRating < 1 ||
        sellerReviewRating > 5
      ) {
        alert(
          "Please select a rating between 1 and 5."
        );
        return;
      }

      if (
        sellerReviewComment.length >
        500
      ) {
        alert(
          "Your review must be 500 characters or less."
        );
        return;
      }

      setSubmittingSellerReview(
        true
      );

      const sellerName =
        user.displayName ||
        user.email ||
        "AgroBaz Seller";

      const buyerName =
        order.buyerName ||
        order.buyerEmail ||
        "AgroBaz Buyer";

      // ------------------------------------------
      // SELLER → BUYER REVIEW
      // ------------------------------------------

      const reviewData = {
        // Existing fields for compatibility
        orderId: order.id,

        productId:
          order.productId || "",

        productName:
          order.productName ||
          "Product",

        sellerId:
          order.sellerId,

        buyerId:
          order.buyerId,

        buyerName,

        // New two-way review fields
        reviewerId:
          user.uid,

        reviewerName:
          sellerName,

        reviewerRole:
          "seller",

        reviewedUserId:
          order.buyerId,

        reviewedUserName:
          buyerName,

        reviewedRole:
          "buyer",

        rating:
          sellerReviewRating,

        comment:
          sellerReviewComment.trim(),

        createdAt:
          serverTimestamp(),
      };

      await addDoc(
        collection(db, "reviews"),
        reviewData
      );

      setSellerReviewedOrderIds(
        (current) => [
          ...current,
          order.id,
        ]
      );

      closeSellerReview();

      alert(
        "Thank you! Your rating for the buyer has been submitted."
      );
    } catch (err) {
      console.error(
        "Error submitting seller review:",
        err
      );

      alert(
        err.message ||
          "Unable to submit your review."
      );
    } finally {
      setSubmittingSellerReview(
        false
      );
    }
  }

  // ==========================================
  // DATE
  // ==========================================

  function formatDate(
    createdAt
  ) {
    if (!createdAt) {
      return "Date unavailable";
    }

    try {
      if (
        typeof createdAt ===
          "object" &&
        createdAt.seconds
      ) {
        return new Date(
          createdAt.seconds *
            1000
        ).toLocaleString();
      }

      return new Date(
        createdAt
      ).toLocaleString();
    } catch {
      return "Date unavailable";
    }
  }

  // ==========================================
  // CURRENT USER
  // ==========================================

  const currentUser =
    auth.currentUser;

  const purchaseOrders =
    orders.filter(
      (order) =>
        order.buyerId ===
        currentUser?.uid
    );

  const sellerOrders =
    orders.filter(
      (order) =>
        order.sellerId ===
        currentUser?.uid
    );

  const displayedOrders =
    activeTab === "purchases"
      ? purchaseOrders
      : sellerOrders;

  // ==========================================
  // STATUS COUNTS
  // ==========================================

  const pendingSellerOrders =
    sellerOrders.filter(
      (order) =>
        (order.status ||
          "Pending") ===
        "Pending"
    ).length;

  const activeSellerOrders =
    sellerOrders.filter(
      (order) =>
        [
          "Accepted",
          "Ready",
        ].includes(
          order.status ||
            "Pending"
        )
    ).length;

  const completedSellerOrders =
    sellerOrders.filter(
      (order) =>
        (order.status ||
          "Pending") ===
        "Completed"
    ).length;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="orders">
        <div className="orders-header">
          <h1>
            Orders 📦
          </h1>

          <p>
            Loading your AgroBaz orders...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div className="orders">
        <div className="orders-header">
          <h1>
            Orders 📦
          </h1>

          <div className="orders-error">
            <span>⚠️</span>

            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="orders">

      {/* HEADER */}

      <div className="orders-header">
        <div>
          <h1>
            AgroBaz Orders 📦
          </h1>

          <p className="orders-intro">
            Manage your purchases and
            seller orders in one place.
          </p>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="orders-summary">

        <div className="summary-card">
          <span className="summary-icon">
            🛒
          </span>

          <div>
            <strong>
              {purchaseOrders.length}
            </strong>

            <span>
              My Purchases
            </span>
          </div>
        </div>

        <div className="summary-card">
          <span className="summary-icon">
            📦
          </span>

          <div>
            <strong>
              {sellerOrders.length}
            </strong>

            <span>
              Seller Orders
            </span>
          </div>
        </div>

      </div>

      {/* SELLER QUICK STATS */}

      {activeTab === "seller" &&
        sellerOrders.length >
          0 && (
          <div className="seller-order-stats">

            <div>
              <span>⏳</span>

              <strong>
                {
                  pendingSellerOrders
                }
              </strong>

              <small>
                Pending
              </small>
            </div>

            <div>
              <span>🚚</span>

              <strong>
                {
                  activeSellerOrders
                }
              </strong>

              <small>
                Active
              </small>
            </div>

            <div>
              <span>✅</span>

              <strong>
                {
                  completedSellerOrders
                }
              </strong>

              <small>
                Completed
              </small>
            </div>

          </div>
        )}

      {/* TABS */}

      <div className="orders-tabs">

        <button
          className={
            activeTab ===
            "purchases"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "purchases"
            )
          }
        >
          🛒 My Purchases

          <span>
            {
              purchaseOrders.length
            }
          </span>
        </button>

        <button
          className={
            activeTab ===
            "seller"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "seller"
            )
          }
        >
          📦 Seller Orders

          <span>
            {
              sellerOrders.length
            }
          </span>
        </button>

      </div>

      {/* SECTION TITLE */}

      <div className="orders-section-title">

        <h2>
          {activeTab ===
          "purchases"
            ? "My Purchases 🛒"
            : "Orders From Customers 📦"}
        </h2>

        <p>
          {activeTab ===
          "purchases"
            ? "Orders you have placed on AgroBaz."
            : "Manage orders placed for your products."}
        </p>

      </div>

      {/* EMPTY STATE */}

      {displayedOrders.length ===
      0 ? (
        <div className="empty-orders">

          <div className="empty-orders-icon">
            {activeTab ===
            "purchases"
              ? "🛒"
              : "📦"}
          </div>

          <h2>
            {activeTab ===
            "purchases"
              ? "No purchases yet"
              : "No seller orders yet"}
          </h2>

          <p>
            {activeTab ===
            "purchases"
              ? "When you buy agricultural products, your orders will appear here."
              : "When customers order your products, their orders will appear here."}
          </p>

        </div>
      ) : (
        <div className="orders-list">

          {displayedOrders.map(
            (order) => {

              const isSeller =
                order.sellerId ===
                currentUser?.uid;

              const isBuyer =
                order.buyerId ===
                currentUser?.uid;

              const quantity =
                Number(
                  order.quantity || 1
                );

              const price =
                Number(
                  order.price || 0
                );

              const total =
                Number(
                  order.totalAmount
                ) ||
                price * quantity;

              const status =
                order.status ||
                "Pending";

              const isUpdating =
                updatingOrderId ===
                order.id;

              return (
                <div
                  className={`order-card ${
                    isSeller
                      ? "seller-order-card"
                      : ""
                  }`}
                  key={order.id}
                >

                  {/* ORDER HEADER */}

                  <div className="order-card-header">

                    <div>
                      <span className="order-label">
                        {isBuyer
                          ? "PURCHASE"
                          : "SELLER ORDER"}
                      </span>

                      <h2>
                        {order.productName ||
                          "AgroBaz Product"}
                      </h2>
                    </div>

                    <span
                      className={`order-status ${String(
                        status
                      ).toLowerCase()}`}
                    >
                      {status}
                    </span>

                  </div>

                  {/* ORDER ID */}

                  <div className="order-id">

                    <span>
                      Order ID
                    </span>

                    <strong>
                      {order.id}
                    </strong>

                  </div>

                  {/* BUYER INFORMATION */}

                  {isBuyer && (
                    <div className="order-info">

                      <div className="info-row">

                        <span>
                          👨‍🌾 Seller
                        </span>

                        <strong>
                          {order.sellerBusinessName ||
                            order.sellerEmail ||
                            "Seller"}
                        </strong>

                      </div>

                      <div className="info-row">

                        <span>
                          📍 Location
                        </span>

                        <strong>
                          {order.location ||
                            "Uganda"}
                        </strong>

                      </div>

                    </div>
                  )}

                  {/* SELLER INFORMATION */}

                  {isSeller && (
                    <div className="order-info">

                      <div className="info-row">

                        <span>
                          👤 Customer
                        </span>

                        <strong>
                          {order.buyerName ||
                            order.buyerEmail ||
                            "Buyer"}
                        </strong>

                      </div>

                      <div className="info-row">

                        <span>
                          📍 Delivery / Pickup
                        </span>

                        <strong>
                          {order.location ||
                            "Not specified"}
                        </strong>

                      </div>

                    </div>
                  )}

                  {/* ORDER DETAILS */}

                  <div className="order-details">

                    <div>
                      <span>
                        Quantity
                      </span>

                      <strong>
                        {quantity}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Price
                      </span>

                      <strong>
                        UGX{" "}
                        {price.toLocaleString()}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Total
                      </span>

                      <strong className="order-total">
                        UGX{" "}
                        {total.toLocaleString()}
                      </strong>
                    </div>

                  </div>

                  {/* PAYMENT */}

                  <div className="payment-row">

                    <span>
                      💳 Payment
                    </span>

                    <strong>
                      {order.paymentMethod ||
                        "Arranged with seller"}
                    </strong>

                  </div>

                  {/* STOCK NOTICE */}

                  {isSeller &&
                    status ===
                      "Pending" && (
                      <div className="order-stock-notice">
                        📦 Stock will be checked
                        automatically when you
                        accept this order.
                      </div>
                    )}

                  {/* TIMELINE */}

                  <div className="order-timeline">

                    <div
                      className={
                        "timeline-step " +
                        ([
                          "Pending",
                          "Accepted",
                          "Ready",
                          "Completed",
                        ].includes(
                          status
                        )
                          ? "active"
                          : "")
                      }
                    >
                      <span>1</span>
                      <p>
                        Pending
                      </p>
                    </div>

                    <div
                      className={
                        "timeline-line " +
                        ([
                          "Accepted",
                          "Ready",
                          "Completed",
                        ].includes(
                          status
                        )
                          ? "active"
                          : "")
                      }
                    />

                    <div
                      className={
                        "timeline-step " +
                        ([
                          "Accepted",
                          "Ready",
                          "Completed",
                        ].includes(
                          status
                        )
                          ? "active"
                          : "")
                      }
                    >
                      <span>2</span>
                      <p>
                        Accepted
                      </p>
                    </div>

                    <div
                      className={
                        "timeline-line " +
                        ([
                          "Ready",
                          "Completed",
                        ].includes(
                          status
                        )
                          ? "active"
                          : "")
                      }
                    />

                    <div
                      className={
                        "timeline-step " +
                        ([
                          "Ready",
                          "Completed",
                        ].includes(
                          status
                        )
                          ? "active"
                          : "")
                      }
                    >
                      <span>3</span>
                      <p>
                        Ready
                      </p>
                    </div>

                    <div
                      className={
                        "timeline-line " +
                        (status ===
                        "Completed"
                          ? "active"
                          : "")
                      }
                    />

                    <div
                      className={
                        "timeline-step " +
                        (status ===
                        "Completed"
                          ? "active"
                          : "")
                      }
                    >
                      <span>4</span>
                      <p>
                        Done
                      </p>
                    </div>

                  </div>

                  {/* DATE */}

                  <div className="order-date">
                    🕒 Ordered{" "}
                    {formatDate(
                      order.createdAt
                    )}
                  </div>

                  {/* ===================================== */}
                  {/* BUYER ACTIONS */}
                  {/* ===================================== */}

                  {isBuyer && (
                    <div className="buyer-order-actions">

                      {order.sellerWhatsapp && (
                        <button
                          onClick={() =>
                            contactSeller(
                              order
                            )
                          }
                          className="whatsapp-order-button"
                        >
                          🟢 Contact Seller
                        </button>
                      )}

                      {status ===
                        "Pending" && (
                        <p>
                          🟡 Waiting for the
                          seller to accept
                          your order.
                        </p>
                      )}

                      {status ===
                        "Accepted" && (
                        <p>
                          🟢 Your order has
                          been accepted.
                          Contact the seller
                          to arrange payment
                          and delivery.
                        </p>
                      )}

                      {status ===
                        "Ready" && (
                        <p>
                          📦 Your order is ready
                          for pickup or delivery.
                        </p>
                      )}

                      {/* ================================= */}
                      {/* BUYER REVIEW */}
                      {/* ================================= */}

                      {status ===
                        "Completed" && (
                        <>
                          <p>
                            ✅ Your order has
                            been completed.
                          </p>

                          {reviewedOrderIds.includes(
                            order.id
                          ) ? (
                            <div className="review-completed-message">
                              ⭐ Review submitted
                            </div>
                          ) : (
                            <>
                              {activeReviewOrderId !==
                              order.id ? (
                                <button
                                  className="review-order-button"
                                  onClick={() =>
                                    openReview(
                                      order.id
                                    )
                                  }
                                >
                                  ⭐ Leave a Review
                                </button>
                              ) : (
                                <div className="review-form">

                                  <div className="review-form-header">

                                    <h3>
                                      Rate this seller
                                    </h3>

                                    <button
                                      className="close-review-button"
                                      onClick={
                                        closeReview
                                      }
                                    >
                                      ✕
                                    </button>

                                  </div>

                                  <div className="review-rating">

                                    <p>
                                      Your rating
                                    </p>

                                    <div className="rating-buttons">

                                      {[1, 2, 3, 4, 5].map(
                                        (rating) => (
                                          <button
                                            key={
                                              rating
                                            }
                                            type="button"
                                            className={
                                              rating <=
                                              reviewRating
                                                ? "selected"
                                                : ""
                                            }
                                            onClick={() =>
                                              setReviewRating(
                                                rating
                                              )
                                            }
                                          >
                                            ★
                                          </button>
                                        )
                                      )}

                                    </div>

                                    <span>
                                      {
                                        reviewRating
                                      }
                                      /5
                                    </span>

                                  </div>

                                  <textarea
                                    value={
                                      reviewComment
                                    }
                                    onChange={(e) =>
                                      setReviewComment(
                                        e.target.value
                                      )
                                    }
                                    maxLength={500}
                                    placeholder="Share your experience with this seller..."
                                  />

                                  <span className="review-character-count">
                                    {
                                      reviewComment.length
                                    }{" "}
                                    / 500
                                  </span>

                                  <button
                                    className="submit-review-button"
                                    disabled={
                                      submittingReview
                                    }
                                    onClick={() =>
                                      submitReview(
                                        order
                                      )
                                    }
                                  >
                                    {submittingReview
                                      ? "Submitting..."
                                      : "Submit Review"}
                                  </button>

                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {status ===
                        "Cancelled" && (
                        <p>
                          ❌ This order was
                          cancelled.
                        </p>
                      )}

                    </div>
                  )}

                  {/* ===================================== */}
                  {/* SELLER ACTIONS */}
                  {/* ===================================== */}

                  {isSeller && (
                    <div className="seller-order-actions">

                      <div className="seller-action-heading">

                        <span>
                          🛠️ Seller Controls
                        </span>

                        <small>
                          Update the order as you
                          process it.
                        </small>

                      </div>

                      {/* ACCEPT */}

                      {status ===
                        "Pending" && (
                        <button
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            updateStatus(
                              order.id,
                              "Accepted",
                              order
                            )
                          }
                        >
                          {isUpdating
                            ? "Checking stock..."
                            : "✅ Accept Order"}
                        </button>
                      )}

                      {/* READY */}

                      {status ===
                        "Accepted" && (
                        <button
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            updateStatus(
                              order.id,
                              "Ready",
                              order
                            )
                          }
                        >
                          {isUpdating
                            ? "Updating..."
                            : "📦 Mark Ready"}
                        </button>
                      )}

                      {/* COMPLETE */}

                      {status ===
                        "Ready" && (
                        <button
                          disabled={
                            isUpdating
                          }
                          onClick={() =>
                            updateStatus(
                              order.id,
                              "Completed",
                              order
                            )
                          }
                        >
                          {isUpdating
                            ? "Updating..."
                            : "✅ Complete Order"}
                        </button>
                      )}

                      {/* COMPLETED */}

                      {status ===
                        "Completed" && (
                        <div className="seller-completed-box">

                          <strong>
                            ✅ Order Completed
                          </strong>

                          <span>
                            This order has finished
                            its normal processing
                            cycle.
                          </span>

                        </div>
                      )}

                      {/* ================================= */}
                      {/* SELLER → BUYER REVIEW */}
                      {/* ================================= */}

                      {status ===
                        "Completed" && (
                        <div className="seller-buyer-review-section">

                          {sellerReviewedOrderIds.includes(
                            order.id
                          ) ? (
                            <div className="review-completed-message">
                              ⭐ Buyer rating submitted
                            </div>
                          ) : (
                            <>
                              {activeSellerReviewOrderId !==
                              order.id ? (
                                <button
                                  className="review-order-button"
                                  onClick={() =>
                                    openSellerReview(
                                      order.id
                                    )
                                  }
                                >
                                  ⭐ Rate This Buyer
                                </button>
                              ) : (
                                <div className="review-form">

                                  <div className="review-form-header">

                                    <h3>
                                      Rate this buyer
                                    </h3>

                                    <button
                                      className="close-review-button"
                                      onClick={
                                        closeSellerReview
                                      }
                                    >
                                      ✕
                                    </button>

                                  </div>

                                  <div className="review-rating">

                                    <p>
                                      Buyer rating
                                    </p>

                                    <div className="rating-buttons">

                                      {[1, 2, 3, 4, 5].map(
                                        (rating) => (
                                          <button
                                            key={
                                              rating
                                            }
                                            type="button"
                                            className={
                                              rating <=
                                              sellerReviewRating
                                                ? "selected"
                                                : ""
                                            }
                                            onClick={() =>
                                              setSellerReviewRating(
                                                rating
                                              )
                                            }
                                          >
                                            ★
                                          </button>
                                        )
                                      )}

                                    </div>

                                    <span>
                                      {
                                        sellerReviewRating
                                      }
                                      /5
                                    </span>

                                  </div>

                                  <textarea
                                    value={
                                      sellerReviewComment
                                    }
                                    onChange={(e) =>
                                      setSellerReviewComment(
                                        e.target.value
                                      )
                                    }
                                    maxLength={500}
                                    placeholder="Share your experience with this buyer..."
                                  />

                                  <span className="review-character-count">
                                    {
                                      sellerReviewComment.length
                                    }{" "}
                                    / 500
                                  </span>

                                  <button
                                    className="submit-review-button"
                                    disabled={
                                      submittingSellerReview
                                    }
                                    onClick={() =>
                                      submitSellerReview(
                                        order
                                      )
                                    }
                                  >
                                    {submittingSellerReview
                                      ? "Submitting..."
                                      : "Submit Buyer Rating"}
                                  </button>

                                </div>
                              )}
                            </>
                          )}

                        </div>
                      )}

                      {/* AFFILIATE COMMISSION */}

                      {status ===
                        "Completed" &&
                        order.affiliateCode && (
                          <p className="commission-message">
                            💰{" "}
                            <strong>
                              AgroBaz Affiliate
                              Commission:
                            </strong>{" "}
                            UGX{" "}
                            {Number(
                              order.commission ||
                                0
                            ).toLocaleString()}
                          </p>
                        )}

                    </div>
                  )}

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}

export default Orders;
