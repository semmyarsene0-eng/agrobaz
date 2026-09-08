/* global process */

import express from "express";
import cors from "cors";
import crypto from "crypto";
import multer from "multer";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Load .env BEFORE loading the market-price module
dotenv.config();

const {
  syncUgandaMarketPrices,
  startMarketPriceScheduler,
} = await import("./marketPriceSync.js");

// ==================================================
// ENVIRONMENT
// ==================================================

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY?.trim();

const PORT =
  Number(process.env.PORT) || 5000;

// ==================================================
// VALIDATION
// ==================================================

if (!SUPABASE_URL) {
  console.error(
    "❌ SUPABASE_URL is missing from .env"
  );
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ SUPABASE_SERVICE_ROLE_KEY is missing from .env"
  );
}

if (!OPENAI_API_KEY) {
  console.warn(
    "⚠️ OPENAI_API_KEY is missing - AI Doctor will be disabled."
  );
}

if (!process.env.HAPI_APP_IDENTIFIER) {
  console.warn(
    "⚠️ HAPI_APP_IDENTIFIER is missing - market prices will be disabled."
  );
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn(
    "⚠️ GOOGLE_APPLICATION_CREDENTIALS is missing - Firestore price sync will fail."
  );
}

// ==================================================
// EXPRESS
// ==================================================

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-sync-secret",
    ],
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

// ==================================================
// SUPABASE
// ==================================================

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

console.log(
  "✅ Supabase configuration loaded"
);

// ==================================================
// OPENAI
// ==================================================

const openai =
  OPENAI_API_KEY
    ? new OpenAI({
        apiKey:
          OPENAI_API_KEY,
      })
    : null;

if (openai) {
  console.log(
    "✅ OpenAI configuration loaded"
  );
}

// ==================================================
// MULTER
// ==================================================

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },
  });

// ==================================================
// TEST PAYMENTS
// ==================================================

const payments =
  new Map();

// ==================================================
// HEALTH CHECK
// ==================================================

app.get(
  "/",
  (req, res) => {
    return res.json({
      success: true,

      message:
        "AgroBaz server is running 🌾",

      environment:
        process.env.NODE_ENV ||
        "development",

      services: {
        payments:
          true,

        supabaseImages:
          true,

        aiDoctor:
          Boolean(openai),

        marketPrices:
          Boolean(
            process.env.HAPI_APP_IDENTIFIER
          ),
      },
    });
  }
);

// ==================================================
// CREATE PAYMENT
// ==================================================

app.post(
  "/create-payment",
  (req, res) => {
    try {
      const {
        amount,
        email,
        phone,
        method,
      } = req.body;

      if (
        !amount ||
        !Number.isFinite(
          Number(amount)
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A valid payment amount is required.",
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          message:
            "Email is required.",
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number is required.",
        });
      }

      if (!method) {
        return res.status(400).json({
          success: false,
          message:
            "Payment method is required.",
        });
      }

      const allowedMethods = [
        "MTN",
        "Airtel",
      ];

      if (
        !allowedMethods.includes(
          method
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only MTN and Airtel payments are supported.",
        });
      }

      const paymentId =
        `TEST-${crypto.randomUUID()}`;

      const payment = {
        paymentId,

        amount:
          Number(amount),

        currency:
          "UGX",

        email,

        phone,

        method,

        status:
          "Pending",

        escrowStatus:
          "Pending",

        createdAt:
          new Date().toISOString(),
      };

      payments.set(
        paymentId,
        payment
      );

      return res.status(201).json({
        success: true,

        message:
          "Test payment created successfully.",

        payment,
      });
    } catch (error) {
      console.error(
        "❌ Create payment error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to create payment.",
      });
    }
  }
);

// ==================================================
// VERIFY PAYMENT
// ==================================================

app.get(
  "/verify-payment/:paymentId",
  (req, res) => {
    const {
      paymentId,
    } = req.params;

    const payment =
      payments.get(
        paymentId
      );

    if (!payment) {
      return res.status(404).json({
        success: false,

        message:
          "Payment not found.",
      });
    }

    return res.json({
      success: true,

      payment,
    });
  }
);

// ==================================================
// TEST MARK PAID
// ==================================================

app.post(
  "/test/mark-paid/:paymentId",
  (req, res) => {
    const {
      paymentId,
    } = req.params;

    const payment =
      payments.get(
        paymentId
      );

    if (!payment) {
      return res.status(404).json({
        success: false,

        message:
          "Payment not found.",
      });
    }

    payment.status =
      "Paid";

    payment.escrowStatus =
      "Held";

    payment.paidAt =
      new Date().toISOString();

    payments.set(
      paymentId,
      payment
    );

    return res.json({
      success: true,

      message:
        "Test payment marked as paid.",

      payment,
    });
  }
);

// ==================================================
// TEST RELEASE ESCROW
// ==================================================

app.post(
  "/test/release-escrow/:paymentId",
  (req, res) => {
    const {
      paymentId,
    } = req.params;

    const payment =
      payments.get(
        paymentId
      );

    if (!payment) {
      return res.status(404).json({
        success: false,

        message:
          "Payment not found.",
      });
    }

    if (
      payment.status !==
      "Paid"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Payment must be paid before escrow can be released.",
      });
    }

    if (
      payment.escrowStatus !==
      "Held"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Escrow is not currently held.",
      });
    }

    payment.escrowStatus =
      "Released";

    payment.releasedAt =
      new Date().toISOString();

    payments.set(
      paymentId,
      payment
    );

    return res.json({
      success: true,

      message:
        "Escrow released successfully.",

      payment,
    });
  }
);

// ==================================================
// AI CROP DOCTOR
// ==================================================

app.post(
  "/ai-doctor/analyze",
  upload.single("image"),

  async (
    req,
    res
  ) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,

          message:
            "AI Doctor is not configured.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,

          message:
            "Please upload a crop image.",
        });
      }

      const crop =
        req.body.crop?.trim();

      const description =
        req.body.description?.trim() ||
        "";

      if (!crop) {
        return res.status(400).json({
          success: false,

          message:
            "Crop type is required.",
        });
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          req.file.mimetype
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Only JPG, PNG and WEBP images are supported.",
        });
      }

      console.log(
        `🔬 AI Doctor analyzing ${crop} image...`
      );

      const base64Image =
        req.file.buffer.toString(
          "base64"
        );

      const imageDataUrl =
        `data:${req.file.mimetype};base64,${base64Image}`;

      const response =
        await openai.responses.create({
          model:
            "gpt-5.6-luna",

          input: [
            {
              role:
                "user",

              content: [
                {
                  type:
                    "input_text",

                  text: `
You are AgroBaz AI Crop Doctor.

You help farmers understand possible
crop health problems from photographs.

Crop:
${crop}

Farmer description:
${
  description ||
  "No additional description provided."
}

Analyze the supplied image carefully.

Tasks:

1. Identify the most likely POSSIBLE condition.
2. Describe visible symptoms.
3. Provide practical actions.
4. Provide prevention suggestions.
5. Say when expert confirmation is needed.

Rules:

- Never claim certainty from an image alone.
- Do not invent symptoms.
- If the image is unclear, say so.
- Do not recommend unsafe chemical use.
- For treatments, tell farmers to follow
  product labels and local agricultural guidance.
- Recommend a qualified agricultural extension
  officer or agronomist when appropriate.

Return ONLY valid JSON.

Structure:

{
  "crop": "",
  "possibleCondition": "",
  "confidence": "",
  "symptomsObserved": [],
  "recommendedActions": [],
  "prevention": [],
  "needsExpertConfirmation": false
}

Confidence must be:
"Low"
"Moderate"
"High"

No markdown.
No code fences.
JSON only.
`,
                },

                {
                  type:
                    "input_image",

                  image_url:
                    imageDataUrl,
                },
              ],
            },
          ],
        });

      const outputText =
        response.output_text?.trim();

      if (!outputText) {
        return res.status(500).json({
          success: false,

          message:
            "AI returned an empty response.",
        });
      }

      let diagnosis;

      try {
        diagnosis =
          JSON.parse(
            outputText
          );
      } catch (error) {
        console.error(
          "❌ AI JSON parsing error:",
          error
        );

        return res.status(500).json({
          success: false,

          message:
            "The AI returned an unexpected response format.",
        });
      }

      diagnosis = {
        crop:
          diagnosis.crop ||
          crop,

        possibleCondition:
          diagnosis.possibleCondition ||
          "Unable to determine",

        confidence:
          diagnosis.confidence ||
          "Low",

        symptomsObserved:
          Array.isArray(
            diagnosis.symptomsObserved
          )
            ? diagnosis.symptomsObserved
            : [],

        recommendedActions:
          Array.isArray(
            diagnosis.recommendedActions
          )
            ? diagnosis.recommendedActions
            : [],

        prevention:
          Array.isArray(
            diagnosis.prevention
          )
            ? diagnosis.prevention
            : [],

        needsExpertConfirmation:
          Boolean(
            diagnosis.needsExpertConfirmation
          ),
      };

      console.log(
        "🤖 AI response received."
      );

      console.log(
        "✅ AI Doctor analysis completed."
      );

      return res.json({
        success: true,

        diagnosis,
      });
    } catch (error) {
      console.error(
        "❌ AI Doctor error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to analyze the crop right now.",
      });
    }
  }
);

// ==================================================
// UGANDA MARKET PRICES
// ==================================================

app.get(
  "/market-prices/uganda",
  async (
    req,
    res
  ) => {
    try {
      const hapiIdentifier =
        process.env
          .HAPI_APP_IDENTIFIER?.trim();

      if (!hapiIdentifier) {
        return res.status(503).json({
          success: false,

          message:
            "Market-price service is not configured.",
        });
      }

      const {
        crop = "",
        market = "",
        priceType = "",
      } = req.query;

      const params =
        new URLSearchParams();

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
        "0"
      );

      params.set(
        "limit",
        "10000"
      );

      params.set(
        "app_identifier",
        hapiIdentifier
      );

      if (
        String(crop).trim()
      ) {
        params.set(
          "commodity_name",
          String(
            crop
          ).trim()
        );
      }

      if (
        String(market).trim()
      ) {
        params.set(
          "market_name",
          String(
            market
          ).trim()
        );
      }

      if (
        String(priceType).trim()
      ) {
        params.set(
          "price_type",
          String(
            priceType
          ).trim()
        );
      }

      const url =
        `https://hapi.humdata.org/api/v2/food-security-nutrition-poverty/food-prices-market-monitor?${params.toString()}`;

      console.log(
        "📊 Loading Uganda market prices..."
      );

      const response =
        await fetch(url);

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "❌ HAPI error:",
          response.status,
          errorText
        );

        return res.status(502).json({
          success: false,

          message:
            "Unable to reach the market-price service.",
        });
      }

      const payload =
        await response.json();

      const rows =
        Array.isArray(
          payload.data
        )
          ? payload.data
          : [];

      const prices =
        rows
          .map(
            (item) => ({
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

              price:
                Number(item.price),

              unit:
                item.unit ||
                "",

              currency:
                item.currency_code ||
                "",

              priceType:
                item.price_type ||
                "",

              priceFlag:
                item.price_flag ||
                "",

              date:
                item.reference_period_start ||
                null,

              dateEnd:
                item.reference_period_end ||
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

              admin1:
                item.admin1_name ||
                "",

              admin2:
                item.admin2_name ||
                "",

              source:
                "World Food Programme",
            })
          )
          .filter(
            (item) =>
              Number.isFinite(
                item.price
              ) &&
              item.currency ===
                "UGX"
          );

      console.log(
        `✅ Returning ${prices.length} Uganda price records.`
      );

      return res.json({
        success: true,

        country:
          "Uganda",

        source:
          "World Food Programme",

        dataset:
          "WFP Food Prices data series",

        updateFrequency:
          "Weekly",

        timeSeriesFrequency:
          "Monthly",

        prices,
      });
    } catch (error) {
      console.error(
        "❌ Market price error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load Uganda market prices.",
      });
    }
  }
);

// ==================================================
// FIRESTORE MARKET PRICES
// ==================================================

app.get(
  "/market-prices/uganda/firestore",
  async (
    req,
    res
  ) => {
    try {
      const {
        crop = "",
        market = "",
        limit = "500",
      } = req.query;

      const numericLimit =
        Number(limit);

      const maxResults =
        Math.min(
          Math.max(
            Number.isFinite(
              numericLimit
            )
              ? numericLimit
              : 500,
            1
          ),
          1000
        );

      const {
        getFirestore,
      } = await import(
        "firebase-admin/firestore"
      );

      const db =
        getFirestore();

      const snapshot =
        await db
          .collection(
            "market_prices"
          )
          .limit(
            maxResults
          )
          .get();

      let prices =
        snapshot.docs.map(
          (doc) => {
            const data =
              doc.data();

            return {
              id:
                doc.id,

              ...data,

              updatedAt:
                data.updatedAt
                  ?.toDate?.()
                  ?.toISOString?.() ||
                null,
            };
          }
        );

      if (
        String(crop).trim()
      ) {
        const queryCrop =
          String(
            crop
          )
            .trim()
            .toLowerCase();

        prices =
          prices.filter(
            (item) =>
              String(
                item.crop ||
                  ""
              )
                .toLowerCase()
                .includes(
                  queryCrop
                )
          );
      }

      if (
        String(market).trim()
      ) {
        const queryMarket =
          String(
            market
          )
            .trim()
            .toLowerCase();

        prices =
          prices.filter(
            (item) =>
              String(
                item.market ||
                  ""
              )
                .toLowerCase()
                .includes(
                  queryMarket
                )
          );
      }

      return res.json({
        success: true,

        country:
          "Uganda",

        source:
          "AgroBaz Firestore cache",

        prices,
      });
    } catch (error) {
      console.error(
        "❌ Firestore market-price error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load stored market prices.",
      });
    }
  }
);

// ==================================================
// MANUAL MARKET PRICE SYNC
// ==================================================

app.post(
  "/market-prices/sync",
  async (
    req,
    res
  ) => {
    try {
      const suppliedSecret =
        req.headers[
          "x-sync-secret"
        ];

      const expectedSecret =
        process.env
          .MARKET_PRICE_SYNC_SECRET;

      if (
        !expectedSecret ||
        suppliedSecret !==
          expectedSecret
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Unauthorized.",
        });
      }

      console.log(
        "🔄 Manual market-price sync requested."
      );

      const result =
        await syncUgandaMarketPrices();

      return res.json(
        result
      );
    } catch (error) {
      console.error(
        "❌ Manual sync error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Market-price synchronization failed.",
      });
    }
  }
);

// ==================================================
// UPLOAD PRODUCT IMAGE
// ==================================================

app.post(
  "/upload-product-image",
  upload.single("image"),

  async (
    req,
    res
  ) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,

          message:
            "No image was uploaded.",
        });
      }

      const userId =
        req.body.userId?.trim();

      if (!userId) {
        return res.status(400).json({
          success: false,

          message:
            "User ID is required.",
        });
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          req.file.mimetype
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Only JPG, PNG and WEBP images are allowed.",
        });
      }

      let extension =
        "jpg";

      if (
        req.file.mimetype ===
        "image/png"
      ) {
        extension =
          "png";
      }

      if (
        req.file.mimetype ===
        "image/webp"
      ) {
        extension =
          "webp";
      }

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const filePath =
        `${userId}/${fileName}`;

      console.log(
        "📤 Uploading image:",
        filePath
      );

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "product-images"
          )
          .upload(
            filePath,
            req.file.buffer,
            {
              contentType:
                req.file.mimetype,

              cacheControl:
                "3600",

              upsert:
                false,
            }
          );

      if (uploadError) {
        console.error(
          "❌ Supabase upload error:",
          uploadError
        );

        return res.status(500).json({
          success: false,

          message:
            "Failed to upload image.",

          error:
            uploadError.message,
        });
      }

      const {
        data,
      } =
        supabase.storage
          .from(
            "product-images"
          )
          .getPublicUrl(
            filePath
          );

      return res.json({
        success: true,

        message:
          "Product image uploaded successfully.",

        imageUrl:
          data.publicUrl,

        imagePath:
          filePath,
      });
    } catch (error) {
      console.error(
        "❌ Image upload error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while uploading image.",
      });
    }
  }
);

// ==================================================
// REPLACE PRODUCT IMAGE
// ==================================================

app.post(
  "/replace-product-image",
  upload.single("image"),

  async (
    req,
    res
  ) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,

          message:
            "No replacement image was uploaded.",
        });
      }

      const userId =
        req.body.userId?.trim();

      const oldImagePath =
        req.body.oldImagePath?.trim();

      if (!userId) {
        return res.status(400).json({
          success: false,

          message:
            "User ID is required.",
        });
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          req.file.mimetype
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Only JPG, PNG and WEBP images are allowed.",
        });
      }

      let extension =
        "jpg";

      if (
        req.file.mimetype ===
        "image/png"
      ) {
        extension =
          "png";
      }

      if (
        req.file.mimetype ===
        "image/webp"
      ) {
        extension =
          "webp";
      }

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const filePath =
        `${userId}/${fileName}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "product-images"
          )
          .upload(
            filePath,
            req.file.buffer,
            {
              contentType:
                req.file.mimetype,

              cacheControl:
                "3600",

              upsert:
                false,
            }
          );

      if (uploadError) {
        console.error(
          "❌ Replacement upload error:",
          uploadError
        );

        return res.status(500).json({
          success: false,

          message:
            "Failed to upload replacement image.",
        });
      }

      const {
        data,
      } =
        supabase.storage
          .from(
            "product-images"
          )
          .getPublicUrl(
            filePath
          );

      if (oldImagePath) {
        const {
          error:
            deleteError,
        } =
          await supabase.storage
            .from(
              "product-images"
            )
            .remove([
              oldImagePath,
            ]);

        if (deleteError) {
          console.warn(
            "⚠️ Could not delete old image:",
            deleteError.message
          );
        }
      }

      return res.json({
        success: true,

        message:
          "Product image replaced successfully.",

        imageUrl:
          data.publicUrl,

        imagePath:
          filePath,
      });
    } catch (error) {
      console.error(
        "❌ Replace image error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while replacing image.",
      });
    }
  }
);

// ==================================================
// 404
// ==================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,

      message:
        "Route not found.",
    });
  }
);

// ==================================================
// ERROR HANDLER
// ==================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "❌ Unhandled server error:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    return res.status(500).json({
      success: false,

      message:
        "An unexpected server error occurred.",
    });
  }
);

// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");

    console.log(
      `🌾 Agrobaz server running on port ${PORT}`
    );

    console.log(
      "💳 Payment system: TEST MODE"
    );

    console.log(
      "📦 Supabase image uploads: ENABLED"
    );

    console.log(
      openai
        ? "🤖 AI Crop Doctor: ENABLED"
        : "⚠️ AI Crop Doctor: DISABLED"
    );

    console.log(
      process.env.HAPI_APP_IDENTIFIER
        ? "📊 Uganda Market Prices: ENABLED"
        : "⚠️ Uganda Market Prices: DISABLED"
    );

    console.log("");

    // Start market-price scheduler
    try {
      startMarketPriceScheduler();
    } catch (error) {
      console.error(
        "❌ Market-price scheduler could not start:",
        error
      );
    }
  }
);