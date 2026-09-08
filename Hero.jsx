import { Link } from "react-router-dom";
import "./Hero.css";

function Hero() {
  return (
    <section className="hero">

      <div className="hero-content">

        <p className="hero-tag">
          🌱 AFRICA'S AGRICULTURAL MARKETPLACE
        </p>

        <h1>
          Grow Your Business.
          <br />
          Trade Without Limits. 🌾
        </h1>

        <p className="hero-description">
          Connect farmers, suppliers and buyers through
          Agrobaz — a modern marketplace for agricultural
          products.
        </p>

        <div className="hero-buttons">

          <Link
            to="/marketplace"
            className="hero-btn primary"
          >
            🛒 Explore Marketplace
          </Link>

          <Link
            to="/affiliate-dashboard"
            className="hero-btn affiliate"
          >
            🔗 Join Affiliate Program
          </Link>

        </div>

        <div className="hero-stats">

          <div>
            <strong>5K+</strong>
            <span>Products</span>
          </div>

          <div>
            <strong>1K+</strong>
            <span>Suppliers</span>
          </div>

          <div>
            <strong>9%</strong>
            <span>Affiliate Commission</span>
          </div>

        </div>

      </div>

    </section>
  );
}

export default Hero;