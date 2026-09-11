
import { useNavigate } from "react-router-dom";
import "./OrderSuccess.css";

function OrderSuccess() {
  const navigate = useNavigate();

  return (
    <div className="order-success-page">

      <div className="order-success-card">

        <div className="success-icon">
          ✅
        </div>

        <h1>
          Order Successful!
        </h1>

        <p className="success-message">
          Your payment request has been created successfully.
        </p>

        <p>
          🌾 Thank you for shopping with Agrobaz.
        </p>

        <div className="order-status">
          <strong>Order Status</strong>
          <span>Pending</span>
        </div>

        <div className="payment-status">
          <strong>Payment Status</strong>
          <span>Pending</span>
        </div>

        <div className="success-actions">

          <button
            onClick={() =>
              navigate("/orders")
            }
          >
            📦 View My Orders
          </button>

          <button
            onClick={() =>
              navigate("/marketplace")
            }
          >
            🛒 Continue Shopping
          </button>

        </div>

      </div>

    </div>
  );
}

export default OrderSuccess;

