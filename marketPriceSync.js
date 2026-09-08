/* global process */

import crypto from "crypto";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// ==================================================
// FIREBASE ADMIN
// ==================================================

const firebaseApp = initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore(firebaseApp);

// ==================================================
// ENVIRONMENT
// ==================================================

const HAPI_APP_IDENTIFIER =
  process.env.HAPI_APP_IDENTIFIER?.trim();

const SYNC_DAYS =
  Number(process.env.MARKET_PRICE_SYNC_DAYS) || 7;

const HAPI_BASE_URL =
  "https://hapi.humdata.org/api/v2/food-security-nutrition-poverty/food-prices-market-monitor";

const SOURCE_NAME =
  "World Food Programme";

const DATASET_NAME =
  "WFP Food Prices data series";

// ==================================================
// CREATE STABLE DOCUMENT ID
// ==================================================

function createDocumentId(item) {
  const rawKey = [
    item.location_code || "UGA",
    item.market_code || item.market_name || "",
    item.commodity_code ||
      item.commodity_name ||
      "",
    item.price_type || "",
    item.reference_period_start || "",
    item.reference_period_end || "",
    item.unit || "",
    item.currency_code || "",
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(rawKey)
    .digest("hex");
}

// ==================================================
// FETCH ONE PAGE
// ==================================================

async function fetchPricePage(
  offset,
  limit
) {
  const params = new URLSearchParams();

  params.set(
    "output_format",
    "json"
  );

  params.set(
    "location_code",
    "UGA"
  );

  params.set(
    "offset",
    String(offset)
  );

  params.set(
    "limit",
    String(limit)
  );

  params.set(
    "app_identifier",
    HAPI_APP_IDENTIFIER
  );

  const url =
    `${HAPI_BASE_URL}?${params.toString()}`;

  const response =
    await fetch(url);

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `HAPI request failed with ${response.status}: ${errorText}`
    );
  }

  const payload =
    await response.json();

  return Array.isArray(payload.data)
    ? payload.data
    : [];
}

// ==================================================
// FETCH ALL UGANDA DATA
// ==================================================

async function fetchAllUgandaPrices() {
  if (!HAPI_APP_IDENTIFIER) {
    throw new Error(
      "HAPI_APP_IDENTIFIER is missing from .env"
    );
  }

  const limit = 10000;

  let offset = 0;

  const allRows = [];

  while (true) {
    console.log(
      `📥 Fetching Uganda market prices: offset ${offset}`
    );

    const rows =
      await fetchPricePage(
        offset,
        limit
      );

    console.log(
      `   Received ${rows.length} records`
    );

    allRows.push(...rows);

    if (rows.length < limit) {
      break;
    }

    offset += limit;
  }

  return allRows;
}

// ==================================================
// NORMALIZE ONE RECORD
// ==================================================

function normalizePrice(
  item,
  syncId
) {
  const price =
    Number(item.price);

  if (!Number.isFinite(price)) {
    return null;
  }

  const locationCode =
    String(
      item.location_code || ""
    ).toUpperCase();

  const currency =
    String(
      item.currency_code || ""
    ).toUpperCase();

  if (locationCode !== "UGA") {
    return null;
  }

  if (currency !== "UGX") {
    return null;
  }

  return {
    country:
      item.location_name ||
      "Uganda",

    countryCode:
      "UGA",

    market:
      item.market_name ||
      "Unknown market",

    marketCode:
      item.market_code ||
      "",

    crop:
      item.commodity_name ||
      "Unknown commodity",

    commodityCode:
      item.commodity_code ||
      "",

    commodityCategory:
      item.commodity_category ||
      "",

    price,

    unit:
      item.unit ||
      "",

    currency:
      currency,

    priceType:
      item.price_type ||
      "",

    priceFlag:
      item.price_flag ||
      "",

    referencePeriodStart:
      item.reference_period_start ||
      null,

    referencePeriodEnd:
      item.reference_period_end ||
      null,

    region:
      item.admin1_name ||
      "",

    regionCode:
      item.admin1_code ||
      "",

    district:
      item.admin2_name ||
      "",

    districtCode:
      item.admin2_code ||
      "",

    adminLevel:
      item.admin_level ??
      null,

    latitude:
      Number.isFinite(
        Number(item.lat)
      )
        ? Number(item.lat)
        : null,

    longitude:
      Number.isFinite(
        Number(item.lon)
      )
        ? Number(item.lon)
        : null,

    resourceHdxId:
      item.resource_hdx_id ||
      "",

    source:
      SOURCE_NAME,

    dataset:
      DATASET_NAME,

    syncId,

    updatedAt:
      FieldValue.serverTimestamp(),
  };
}

// ==================================================
// REMOVE DUPLICATES
// ==================================================

function deduplicatePrices(
  prices
) {
  const unique = new Map();

  prices.forEach((price) => {
    const id =
      createDocumentId({
        location_code:
          "UGA",

        market_code:
          price.marketCode,

        market_name:
          price.market,

        commodity_code:
          price.commodityCode,

        commodity_name:
          price.crop,

        price_type:
          price.priceType,

        reference_period_start:
          price.referencePeriodStart,

        reference_period_end:
          price.referencePeriodEnd,

        unit:
          price.unit,

        currency_code:
          price.currency,
      });

    if (!unique.has(id)) {
      unique.set(id, price);
    }
  });

  return [
    ...unique.values(),
  ];
}

// ==================================================
// FIRESTORE BATCH SAVE
// ==================================================

async function savePricesToFirestore(
  prices
) {
  const collectionRef =
    db.collection(
      "market_prices"
    );

  const batchSize = 400;

  let saved = 0;

  for (
    let i = 0;
    i < prices.length;
    i += batchSize
  ) {
    const batch =
      db.batch();

    const batchPrices =
      prices.slice(
        i,
        i + batchSize
      );

    batchPrices.forEach(
      (price) => {
        const documentId =
          createDocumentId({
            location_code:
              "UGA",

            market_code:
              price.marketCode,

            market_name:
              price.market,

            commodity_code:
              price.commodityCode,

            commodity_name:
              price.crop,

            price_type:
              price.priceType,

            reference_period_start:
              price.referencePeriodStart,

            reference_period_end:
              price.referencePeriodEnd,

            unit:
              price.unit,

            currency_code:
              price.currency,
          });

        const documentRef =
          collectionRef.doc(
            documentId
          );

        batch.set(
          documentRef,
          price,
          {
            merge: true,
          }
        );
      }
    );

    await batch.commit();

    saved +=
      batchPrices.length;

    console.log(
      `💾 Firestore: ${saved}/${prices.length} records saved`
    );
  }

  return saved;
}

// ==================================================
// SAVE SYNC METADATA
// ==================================================

async function saveSyncMetadata({
  syncId,
  startedAt,
  completedAt,
  recordsFetched,
  recordsSaved,
}) {
  await db
    .collection(
      "market_price_meta"
    )
    .doc("uganda")
    .set(
      {
        country:
          "Uganda",

        countryCode:
          "UGA",

        source:
          SOURCE_NAME,

        dataset:
          DATASET_NAME,

        updateFrequency:
          "Weekly",

        timeSeriesFrequency:
          "Monthly",

        recordsFetched,

        recordsSaved,

        syncId,

        startedAt,

        completedAt,

        lastSuccessfulSync:
          completedAt,

        nextExpectedSync:
          new Date(
            Date.now() +
              SYNC_DAYS *
                24 *
                60 *
                60 *
                1000
          ).toISOString(),
      },
      {
        merge: true,
      }
    );
}

// ==================================================
// PERFORM SYNC
// ==================================================

export async function syncUgandaMarketPrices() {
  const syncId =
    `uganda-${Date.now()}-${crypto.randomUUID()}`;

  const startedAt =
    new Date().toISOString();

  console.log("");

  console.log(
    "🌾 Starting Uganda market-price sync..."
  );

  console.log(
    `🔄 Sync ID: ${syncId}`
  );

  try {
    const rawRows =
      await fetchAllUgandaPrices();

    console.log(
      `📊 Raw records received: ${rawRows.length}`
    );

    const normalizedPrices =
      rawRows
        .map((item) =>
          normalizePrice(
            item,
            syncId
          )
        )
        .filter(Boolean);

    const uniquePrices =
      deduplicatePrices(
        normalizedPrices
      );

    console.log(
      `✅ Valid UGX records: ${normalizedPrices.length}`
    );

    console.log(
      `✅ Unique records: ${uniquePrices.length}`
    );

    const recordsSaved =
      await savePricesToFirestore(
        uniquePrices
      );

    const completedAt =
      new Date().toISOString();

    await saveSyncMetadata({
      syncId,

      startedAt,

      completedAt,

      recordsFetched:
        rawRows.length,

      recordsSaved,
    });

    console.log(
      "✅ Uganda market-price sync completed."
    );

    console.log(
      `💾 Saved ${recordsSaved} records to Firestore.`
    );

    console.log("");

    return {
      success: true,

      syncId,

      recordsFetched:
        rawRows.length,

      recordsSaved,

      completedAt,
    };
  } catch (error) {
    console.error(
      "❌ Uganda market-price sync failed:",
      error
    );

    throw error;
  }
}

// ==================================================
// CHECK WHETHER SYNC IS DUE
// ==================================================

export async function isUgandaPriceSyncDue() {
  const metadata =
    await db
      .collection(
        "market_price_meta"
      )
      .doc("uganda")
      .get();

  if (!metadata.exists) {
    return true;
  }

  const data =
    metadata.data();

  const lastSync =
    data?.lastSuccessfulSync;

  if (!lastSync) {
    return true;
  }

  const lastSyncTime =
    new Date(
      lastSync
    ).getTime();

  if (
    !Number.isFinite(
      lastSyncTime
    )
  ) {
    return true;
  }

  const interval =
    SYNC_DAYS *
    24 *
    60 *
    60 *
    1000;

  return (
    Date.now() -
      lastSyncTime >=
    interval
  );
}

// ==================================================
// AUTOMATIC SCHEDULER
// ==================================================

export function startMarketPriceScheduler() {
  const checkSync =
    async () => {
      try {
        const due =
          await isUgandaPriceSyncDue();

        if (!due) {
          console.log(
            "📊 Uganda market prices are still up to date."
          );

          return;
        }

        await syncUgandaMarketPrices();
      } catch (error) {
        console.error(
          "❌ Scheduled market-price sync failed:",
          error.message
        );
      }
    };

  // Check when server starts
  checkSync();

  // Check every 6 hours.
  // The sync interval is controlled
  // by MARKET_PRICE_SYNC_DAYS.
  setInterval(
    checkSync,
    6 * 60 * 60 * 1000
  );
}