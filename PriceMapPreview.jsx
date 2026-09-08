import { Link } from "react-router-dom";
import "./PriceMapPreview.css";

const markets = [
  {
    market: "Kampala",
    crop: "Maize",
    price: "UGX 1,800",
    change: "+4.2%",
    direction: "up",
  },
  {
    market: "Mbale",
    crop: "Beans",
    price: "UGX 4,200",
    change: "+5.4%",
    direction: "up",
  },
  {
    market: "Mbarara",
    crop: "Maize",
    price: "UGX 1,450",
    change: "-2.1%",
    direction: "down",
  },
  {
    market: "Lira",
    crop: "Rice",
    price: "UGX 3,100",
    change: "+2.7%",
    direction: "up",
  },
];

function PriceMapPreview() {
  return (
    <section className="price-preview-section">
      <div className="price-preview-container">

        {/* HEADER */}
        <div className="price-preview-heading">
          <div>
            <span className="price-preview-label">
              🌾 AGROBAZ MARKET INTELLIGENCE
            </span>

            <h2>
              Know the price.
              <span> Sell smarter.</span>
            </h2>

            <p>
              Compare crop prices across Ugandan markets
              and discover where your produce may have
              stronger market opportunities.
            </p>
          </div>

          <Link
            to="/price-map"
            className="price-preview-link"
          >
            Open Price Map →
          </Link>
        </div>

        {/* FEATURE */}
        <div className="price-preview-card">

          {/* MAP AREA */}
          <div className="price-preview-map-area">

            <div className="map-topline">
              <div>
                <span>MARKET COVERAGE</span>
                <h3>Uganda</h3>
              </div>

              <div className="map-live-status">
                <span></span>
                Market view
              </div>
            </div>

            <div className="preview-map">

              <div className="preview-map-shape">
                <div className="preview-region central">
                  CENTRAL
                </div>

                <div className="preview-region eastern">
                  EASTERN
                </div>

                <div className="preview-region western">
                  WESTERN
                </div>

                <div className="preview-region northern">
                  NORTHERN
                </div>

                <div className="preview-marker kampala">
                  <span></span>
                  <small>Kampala</small>
                </div>

                <div className="preview-marker mbale">
                  <span></span>
                  <small>Mbale</small>
                </div>

                <div className="preview-marker mbarara">
                  <span></span>
                  <small>Mbarara</small>
                </div>

                <div className="preview-marker gulu">
                  <span></span>
                  <small>Gulu</small>
                </div>

                <div className="preview-marker lira">
                  <span></span>
                  <small>Lira</small>
                </div>
              </div>

            </div>

            <div className="preview-map-footer">
              <span>
                📍 Markets across Uganda
              </span>

              <span>
                📊 Compare prices by crop
              </span>
            </div>
          </div>

          {/* PRICE LIST */}
          <div className="price-preview-markets">

            <div className="preview-list-header">
              <div>
                <span>MARKET SNAPSHOT</span>
                <h3>Today's highlights</h3>
              </div>

              <span className="sample-badge">
                SAMPLE
              </span>
            </div>

            <div className="preview-market-list">

              {markets.map((item) => (
                <div
                  className="preview-market-row"
                  key={`${item.market}-${item.crop}`}
                >
                  <div className="preview-market-info">
                    <strong>{item.market}</strong>

                    <span>
                      {item.crop}
                    </span>
                  </div>

                  <div className="preview-market-price">
                    <strong>
                      {item.price}
                    </strong>

                    <span
                      className={`preview-price-change ${item.direction}`}
                    >
                      {item.direction === "up"
                        ? "↗"
                        : "↘"}{" "}
                      {item.change}
                    </span>
                  </div>
                </div>
              ))}

            </div>

            <Link
              to="/price-map"
              className="preview-view-all"
            >
              Compare all markets
              <span>→</span>
            </Link>

          </div>
        </div>

        {/* BOTTOM BENEFITS */}
        <div className="price-preview-benefits">

          <div>
            <span>📍</span>
            <div>
              <strong>
                Compare locations
              </strong>
              <p>
                See how prices differ between markets.
              </p>
            </div>
          </div>

          <div>
            <span>🌽</span>
            <div>
              <strong>
                Track crops
              </strong>
              <p>
                Follow important agricultural products.
              </p>
            </div>
          </div>

          <div>
            <span>💡</span>
            <div>
              <strong>
                Make better decisions
              </strong>
              <p>
                Use market information before selling.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

export default PriceMapPreview;