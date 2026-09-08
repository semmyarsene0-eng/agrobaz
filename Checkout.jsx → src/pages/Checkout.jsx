import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import "./Checkout.css";

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  // ===============================
  // PRODUCT
  // ===============================

  const product = location.state?.product;

  // Affiliate referral code
  const affiliateCode =
    location.state?.affiliateCode || "";

  // ===============================
  // STATE
  // ===============================

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  // ===============================
  // PRODUCT NOT FOUND
  // ===============================

  if (!product) {
    return (
      <div className="checkout-page">

        <div className="checkout-card">

          <h2>
            Product not found 🌾
          </h2>

          <p>
            We couldn't find the product
            you're trying to purchase.
          </p>

          <button
            onClick={() =>
              navigate("/marketplace")
            }
          >
            🛒 Back to Marketplace
          </button>

        </div>

      </div>
    );
  }

  // ===============================
  // PAYMENT
  // ===============================

  async function handlePayment() {
    // Prevent double-clicks
    if (processing) {
      return;
    }

    // Get logged-in user
    const user = auth.currentUser;

    // ===============================
    // LOGIN CHECK
    // ===============================

    if (!user) {
      alert(
        "Please login first 🌾"
      );

      navigate("/login");

      return;
    }

    // ===============================
    // SELLER CHECK
    // ===============================

    if (!product.sellerId) {
      alert(
        "Seller information is missing 🌾"
      );

      return;
    }

    // ===============================
    // PHONE CHECK
    // ===============================

    if (!phone.trim()) {
      alert(
        "Enter your phone number 📱"
      );

      return;
    }

    // ===============================
    // PAYMENT METHOD CHECK
    // ===============================

    if (!paymentMethod) {
      alert(
        "Choose MTN Mobile Money or Airtel Money 💳"
      );

      return;
    }

    // Only allow Uganda payment methods
    if (
      paymentMethod !==
        "MTN Mobile Money" &&
      paymentMethod !==
        "Airtel Money"
    ) {
      alert(
        "Only MTN Mobile Money and Airtel Money are available."
      );

      return;
    }

    try {
      setProcessing(true);

      // ===============================
      // PRODUCT PRICE
      // ===============================

      const price =
        Number(product.price || 0);

      const quantity = 1;

      const totalAmount =
        price * quantity;

      // ===============================
      // CREATE PAYMENT REQUEST
      // ===============================

      const response = await fetch(
        "http://localhost:5000/create-payment",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            amount: totalAmount,

            currency: "UGX",

            email:
              user.email || "",

            phone:
              phone.trim(),

            method:
              paymentMethod,
          }),
        }
      );

      const paymentResult =
        await response.json();

      // ===============================
      // PAYMENT SERVER ERROR
      // ===============================

      if (!response.ok) {
        throw new Error(
          paymentResult.error ||
            "Payment request failed."
        );
      }

      // ===============================
      // PAYMENT ID CHECK
      // ===============================

      if (!paymentResult.paymentId) {
        throw new Error(
          "Payment ID was not returned by the payment server."
        );
      }

      // ===============================
      // AFFILIATE COMMISSION
      // ===============================

      const affiliateCommission =
        affiliateCode
          ? totalAmount * 0.09
          : 0;

      // ===============================
      // AGROBAZ ORDER
      // ===============================

      const orderData = {

        // Product
        productId:
          product.id,

        productName:
          product.name ||
          "Agrobaz Product",

        category:
          product.category ||
          "",

        price:
          price,

        quantity:
          quantity,

        totalAmount:
          totalAmount,

        // Seller
        sellerId:
          product.sellerId,

        sellerEmail:
          product.seller ||
          "",

        // Buyer
        buyerId:
          user.uid,

        buyerEmail:
          user.email ||
          "",

        buyerPhone:
          phone.trim(),

        // =========================
        // PAYMENT
        // =========================

        paymentId:
          paymentResult.paymentId,

        paymentMethod:
          paymentMethod,

        paymentStatus:
          paymentResult.status ||
          "Pending",

        // =========================
        // ORDER
        // =========================

        status:
          "Pending",

        // =========================
        // ESCROW
        // =========================

        escrowStatus:
          "Pending",

        escrowReleasedAt:
          null,

        // =========================
        // AFFILIATE
        // =========================

        affiliateCode:
          affiliateCode ||
          null,

        affiliateCommissionRate:
          affiliateCode
            ? 9
            : 0,

        affiliateCommission:
          affiliateCommission,

        // =========================
        // COMMISSION
        // =========================

        platformCommissionRate:
          3.5,

        platformEarning:
          0,

        // =========================
        // TIMESTAMP
        // =========================

        createdAt:
          serverTimestamp(),
      };

      // ===============================
      // SAVE ORDER TO FIRESTORE
      // ===============================

      const orderRef =
        await addDoc(
          collection(
            db,
            "orders"
          ),
          orderData
        );

      console.log(
        "Agrobaz order created:",
        orderRef.id
      );

      console.log(
        "Payment ID:",
        paymentResult.paymentId
      );

      // ===============================
      // SUCCESS
      // ===============================

      alert(
        "Payment request created successfully 🌾"
      );

      navigate(
        "/order-success",
        {
          state: {
            orderId:
              orderRef.id,

            paymentId:
              paymentResult.paymentId,
          },
        }
      );

    } catch (error) {

      console.error(
        "Checkout error:",
        error
      );

      alert(
        error.message ||
          "Something went wrong during checkout."
      );

    } finally {

      setProcessing(false);

    }
  }

  // ===============================
  // PRICE FORMATTER
  // ===============================

  function formatPrice(price) {
    return Number(
      price || 0
    ).toLocaleString();
  }

  // ===============================
  // PAGE
  // ===============================

  return (
    <div className="checkout-page">

      <h1>
        🌾 Agrobaz Checkout
      </h1>

      <div className="checkout-card">

        {/* =========================
            ORDER SUMMARY
        ========================== */}

        <h2>
          Order Summary
        </h2>

        {/* Product Image */}

        {product.image && (
          <img
            src={product.image}
            alt={
              product.name ||
              "Agrobaz product"
            }
            className="checkout-image"
          />
        )}

        {/* Product Name */}

        <h3>
          {product.name}
        </h3>

        {/* Category */}

        <p>
          <strong>
            Category:
          </strong>{" "}

          {product.category ||
            "Agricultural Product"}
        </p>

        {/* Seller */}

        <p>
          <strong>
            Seller:
          </strong>{" "}

          {product.seller ||
            "Agrobaz Seller"}
        </p>

        {/* Price */}

        <p>
          <strong>
            Price:
          </strong>{" "}

          UGX{" "}
          {formatPrice(
            product.price
          )}
        </p>

        {/* Quantity */}

        <p>
          <strong>
            Quantity:
          </strong>{" "}
          1
        </p>

        {/* Total */}

        <p>
          <strong>
            Total:
          </strong>{" "}

          UGX{" "}
          {formatPrice(
            product.price
          )}
        </p>

        {/* Affiliate */}

        {affiliateCode && (
          <p>
            🔗 Affiliate referral
            applied
          </p>
        )}

        <hr />

        {/* =========================
            BUYER DETAILS
        ========================== */}

        <h2>
          Buyer Details
        </h2>

        {/* Email */}

        <input
          type="email"
          value={
            auth.currentUser?.email ||
            ""
          }
          readOnly
        />

        {/* Phone */}

        <input
          type="tel"
          placeholder="07XXXXXXXX"
          value={phone}
          onChange={(e) =>
            setPhone(
              e.target.value
            )
          }
          disabled={processing}
        />

        <hr />

        {/* =========================
            PAYMENT METHOD
        ========================== */}

        <h2>
          Payment Method 🇺🇬
        </h2>

        <p>
          Choose your Uganda mobile
          money provider.
        </p>

        {/* MTN */}

        <label>
          <input
            type="radio"
            name="payment"
            value="MTN Mobile Money"
            checked={
              paymentMethod ===
              "MTN Mobile Money"
            }
            onChange={(e) =>
              setPaymentMethod(
                e.target.value
              )
            }
            disabled={processing}
          />

          MTN Mobile Money 📱
        </label>

        {/* Airtel */}

        <label>
          <input
            type="radio"
            name="payment"
            value="Airtel Money"
            checked={
              paymentMethod ===
              "Airtel Money"
            }
            onChange={(e) =>
              setPaymentMethod(
                e.target.value
              )
            }
            disabled={processing}
          />

          Airtel Money 📱
        </label>

        {/* =========================
            PAY BUTTON
        ========================== */}

        <button
          onClick={handlePayment}
          disabled={processing}
        >
          {processing
            ? "⏳ Processing..."
            : "🔒 Pay Securely"}
        </button>

      </div>

    </div>
  );
}

export default Checkout;
