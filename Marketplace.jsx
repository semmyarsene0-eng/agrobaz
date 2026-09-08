
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

import "./Marketplace.css";
import PriceMapPreview from "../components/PriceMapPreview";

function Marketplace() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [sellerRatings, setSellerRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search + filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const categories = [
    "All",
    "Fresh Crops",
    "Seeds & Seedlings",
    "Fertilizers & Inputs",
    "Machinery & Tools",
    "Livestock",
    "Other",
  ];

  // =================================
  // LOAD PRODUCTS + SELLER RATINGS
  // =================================
  useEffect(() => {
    async function loadMarketplace() {
      try {
        setLoading(true);
        setError("");

        const productsQuery = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );

        const reviewsQuery = collection(db, "reviews");

        const [productsSnapshot, reviewsSnapshot] =
          await Promise.all([
            getDocs(productsQuery),
            getDocs(reviewsQuery),
          ]);

        // -------------------------------
        // PRODUCTS
        // -------------------------------
        const loadedProducts = productsSnapshot.docs.map(
          (productDoc) => {
            const data = productDoc.data();

            return {
              id: productDoc.id,

              name:
                data.name ||
                "Unnamed Product",

              price:
                Number(data.price) || 0,

              quantity:
                data.quantity !== undefined &&
                data.quantity !== null
                  ? Number(data.quantity)
                  : null,

              location:
                data.location || "Uganda",

              category:
                data.category ||
                "Agricultural Product",

              description:
                data.description ||
                "No product description available.",

              image:
                data.image || "",

              seller:
                data.seller ||
                data.sellerBusinessName ||
                "AgroBaz Seller",

              sellerId:
                data.sellerId || "",

              sellerEmail:
                data.sellerEmail || "",

              sellerBusinessName:
                data.sellerBusinessName || "",

              whatsapp:
                data.whatsapp || "",

              verificationStatus:
                data.verificationStatus ||
                "pending",

              status:
                data.status || "active",

              createdAt:
                data.createdAt || null,
            };
          }
        );

        // -------------------------------
        // SELLER RATINGS
        // -------------------------------
        const ratingTotals = {};

        reviewsSnapshot.docs.forEach(
          (reviewDoc) => {
            const review = reviewDoc.data();

            // Only count reviews ABOUT sellers.
            const isSellerReview =
              review.reviewedRole === "seller" ||
              review.reviewerRole === "buyer" ||
              (
                !review.reviewedRole &&
                !review.reviewerRole
              );

            if (!isSellerReview) {
              return;
            }

            const sellerId =
              review.reviewedUserId ||
              review.sellerId;

            const rating =
              Number(review.rating);

            if (
              !sellerId ||
              !Number.isFinite(rating) ||
              rating < 1 ||
              rating > 5
            ) {
              return;
            }

            if (!ratingTotals[sellerId]) {
              ratingTotals[sellerId] = {
                total: 0,
                count: 0,
              };
            }

            ratingTotals[sellerId].total += rating;
            ratingTotals[sellerId].count += 1;
          }
        );

        const calculatedRatings = {};

        Object.entries(ratingTotals).forEach(
          ([sellerId, data]) => {
            calculatedRatings[sellerId] = {
              average:
                data.count > 0
                  ? data.total / data.count
                  : 0,

              count:
                data.count,
            };
          }
        );

        setProducts(loadedProducts);
        setSellerRatings(calculatedRatings);
      } catch (err) {
        console.error(
          "Marketplace loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load marketplace products."
        );
      } finally {
        setLoading(false);
      }
    }

    loadMarketplace();
  }, []);

  // =================================
  // LOCATIONS
  // =================================
  const locations = useMemo(() => {
    const uniqueLocations = [
      ...new Set(
        products
          .map((product) => product.location)
          .filter(Boolean)
      ),
    ];

    return [
      "All",
      ...uniqueLocations.sort(),
    ];
  }, [products]);

  // =================================
  // SEARCH NORMALIZATION
  // =================================
  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ");
  }

  // =================================
  // AGRICULTURAL SEARCH ALIASES
  // =================================
  const searchAliases = {
    maize: [
      "maize",
      "corn",
      "maize grain",
      "corn grain",
    ],

    corn: [
      "maize",
      "corn",
      "maize grain",
      "corn grain",
    ],

    beans: [
      "beans",
      "bean",
      "legumes",
    ],

    fertilizer: [
      "fertilizer",
      "fertiliser",
      "manure",
      "farm input",
      "inputs",
    ],

    fertiliser: [
      "fertilizer",
      "fertiliser",
      "manure",
      "farm input",
      "inputs",
    ],

    seed: [
      "seed",
      "seeds",
      "seedling",
      "seedlings",
    ],

    seeds: [
      "seed",
      "seeds",
      "seedling",
      "seedlings",
    ],

    seedlings: [
      "seedling",
      "seedlings",
      "seed",
      "seeds",
    ],

    cassava: [
      "cassava",
      "manioc",
      "yucca",
    ],

    potato: [
      "potato",
      "potatoes",
    ],

    potatoes: [
      "potato",
      "potatoes",
    ],

    tools: [
      "tools",
      "farm tools",
      "farming tools",
      "equipment",
      "machinery",
    ],

    machinery: [
      "machinery",
      "machine",
      "equipment",
      "farm equipment",
      "tools",
    ],

    vegetables: [
      "vegetables",
      "vegetable",
      "greens",
      "crops",
    ],

    vegetable: [
      "vegetables",
      "vegetable",
      "greens",
      "crops",
    ],

    livestock: [
      "livestock",
      "animals",
      "cattle",
      "goats",
      "sheep",
      "pigs",
      "poultry",
      "chicken",
    ],

    chicken: [
      "chicken",
      "poultry",
      "hen",
      "broiler",
      "layers",
    ],

    cattle: [
      "cattle",
      "cow",
      "cows",
      "bull",
      "livestock",
    ],

    farming: [
      "farming",
      "agriculture",
      "agricultural",
      "farm",
    ],
  };

  // =================================
  // PARSE NATURAL LANGUAGE SEARCH
  // =================================
  function parseSearchQuery(search) {
    const normalized = normalizeText(search);

    let remainingText = normalized;

    let minPrice = null;
    let maxPrice = null;

    let detectedLocation = "";
    let cheapSearch = false;

    // PRICE: UNDER / BELOW / LESS THAN
    const maxPriceMatch = normalized.match(
      /\b(?:under|below|less than|max|maximum|up to)\s+(?:ugx\s*)?([\d,]+(?:\.\d+)?)\b/
    );

    if (maxPriceMatch) {
      maxPrice = Number(
        maxPriceMatch[1].replace(/,/g, "")
      );

      remainingText = remainingText.replace(
        maxPriceMatch[0],
        " "
      );
    }

    // PRICE: OVER / ABOVE / MORE THAN
    const minPriceMatch = normalized.match(
      /\b(?:over|above|more than|min|minimum)\s+(?:ugx\s*)?([\d,]+(?:\.\d+)?)\b/
    );

    if (minPriceMatch) {
      minPrice = Number(
        minPriceMatch[1].replace(/,/g, "")
      );

      remainingText = remainingText.replace(
        minPriceMatch[0],
        " "
      );
    }

    // CHEAP
    if (/\bcheap\b/.test(normalized)) {
      cheapSearch = true;

      remainingText = remainingText.replace(
        /\bcheap\b/g,
        " "
      );
    }

    // LOCATION
    const normalizedLocations = locations
      .filter(
        (location) =>
          location &&
          location !== "All"
      )
      .map((location) => ({
        original: location,
        normalized: normalizeText(location),
      }))
      .sort(
        (a, b) =>
          b.normalized.length -
          a.normalized.length
      );

    for (const location of normalizedLocations) {
      const escapedLocation =
        location.normalized.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const locationRegex = new RegExp(
        `\\b(?:in|at|near)\\s+${escapedLocation}\\b`,
        "i"
      );

      if (
        locationRegex.test(
          remainingText
        )
      ) {
        detectedLocation =
          location.original;

        remainingText =
          remainingText.replace(
            locationRegex,
            " "
          );

        break;
      }
    }

    // FALLBACK LOCATION
    if (!detectedLocation) {
      const locationMatch =
        remainingText.match(
          /\b(?:in|at|near)\s+([a-z][a-z\s-]*)$/i
        );

      if (locationMatch) {
        const possibleLocation =
          normalizeText(
            locationMatch[1]
          );

        const matchedLocation =
          normalizedLocations.find(
            (location) =>
              location.normalized ===
              possibleLocation
          );

        if (matchedLocation) {
          detectedLocation =
            matchedLocation.original;

          remainingText =
            remainingText.replace(
              locationMatch[0],
              " "
            );
        }
      }
    }

    remainingText =
      remainingText
        .replace(
          /\b(?:in|at|near)\b/g,
          " "
        )
        .replace(/\s+/g, " ")
        .trim();

    return {
      original: normalized,
      keywordSearch: remainingText,
      minPrice:
        Number.isFinite(minPrice)
          ? minPrice
          : null,
      maxPrice:
        Number.isFinite(maxPrice)
          ? maxPrice
          : null,
      location:
        detectedLocation,
      cheapSearch,
    };
  }

  // =================================
  // GET SEARCH TERMS
  // =================================
  function getSearchTerms(search) {
    const words = normalizeText(search)
      .split(" ")
      .filter(Boolean);

    const expandedTerms = new Set(words);

    words.forEach((word) => {
      const aliases =
        searchAliases[word] || [];

      aliases.forEach((alias) => {
        expandedTerms.add(
          normalizeText(alias)
        );
      });
    });

    return {
      originalWords: words,
      expandedTerms: [...expandedTerms],
    };
  }

  // =================================
  // SEARCH SCORE
  // =================================
  function getSearchScore(product, search) {
    if (!search) {
      return 0;
    }

    const normalizedName =
      normalizeText(product.name);

    const normalizedDescription =
      normalizeText(product.description);

    const normalizedCategory =
      normalizeText(product.category);

    const normalizedLocation =
      normalizeText(product.location);

    const normalizedSeller =
      normalizeText(
        `${product.seller} ${product.sellerBusinessName}`
      );

    const searchableText = [
      normalizedName,
      normalizedDescription,
      normalizedCategory,
      normalizedLocation,
      normalizedSeller,
    ].join(" ");

    const {
      originalWords,
      expandedTerms,
    } = getSearchTerms(search);

    let score = 0;

    if (normalizedName === search) {
      score += 100;
    }

    if (normalizedName.startsWith(search)) {
      score += 80;
    }

    if (normalizedName.includes(search)) {
      score += 60;
    }

    if (normalizedCategory === search) {
      score += 50;
    }

    if (normalizedLocation === search) {
      score += 45;
    }

    if (normalizedSeller.includes(search)) {
      score += 35;
    }

    originalWords.forEach((word) => {
      if (!word) return;

      if (normalizedName.includes(word)) {
        score += 30;
      }

      if (normalizedCategory.includes(word)) {
        score += 20;
      }

      if (normalizedLocation.includes(word)) {
        score += 18;
      }

      if (normalizedSeller.includes(word)) {
        score += 15;
      }

      if (normalizedDescription.includes(word)) {
        score += 8;
      }
    });

    expandedTerms.forEach((term) => {
      if (
        !term ||
        originalWords.includes(term)
      ) {
        return;
      }

      if (normalizedName.includes(term)) {
        score += 24;
      }

      if (normalizedCategory.includes(term)) {
        score += 18;
      }

      if (normalizedDescription.includes(term)) {
        score += 7;
      }
    });

    const everyWordMatches =
      originalWords.length > 0 &&
      originalWords.every((word) =>
        searchableText.includes(word)
      );

    if (everyWordMatches) {
      score += 40;
    }

    return score;
  }

  // =================================
  // PARSED SEARCH
  // =================================
  const parsedSearch = useMemo(() => {
    return parseSearchQuery(searchTerm);
  }, [searchTerm, locations]);

  // =================================
  // SEARCH SUGGESTIONS
  // =================================
  const searchSuggestions = useMemo(() => {
    const search =
      normalizeText(searchTerm);

    if (!search) {
      return [];
    }

    const suggestions = new Set();

    products.forEach((product) => {
      const values = [
        product.name,
        product.category,
        product.location,
        product.sellerBusinessName,
      ];

      values.forEach((value) => {
        if (!value) return;

        const normalized =
          normalizeText(value);

        if (
          normalized.includes(search)
        ) {
          suggestions.add(value);
        }
      });
    });

    if (
      /^(maize|corn)/.test(search)
    ) {
      locations
        .filter(
          (location) =>
            location !== "All"
        )
        .slice(0, 3)
        .forEach((location) => {
          suggestions.add(
            `maize in ${location}`
          );
        });
    }

    if (
      /^(seed|seeds)/.test(search)
    ) {
      locations
        .filter(
          (location) =>
            location !== "All"
        )
        .slice(0, 3)
        .forEach((location) => {
          suggestions.add(
            `seeds in ${location}`
          );
        });
    }

    return [...suggestions].slice(0, 6);
  }, [
    searchTerm,
    products,
    locations,
  ]);

  // =================================
  // FILTER + SMART SEARCH + SORT
  // =================================
  const filteredProducts = useMemo(() => {
    const search =
      parsedSearch.keywordSearch;

    const filtered = products
      .filter((product) => {
        const matchesCategory =
          selectedCategory === "All" ||
          product.category ===
            selectedCategory;

        const matchesSelectedLocation =
          selectedLocation === "All" ||
          product.location ===
            selectedLocation;

        const matchesSearchLocation =
          !parsedSearch.location ||
          normalizeText(
            product.location
          ) ===
            normalizeText(
              parsedSearch.location
            );

        const matchesMinPrice =
          parsedSearch.minPrice === null ||
          product.price >=
            parsedSearch.minPrice;

        const matchesMaxPrice =
          parsedSearch.maxPrice === null ||
          product.price <=
            parsedSearch.maxPrice;

        const matchesStatus =
          product.status !== "inactive";

        if (
          !matchesCategory ||
          !matchesSelectedLocation ||
          !matchesSearchLocation ||
          !matchesMinPrice ||
          !matchesMaxPrice ||
          !matchesStatus
        ) {
          return false;
        }

        if (!search) {
          return true;
        }

        return (
          getSearchScore(
            product,
            search
          ) > 0
        );
      })
      .map((product) => ({
        ...product,
        searchScore: search
          ? getSearchScore(
              product,
              search
            )
          : 0,
      }));

    return filtered.sort((a, b) => {
      // Search relevance
      if (search) {
        if (
          b.searchScore !==
          a.searchScore
        ) {
          return (
            b.searchScore -
            a.searchScore
          );
        }
      }

      // Cheap search
      if (
        parsedSearch.cheapSearch
      ) {
        if (a.price !== b.price) {
          return a.price - b.price;
        }
      }

      // Manual sort
      if (sortBy === "price-low") {
        return a.price - b.price;
      }

      if (sortBy === "price-high") {
        return b.price - a.price;
      }

      if (sortBy === "name") {
        return a.name.localeCompare(
          b.name
        );
      }

      // Newest
      const aTime =
        a.createdAt?.toMillis?.() ||
        0;

      const bTime =
        b.createdAt?.toMillis?.() ||
        0;

      return bTime - aTime;
    });
  }, [
    products,
    searchTerm,
    parsedSearch,
    selectedCategory,
    selectedLocation,
    sortBy,
  ]);

  // =================================
  // SEARCH SUGGESTION CLICK
  // =================================
  function selectSearchSuggestion(
    suggestion
  ) {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  }

  // =================================
  // OPEN PRODUCT
  // =================================
  function openProduct(product) {
    if (!product?.id) {
      alert("Product ID is missing.");
      return;
    }

    navigate(
      `/product/${product.id}`
    );
  }

  // =================================
  // OPEN SELLER PROFILE
  // =================================
  function openSellerProfile(
    event,
    sellerId
  ) {
    event.stopPropagation();

    if (!sellerId) {
      return;
    }

    navigate(
      `/seller/${sellerId}`
    );
  }

  // =================================
  // BUY PRODUCT
  // =================================
  function buyProduct(product) {
    if (!product?.id) {
      alert(
        "Product information is incomplete."
      );
      return;
    }

    if (
      product.quantity !== null &&
      product.quantity <= 0
    ) {
      alert(
        "This product is currently out of stock."
      );
      return;
    }

    navigate("/checkout", {
      state: {
        product,
      },
    });
  }

  // =================================
  // STOCK STATUS
  // =================================
  function getStockStatus(product) {
    if (product.quantity === null) {
      return {
        label: "Available",
        className:
          "stock-available",
      };
    }

    if (product.quantity <= 0) {
      return {
        label: "Out of Stock",
        className:
          "stock-out",
      };
    }

    if (product.quantity <= 5) {
      return {
        label:
          `Only ${product.quantity} left`,
        className:
          "stock-low",
      };
    }

    return {
      label:
        `${product.quantity} available`,
      className:
        "stock-available",
    };
  }

  // =================================
  // SELLER RATING
  // =================================
  function getSellerRating(
    sellerId
  ) {
    if (!sellerId) {
      return {
        average: 0,
        count: 0,
      };
    }

    return (
      sellerRatings[sellerId] || {
        average: 0,
        count: 0,
      }
    );
  }

  function renderStars(rating) {
    if (!rating) {
      return "☆☆☆☆☆";
    }

    const roundedRating =
      Math.max(
        0,
        Math.min(
          5,
          Math.round(rating)
        )
      );

    return (
      "★".repeat(roundedRating) +
      "☆".repeat(
        5 - roundedRating
      )
    );
  }

  // =================================
  // CLEAR FILTERS
  // =================================
  function clearFilters() {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedLocation("All");
    setSortBy("newest");
    setShowSuggestions(false);
  }

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedLocation !== "All" ||
    sortBy !== "newest";

  const hasDetectedSearchFilters =
    parsedSearch.location ||
    parsedSearch.minPrice !== null ||
    parsedSearch.maxPrice !== null ||
    parsedSearch.cheapSearch;

  // =================================
  // LOADING
  // =================================
  if (loading) {
    return (
      <div className="marketplace-page">
        <div className="marketplace-loading">
          <div className="marketplace-spinner"></div>

          <h2>
            Loading AgroBaz Marketplace
          </h2>

          <p>
            Please wait while we load
            the latest agricultural
            products.
          </p>
        </div>
      </div>
    );
  }

  // =================================
  // ERROR
  // =================================
  if (error) {
    return (
      <div className="marketplace-page">
        <div className="marketplace-error">
          <div className="error-icon">
            ⚠️
          </div>

          <h2>
            Unable to load marketplace
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
    );
  }

  return (
    <div className="marketplace-page">

      {/* =================================
          HERO
      ================================= */}
      <section className="marketplace-header">
        <div className="marketplace-container">

          <div className="marketplace-eyebrow">
            🌾 AGROBAZ MARKET
          </div>

          <h1>
            Find Agricultural Products
            <span>
              {" "}You Can Trust
            </span>
          </h1>

          <p>
            Discover fresh crops, quality
            seeds, farming inputs, machinery
            and more from sellers on AgroBaz.
          </p>

          {/* SEARCH */}
          <div className="marketplace-search-wrapper">

            <div className="marketplace-search">
              <span className="search-icon">
                🔎
              </span>

              <input
                type="text"
                placeholder="Try: maize in Kampala under 10000"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(
                    e.target.value
                  );

                  setShowSuggestions(true);
                }}
                onFocus={() =>
                  setShowSuggestions(true)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setShowSuggestions(false);
                  }

                  if (
                    e.key === "Escape"
                  ) {
                    setShowSuggestions(false);
                  }
                }}
                aria-label="Search agricultural products"
                autoComplete="off"
              />

              {searchTerm && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => {
                    setSearchTerm("");
                    setShowSuggestions(false);
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* SEARCH SUGGESTIONS */}
            {showSuggestions &&
              searchTerm.trim() !== "" &&
              searchSuggestions.length > 0 && (
                <div className="search-suggestions">

                  <div className="search-suggestions-title">
                    Suggestions
                  </div>

                  {searchSuggestions.map(
                    (suggestion, index) => (
                      <button
                        type="button"
                        key={`${suggestion}-${index}`}
                        className="search-suggestion"
                        onMouseDown={(e) =>
                          e.preventDefault()
                        }
                        onClick={() =>
                          selectSearchSuggestion(
                            suggestion
                          )
                        }
                      >
                        <span>
                          🔎
                        </span>

                        <strong>
                          {suggestion}
                        </strong>
                      </button>
                    )
                  )}

                </div>
              )}

          </div>

          {/* SEARCH STATUS */}
          {searchTerm.trim() !== "" && (
            <div className="search-status">
              Searching for{" "}
              <strong>
                "{searchTerm.trim()}"
              </strong>
            </div>
          )}

          {/* DETECTED SEARCH FILTERS */}
          {hasDetectedSearchFilters && (
            <div className="detected-search-filters">

              <span className="detected-filter-title">
                Smart filters:
              </span>

              {parsedSearch.location && (
                <span className="detected-filter">
                  📍 {parsedSearch.location}
                </span>
              )}

              {parsedSearch.minPrice !== null && (
                <span className="detected-filter">
                  💰 From UGX{" "}
                  {parsedSearch.minPrice.toLocaleString()}
                </span>
              )}

              {parsedSearch.maxPrice !== null && (
                <span className="detected-filter">
                  💰 Up to UGX{" "}
                  {parsedSearch.maxPrice.toLocaleString()}
                </span>
              )}

              {parsedSearch.cheapSearch && (
                <span className="detected-filter">
                  💸 Cheapest first
                </span>
              )}

            </div>
          )}

          {/* CATEGORIES */}
          <div className="marketplace-categories">
            {categories.map(
              (category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    selectedCategory ===
                    category
                      ? "category-button active"
                      : "category-button"
                  }
                  onClick={() =>
                    setSelectedCategory(
                      category
                    )
                  }
                >
                  {category}
                </button>
              )
            )}
          </div>

        </div>
      </section>

      {/* =================================
          MAIN
      ================================= */}
      <main className="marketplace-container marketplace-main">

        {/* MARKET PRICE MAP */}
        <PriceMapPreview />

        {/* FILTER BAR */}
        <section className="marketplace-filter-bar">

          <div className="filter-group">
            <label htmlFor="location-filter">
              📍 Location
            </label>

            <select
              id="location-filter"
              value={selectedLocation}
              onChange={(e) =>
                setSelectedLocation(
                  e.target.value
                )
              }
            >
              {locations.map(
                (location) => (
                  <option
                    key={location}
                    value={location}
                  >
                    {location}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-products">
              ↕ Sort by
            </label>

            <select
              id="sort-products"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value
                )
              }
            >
              <option value="newest">
                Newest
              </option>

              <option value="price-low">
                Price: Low to High
              </option>

              <option value="price-high">
                Price: High to Low
              </option>

              <option value="name">
                Name: A to Z
              </option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filters-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}

        </section>

        {/* RESULTS HEADER */}
        <div className="marketplace-results-header">

          <div>
            <span className="results-eyebrow">
              MARKETPLACE
            </span>

            <h2>
              {searchTerm.trim()
                ? "Search Results"
                : "Agricultural Products"}
            </h2>

            <p>
              Showing{" "}
              <strong>
                {filteredProducts.length}
              </strong>{" "}
              product
              {filteredProducts.length !==
              1
                ? "s"
                : ""}
            </p>
          </div>

          <div className="marketplace-result-count">
            <strong>
              {filteredProducts.length}
            </strong>

            <span>
              Results
            </span>
          </div>

        </div>

        {/* NO PRODUCTS */}
        {filteredProducts.length ===
        0 ? (
          <div className="no-products">

            <div className="no-products-icon">
              🔎
            </div>

            <h3>
              No products found
            </h3>

            <p>
              We couldn't find products
              matching your search and
              filters.
            </p>

            {searchTerm.trim() && (
              <p className="search-help-text">
                Try searches like
                "maize in Kampala",
                "seeds under 20000",
                or "cheap tools".
              </p>
            )}

            <button
              type="button"
              onClick={clearFilters}
            >
              View All Products
            </button>

          </div>
        ) : (

          /* PRODUCTS */
          <div className="products-grid">

            {filteredProducts.map(
              (product) => {
                const stock =
                  getStockStatus(
                    product
                  );

                const isOutOfStock =
                  product.quantity !==
                    null &&
                  product.quantity <= 0;

                const rating =
                  getSellerRating(
                    product.sellerId
                  );

                return (
                  <article
                    className="product-card"
                    key={product.id}
                  >

                    {/* IMAGE */}
                    <div
                      className="product-image-wrapper"
                      onClick={() =>
                        openProduct(
                          product
                        )
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (
                          e.key ===
                            "Enter" ||
                          e.key === " "
                        ) {
                          e.preventDefault();

                          openProduct(
                            product
                          );
                        }
                      }}
                    >

                      {product.image ? (
                        <img
                          src={
                            product.image
                          }
                          alt={
                            product.name
                          }
                          className="product-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="no-product-image">
                          <span>🌾</span>

                          <small>
                            No Image
                          </small>
                        </div>
                      )}

                      <span className="product-image-category">
                        {product.category}
                      </span>

                      {product.verificationStatus ===
                        "verified" && (
                        <span className="verified-badge">
                          ✓ Verified
                        </span>
                      )}

                      {isOutOfStock && (
                        <div className="out-of-stock-overlay">
                          Out of Stock
                        </div>
                      )}

                    </div>

                    {/* CONTENT */}
                    <div className="product-card-content">

                      <div className="product-card-top">

                        <p className="product-category">
                          {product.category}
                        </p>

                        <span
                          className={`stock-badge ${stock.className}`}
                        >
                          {stock.label}
                        </span>

                      </div>

                      <h3
                        className="product-name"
                        title={product.name}
                      >
                        {product.name}
                      </h3>

                      <p className="product-description">
                        {
                          product.description
                        }
                      </p>

                      <div className="product-price">
                        <span>
                          UGX
                        </span>

                        {product.price.toLocaleString()}
                      </div>

                      {/* SELLER TRUST */}
                      <div className="seller-trust-box">

                        <div className="seller-heading">
                          <span>
                            👨‍🌾 Seller
                          </span>

                          {product.verificationStatus ===
                            "verified" && (
                            <span className="seller-verified-small">
                              ✓ Verified
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="seller-profile-link"
                          onClick={(event) =>
                            openSellerProfile(
                              event,
                              product.sellerId
                            )
                          }
                          disabled={
                            !product.sellerId
                          }
                        >
                          {product.sellerBusinessName ||
                            product.seller}
                        </button>

                        {rating.count >
                        0 ? (
                          <div className="seller-rating">

                            <span className="rating-stars">
                              {renderStars(
                                rating.average
                              )}
                            </span>

                            <strong>
                              {rating.average.toFixed(
                                1
                              )}
                            </strong>

                            <span className="rating-count">
                              (
                              {
                                rating.count
                              }{" "}
                              review
                              {rating.count !==
                              1
                                ? "s"
                                : ""}
                              )
                            </span>

                          </div>
                        ) : (
                          <div className="no-rating">
                            No reviews yet
                          </div>
                        )}

                      </div>

                      {/* META */}
                      <div className="product-meta">

                        <p className="product-location">
                          📍{" "}
                          {
                            product.location
                          }
                        </p>

                      </div>

                      {product.verificationStatus ===
                        "verified" && (
                        <div className="verified-seller-text">
                          ✓ Verified AgroBaz
                          Seller
                        </div>
                      )}

                      {/* ACTIONS */}
                      <div className="product-actions">

                        <button
                          type="button"
                          className="view-details-button"
                          onClick={() =>
                            openProduct(
                              product
                            )
                          }
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          className="buy-product-button"
                          onClick={() =>
                            buyProduct(
                              product
                            )
                          }
                          disabled={
                            isOutOfStock
                          }
                        >
                          {isOutOfStock
                            ? "Out of Stock"
                            : "Buy Now"}
                        </button>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </main>
    </div>
  );
}

export default Marketplace;
