import { Link } from "react-router-dom";
import "./Commission.css";

function Commission() {
  return (
    <div className="commission-page">

      {/* Hero */}

      <section className="commission-hero">

        <h1>💰 Agrobaz Commission</h1>

        <p>
          Simple. Transparent. Fair.
        </p>

      </section>

      {/* How It Works */}

      <section className="commission-section">

        <h2>How Agrobaz Works</h2>

        <div className="flow">

          <div className="flow-card">
            🛒
            <h3>Buyer Places an Order</h3>
          </div>

          <div className="arrow">↓</div>

          <div className="flow-card">
            💳
            <h3>Secure Payment</h3>
          </div>

          <div className="arrow">↓</div>

          <div className="flow-card">
            🌾
            <h3>Agrobaz Processes the Order</h3>
          </div>

          <div className="arrow">↓</div>

          <div className="flow-card">
            💰
            <h3>Commission Deducted</h3>
          </div>

          <div className="arrow">↓</div>

          <div className="flow-card">
            👨‍🌾
            <h3>Seller Receives Payment</h3>
          </div>

        </div>

      </section>

      {/* Example */}

      <section className="commission-section">

        <h2>Commission Example</h2>

        <div className="example-card">

          <p><strong>Product Price:</strong> UGX 1,000,000</p>

          <p><strong>Agrobaz Commission (5%):</strong> UGX 50,000</p>

          <p><strong>Seller Receives:</strong> UGX 950,000</p>

        </div>

      </section>

      {/* Why Commission */}

      <section className="commission-section">

        <h2>Why Agrobaz Charges a Commission</h2>

        <div className="benefits">

          <div>✔ Secure Payments</div>

          <div>✔ Verified Suppliers</div>

          <div>✔ Buyer Protection</div>

          <div>✔ Logistics Support</div>

          <div>✔ Platform Maintenance</div>

          <div>✔ Continuous Improvements</div>

        </div>

      </section>

      {/* CTA */}

      <section className="commission-cta">

        <h2>Grow Your Agricultural Business with Agrobaz</h2>

        <p>
          Join thousands of suppliers connecting with buyers across markets.
        </p>

        <Link to="/register">

          <button>
            Become a Supplier 🌾
          </button>

        </Link>

      </section>

    </div>
  );
}

export default Commission;