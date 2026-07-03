import express from "express";
import path from "path";
import Stripe from "stripe";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy Stripe initialization to prevent crashes on startup if secret key is missing
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is missing. Please set it in your environment variables via settings.");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: "2025-02-11" as any,
    });
  }
  return stripeInstance;
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

// Create subscription checkout session
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const { clientId, clientName, clientEmail, amount, interval } = req.body;

    if (!clientId || !clientEmail || !amount) {
      return res.status(400).json({ error: "clientId, clientEmail, and amount are required" });
    }

    const stripe = getStripe();
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    // Create a checkout session in subscription mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Mensualidad Automática - ${clientName || "Cliente"}`,
              description: `Suscripción recurrente de pago para el cliente ${clientName || clientEmail}`,
            },
            unit_amount: Math.round(Number(amount) * 100), // convert to cents
            recurring: {
              interval: interval === "year" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: clientEmail,
      success_url: `${appUrl}?stripe_session_id={CHECKOUT_SESSION_ID}&stripe_status=success&client_id=${clientId}&amount=${amount}&interval=${interval || "month"}`,
      cancel_url: `${appUrl}?stripe_status=cancel&client_id=${clientId}`,
      metadata: {
        clientId,
        clientName: clientName || "",
        clientEmail,
      },
    });

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
    const appUrl = process.env.APP_URL || "http://localhost:3000";

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
    
    res.json({
      customerId: session.customer,
      subscriptionId: session.subscription,
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
