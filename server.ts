import express from "express";
import path from "path";
import Stripe from "stripe";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// Request logging middleware for debugging API calls
app.use((req, res, next) => {
  const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}\n`;
  console.log(logMsg.trim());
  try {
    fs.appendFileSync(path.join(process.cwd(), "server.log"), logMsg);
  } catch (err) {
    // ignore logging errors
  }
  next();
});

app.use(express.json());

// Lazy Stripe initialization to prevent crashes on startup if secret key is missing
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is missing. Please set it in your environment variables via settings.");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

function getAppUrl(req: express.Request): string {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const forwardedHost = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const origin = req.headers.origin;

  if (origin) return origin.replace(/\/$/, "");
  if (forwardedHost) return `${forwardedProto || req.protocol}://${forwardedHost}`.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host") || "localhost:3000"}`.replace(/\/$/, "");
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Stripe CRM API is active!" });
});

// Check if Stripe is configured
app.get("/api/stripe/config", (req, res) => {
  res.json({
    hasKey: !!process.env.STRIPE_SECRET_KEY,
  });
});

// Create subscription or single payment checkout session
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const { clientId, clientName, clientEmail, amount, interval, installments, concept, pendingTxId, stripePlanId, installmentIndex } = req.body;

    if (!clientId || !clientEmail || !amount) {
      return res.status(400).json({ error: "clientId, clientEmail, and amount are required" });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl(req);
    const isSubscription = interval !== "once";
    const installmentCount = Number.parseInt(installments || "", 10);
    const isFiniteInstallmentSubscription = isSubscription && Number.isFinite(installmentCount) && installmentCount > 1;

    const lineItem: any = {
      price_data: {
        currency: "eur",
        product_data: {
          name: concept || (isSubscription 
            ? `Mensualidad Automática - ${clientName || "Cliente"}` 
            : `Pago Único - ${clientName || "Cliente"}`),
          description: isSubscription 
            ? `Suscripción recurrente de pago para el cliente ${clientName || clientEmail}` 
            : `Pago único de servicio para el cliente ${clientName || clientEmail}`,
        },
        unit_amount: Math.round(Number(amount) * 100), // convert to cents
      },
      quantity: 1,
    };

    if (isSubscription) {
      lineItem.price_data.recurring = {
        interval: interval === "year" ? "year" : "month",
      };
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: isSubscription ? "subscription" : "payment",
      customer_email: clientEmail,
      success_url: `${appUrl}?stripe_session_id={CHECKOUT_SESSION_ID}&stripe_status=success&client_id=${clientId}&amount=${amount}&interval=${interval || "month"}&installments=${installments || ""}&concept=${encodeURIComponent(concept || "")}&pending_tx_id=${pendingTxId || ""}&stripe_plan_id=${stripePlanId || ""}&installment_index=${installmentIndex || ""}`,
      cancel_url: `${appUrl}?stripe_status=cancel&client_id=${clientId}`,
      metadata: {
        clientId,
        clientName: clientName || "",
        clientEmail,
        installments: installments || "",
        concept: concept || "",
        pendingTxId: pendingTxId || "",
        stripePlanId: stripePlanId || "",
        installmentIndex: installmentIndex || "",
      },
    };

    if (isFiniteInstallmentSubscription) {
      sessionConfig.subscription_data = {
        metadata: {
          clientId,
          pendingTxId: pendingTxId || "",
          stripePlanId: stripePlanId || "",
          installments: installments || "",
        },
      };
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("Error creating stripe checkout session:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

// Create billing customer portal session
app.post("/api/stripe/create-portal-session", async (req, res) => {
  try {
    const { stripeCustomerId } = req.body;

    if (!stripeCustomerId) {
      return res.status(400).json({ error: "stripeCustomerId is required" });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl(req);

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: appUrl,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating stripe portal session:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

// Retrieve details of a checkout session
app.get("/api/stripe/retrieve-session", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const installmentCount = Number.parseInt(session.metadata?.installments || "", 10);

    if (subscriptionId && Number.isFinite(installmentCount) && installmentCount > 1) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!subscription.cancel_at) {
        const cancelAt = new Date((subscription.start_date || Math.floor(Date.now() / 1000)) * 1000);
        cancelAt.setMonth(cancelAt.getMonth() + installmentCount);
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at: Math.floor(cancelAt.getTime() / 1000),
          metadata: {
            ...(subscription.metadata || {}),
            installments: String(installmentCount),
            althera_finite_installment_plan: "true",
          },
        });
      }
    }
    
    res.json({
      customerId: session.customer,
      subscriptionId,
      paymentStatus: session.payment_status,
      status: session.status,
    });
  } catch (error: any) {
    console.error("Error retrieving checkout session:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

// Handle production bundle or dev HMR middlewares
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
