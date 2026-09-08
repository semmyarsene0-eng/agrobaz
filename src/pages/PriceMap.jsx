import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "./PriceMap.css";

const API_URL = "http://localhost:5000";

function formatPrice(value) {
  if (!Number.isFinite(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("en-UG").format(
    Number(value)
  );
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Date unavailable";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PriceMap() {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCrop, setSelectedCrop] =
    useState("All");

  const [selectedMarket, setSelectedMarket] =
    useState(null);

  const [search, setSearch] = useState("");

  const [priceType, setPriceType] =
    useState("All");

  // =====================================================
  // LOAD REAL UGANDA MARKET DATA
  // =====================================================

  useEffect(() => {
    async function loadMarketPrices() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/market-prices/uganda`
        );

        let data;

        try {
          data = await response.json();
        } catch {
          throw new Error(
            "The market-price server returned an invalid response."
          );
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to load Uganda market prices."
          );
        }

        const incomingPrices = Array.isArray(
          data.prices
        )
          ? data.prices
          : [];

        setPrices(incomingPrices);
      } catch (err) {
        console.error(
          "❌ Price Map loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load market prices."
        );
      } finally {
        setLoading(false);
      }
    }

    loadMarketPrices();
  }, []);

  // =====================================================
  // CROP OPTIONS
  // =====================================================

  const cropOptions = useMemo(() => {
    const cropSet = new Set();

    prices.forEach((item) => {
      if (item.crop) {
        cropSet.add(item.crop);
      }
    });

    return [
      "All",
      ...[...cropSet].sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [prices]);

  // =====================================================
  // PRICE TYPES
  // =====================================================

  const priceTypes = useMemo(() => {
    const types = new Set();

    prices.forEach((item) => {
      if (item.priceType) {
        types.add(item.priceType);
      }
    });

    return [
      "All",
      ...[...types].sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [prices]);

  // =====================================================
  // FILTER DATA
  // =====================================================

  const filteredPrices = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return prices.filter((item) => {
      const matchesCrop =
        selectedCrop === "All" ||
        item.crop === selectedCrop;

      const matchesPriceType =
        priceType === "All" ||
        item.priceType === priceType;

      const matchesSearch =
        !query ||
        String(item.market || "")
          .toLowerCase()
          .includes(query) ||
        String(item.admin1 || "")
          .toLowerCase()
          .includes(query) ||
        String(item.admin2 || "")
          .toLowerCase()
          .includes(query) ||
        String(item.crop || "")
          .toLowerCase()
          .includes(query);

      return (
        matchesCrop &&
        matchesPriceType &&
        matchesSearch
      );
    });
  }, [
    prices,
    selectedCrop,
    priceType,
    search,
  ]);

  // =====================================================
  // KEEP LATEST RECORD FOR EACH MARKET + CROP
  // =====================================================

  const latestMarketPrices = useMemo(() => {
    const grouped = new Map();

    filteredPrices.forEach((item) => {
      const key = [
        item.marketCode ||
          item.market ||
          "unknown",
        item.commodityCode ||
          item.crop ||
          "unknown",
        item.priceType || "unknown",
      ].join("|");

      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, item);
        return;
      }

      const currentDate = new Date(
        current.date || 0
      ).getTime();

      const nextDate = new Date(
        item.date || 0
      ).getTime();

      if (nextDate > currentDate) {
        grouped.set(key, item);
      }
    });

    return [...grouped.values()];
  }, [filteredPrices]);

  // =====================================================
  // UNIQUE MARKETS
  // =====================================================

  const markets = useMemo(() => {
    const marketMap = new Map();

    latestMarketPrices.forEach((item) => {
      const key =
        item.marketCode ||
        item.market ||
        `${item.latitude}-${item.longitude}`;

      if (!marketMap.has(key)) {
        marketMap.set(key, {
          market: item.market,
          marketCode: item.marketCode,
          region:
            item.admin1 ||
            item.admin2 ||
            "Uganda",
          latitude: item.latitude,
          longitude: item.longitude,
        });
      }
    });

    return [...marketMap.values()];
  }, [latestMarketPrices]);

  // =====================================================
  // SUMMARY
  // =====================================================

  const averagePrice = useMemo(() => {
    const validPrices =
      latestMarketPrices
        .map((item) => Number(item.price))
        .filter((value) =>
          Number.isFinite(value)
        );

    if (!validPrices.length) {
      return null;
    }

    return Math.round(
      validPrices.reduce(
        (sum, value) => sum + value,
        0
      ) / validPrices.length
    );
  }, [latestMarketPrices]);

  const highestPrice = useMemo(() => {
    return latestMarketPrices
      .filter((item) =>
        Number.isFinite(Number(item.price))
      )
      .sort(
        (a, b) =>
          Number(b.price) -
          Number(a.price)
      )[0] || null;
  }, [latestMarketPrices]);

  const lowestPrice = useMemo(() => {
    return latestMarketPrices
      .filter((item) =>
        Number.isFinite(Number(item.price))
      )
      .sort(
        (a, b) =>
          Number(a.price) -
          Number(b.price)
      )[0] || null;
  }, [latestMarketPrices]);

  // =====================================================
  // CREATE / UPDATE LEAFLET MAP
  // =====================================================

  useEffect(() => {
    if (!mapElementRef.current) {
      return;
    }

    if (!mapRef.current) {
      mapRef.current = L.map(
        mapElementRef.current,
        {
          center: [1.3733, 32.2903],
          zoom: 6,
          minZoom: 5,
          maxZoom: 11,
          scrollWheelZoom: true,
        }
      );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; OpenStreetMap contributors',
        }
      ).addTo(mapRef.current);
    }

    markersRef.current.forEach(
      (marker) => marker.remove()
    );

    markersRef.current = [];

    latestMarketPrices.forEach((item) => {
      const lat = Number(item.latitude);
      const lon = Number(item.longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      ) {
        return;
      }

      const marker = L.circleMarker(
        [lat, lon],
        {
          radius: 8,
          weight: 3,
          color: "#ffffff",
          fillColor: "#d7a92d",
          fillOpacity: 1,
        }
      );

      marker.bindPopup(`
        <div style="min-width:180px">
          <strong style="font-size:15px">
            ${item.market || "Market"}
          </strong>

          <div style="margin-top:6px">
            ${item.crop || "Commodity"}
          </div>

          <strong style="display:block;margin-top:5px">
            UGX ${formatPrice(Number(item.price))}
          </strong>

          <div style="margin-top:5px;color:#666;font-size:11px">
            ${item.priceType || "Price"}
          </div>

          <div style="margin-top:5px;color:#666;font-size:11px">
            Updated: ${formatDate(item.date)}
          </div>
        </div>
      `);

      marker.on("click", () => {
        setSelectedMarket(item);
      });

      marker.addTo(mapRef.current);

      markersRef.current.push(marker);
    });

    return () => {};
  }, [latestMarketPrices]);

  // =====================================================
  // SELECTED MARKET EFFECT
  // =====================================================

  useEffect(() => {
    if (!selectedMarket) {
      return;
    }

    const selectedLat =
      Number(selectedMarket.latitude);

    const selectedLon =
      Number(selectedMarket.longitude);

    if (
      !Number.isFinite(selectedLat) ||
      !Number.isFinite(selectedLon) ||
      !mapRef.current
    ) {
      return;
    }

    mapRef.current.setView(
      [selectedLat, selectedLon],
      9,
      {
        animate: true,
      }
    );
  }, [selectedMarket]);

  // =====================================================
  // DESTROY MAP
  // =====================================================

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="price-map-page">
        <main className="price-map-main">
          <div className="price-map-container">
            <div className="price-map-loading">
              <div className="price-loading-spinner"></div>

              <h2>
                Loading Uganda market prices
              </h2>

              <p>
                AgroBaz is retrieving the latest
                available market records.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="price-map-page">
        <main className="price-map-main">
          <div className="price-map-container">
            <div className="price-map-error">
              <div>⚠️</div>

              <h2>
                Market prices unavailable
              </h2>

              <p>{error}</p>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="price-map-page">

      {/* =================================================
          HERO
      ================================================= */}
      <section className="price-map-hero">
        <div className="price-map-container">

          <div className="price-map-hero-content">

            <div>
              <span className="price-map-badge">
                🌾 AGROBAZ MARKET INTELLIGENCE
              </span>

              <h1>
                Uganda{" "}
                <span>Market Prices</span>
              </h1>

              <p>
                Explore agricultural reference
                prices across markets in Uganda.
                Compare locations, commodities,
                price types and update dates.
              </p>
            </div>

            <div className="price-map-hero-stat">
              <span>
                Markets available
              </span>

              <strong>
                {markets.length}
              </strong>

              <small>
                WFP market records
              </small>
            </div>

          </div>

        </div>
      </section>

      {/* =================================================
          MAIN
      ================================================= */}
      <main className="price-map-main">

        <div className="price-map-container">

          {/* FILTERS */}
          <section className="price-map-filters">

            <div className="price-filter-search">
              <span>🔎</span>

              <input
                type="text"
                placeholder="Search market or crop..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <select
              value={selectedCrop}
              onChange={(event) =>
                setSelectedCrop(
                  event.target.value
                )
              }
            >
              {cropOptions.map((crop) => (
                <option
                  key={crop}
                  value={crop}
                >
                  {crop}
                </option>
              ))}
            </select>

            <select
              value={priceType}
              onChange={(event) =>
                setPriceType(
                  event.target.value
                )
              }
            >
              {priceTypes.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type === "All"
                    ? "All price types"
                    : type}
                </option>
              ))}
            </select>

          </section>

          {/* =================================================
              SUMMARY
          ================================================= */}
          <section className="price-summary-grid">

            <div className="price-summary-card">
              <span>Markets</span>

              <strong>
                {markets.length}
              </strong>

              <small>
                Matching your search
              </small>
            </div>

            <div className="price-summary-card">
              <span>Average price</span>

              <strong>
                {averagePrice === null
                  ? "—"
                  : `UGX ${formatPrice(
                      averagePrice
                    )}`}
              </strong>

              <small>
                Selected records
              </small>
            </div>

            <div className="price-summary-card">
              <span>Highest price</span>

              <strong>
                {highestPrice
                  ? `UGX ${formatPrice(
                      Number(
                        highestPrice.price
                      )
                    )}`
                  : "—"}
              </strong>

              <small>
                {highestPrice?.market ||
                  "No data"}
              </small>
            </div>

            <div className="price-summary-card">
              <span>Lowest price</span>

              <strong>
                {lowestPrice
                  ? `UGX ${formatPrice(
                      Number(
                        lowestPrice.price
                      )
                    )}`
                  : "—"}
              </strong>

              <small>
                {lowestPrice?.market ||
                  "No data"}
              </small>
            </div>

          </section>

          {/* =================================================
              MAP + SELECTED MARKET
          ================================================= */}
          <section className="price-map-layout">

            <div className="uganda-map-card">

              <div className="map-card-header">

                <div>
                  <span>
                    UGANDA MARKET COVERAGE
                  </span>

                  <h2>
                    Explore market prices
                  </h2>
                </div>

                <div className="map-status">
                  <span></span>
                  Source connected
                </div>

              </div>

              <div className="real-price-map">
                <div
                  ref={mapElementRef}
                  className="leaflet-map"
                ></div>
              </div>

              <div className="real-map-footer">
                <span>
                  📍 {markets.length} markets
                </span>

                <span>
                  🗓️ Date shown per record
                </span>

                <span>
                  🌾 WFP reference prices
                </span>
              </div>

            </div>

            <aside className="market-detail-panel">

              {selectedMarket ? (
                <>
                  <button
                    type="button"
                    className="close-market"
                    onClick={() =>
                      setSelectedMarket(null)
                    }
                  >
                    ✕
                  </button>

                  <span className="market-detail-label">
                    SELECTED MARKET
                  </span>

                  <h2>
                    {selectedMarket.market ||
                      "Market"}
                  </h2>

                  <p className="market-location">
                    📍{" "}
                    {selectedMarket.admin2 ||
                      selectedMarket.admin1 ||
                      "Uganda"}
                  </p>

                  <div className="market-price-box">
                    <span>
                      {selectedMarket.crop}
                    </span>

                    <strong>
                      UGX{" "}
                      {formatPrice(
                        Number(
                          selectedMarket.price
                        )
                      )}
                    </strong>

                    <small>
                      {selectedMarket.unit ||
                        "unit not specified"}
                    </small>
                  </div>

                  <div className="market-info-row">
                    <span>
                      Price type
                    </span>

                    <strong>
                      {selectedMarket.priceType ||
                        "—"}
                    </strong>
                  </div>

                  <div className="market-info-row">
                    <span>
                      Reference period
                    </span>

                    <strong>
                      {formatDate(
                        selectedMarket.date
                      )}
                    </strong>
                  </div>

                  <div className="market-info-row">
                    <span>
                      Source
                    </span>

                    <strong className="data-status">
                      WFP
                    </strong>
                  </div>

                </>
              ) : (
                <div className="market-empty-state">

                  <div>📍</div>

                  <h3>
                    Select a market
                  </h3>

                  <p>
                    Click a market marker on the
                    map to view its latest available
                    price record.
                  </p>

                </div>
              )}

            </aside>

          </section>

          {/* =================================================
              PRICE TABLE
          ================================================= */}
          <section className="price-table-section">

            <div className="price-section-heading">

              <div>
                <span>
                  MARKET DATA
                </span>

                <h2>
                  Price comparison
                </h2>
              </div>

              <small>
                {latestMarketPrices.length} records
              </small>

            </div>

            <div className="price-table-wrapper">

              <table className="price-table">

                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Region</th>
                    <th>Commodity</th>
                    <th>Price</th>
                    <th>Type</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>

                  {latestMarketPrices
                    .slice(0, 100)
                    .map((item, index) => (
                      <tr
                        key={[
                          item.market,
                          item.crop,
                          item.date,
                          index,
                        ].join("-")}
                      >
                        <td>
                          <strong>
                            {item.market ||
                              "Unknown market"}
                          </strong>

                          <span>
                            {item.admin2 ||
                              item.admin1 ||
                              ""}
                          </span>
                        </td>

                        <td>
                          {item.admin1 ||
                            "Uganda"}
                        </td>

                        <td>
                          <span className="crop-pill">
                            {item.crop ||
                              "Unknown"}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {item.currency ||
                              "UGX"}{" "}
                            {formatPrice(
                              Number(item.price)
                            )}
                          </strong>

                          <span className="table-unit">
                            /{" "}
                            {item.unit ||
                              "unit"}
                          </span>
                        </td>

                        <td>
                          {item.priceType ||
                            "—"}
                        </td>

                        <td>
                          {formatDate(
                            item.date
                          )}
                        </td>
                      </tr>
                    ))}

                </tbody>

              </table>

              {latestMarketPrices.length ===
                0 && (
                <div className="table-empty">
                  No market records match your
                  filters.
                </div>
              )}

            </div>

          </section>

          {/* =================================================
              SOURCE
          ================================================= */}
          <section className="price-source-card">

            <div className="source-icon">
              📊
            </div>

            <div>
              <span>
                DATA SOURCE
              </span>

              <h3>
                World Food Programme
              </h3>

              <p>
                AgroBaz uses the WFP Food Prices
                data series through HDX HAPI for
                market reference information.
                Prices include their reference date,
                price type and unit where supplied
                by the source.
              </p>
            </div>

          </section>

          {/* =================================================
              FARMER TIP
          ================================================= */}
          <section className="price-farmer-tip">

            <div className="tip-icon">
              💡
            </div>

            <div>
              <span>
                FARMER TIP
              </span>

              <h3>
                Compare before you sell
              </h3>

              <p>
                Use market reference prices as a
                guide when comparing opportunities.
                Actual local buying prices can differ
                by quality, quantity, season, location
                and buyer.
              </p>
            </div>

          </section>

          {/* =================================================
              MARKETPLACE CTA
          ================================================= */}
          <section className="price-map-cta">

            <div>
              <span>
                AGROBAZ MARKETPLACE
              </span>

              <h2>
                Ready to buy or sell?
              </h2>

              <p>
                Compare market information and then
                explore actual products listed by
                AgroBaz sellers.
              </p>
            </div>

            <Link
              to="/marketplace"
              className="price-cta-button"
            >
              Explore Marketplace →
            </Link>

          </section>

        </div>

      </main>

    </div>
  );
}

export default PriceMap;
