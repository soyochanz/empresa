import express from "express";
import path from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import fs from "fs";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_SUPABASE_URL = "https://czyrolmczcwtexxgxzrg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eXJvbG1jemN3dGV4eGd4enJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTcxMjEsImV4cCI6MjA5NDk3MzEyMX0.OO17A0soth1VcIQQm6p02Po8uWPtP8GggfnmUXzGvp4";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY,
);

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

function readTag(description: string, tag: string): string | undefined {
  const match = new RegExp(`\\[${tag}:([^\\]]+)\\]`).exec(description || "");
  return match?.[1];
}

function writeTag(description: string, tag: string, value: string): string {
  const withoutTag = (description || "").replace(new RegExp(`\\s*\\[${tag}:[^\\]]+\\]`, "g"), "").trim();
  return `${withoutTag} [${tag}:${value}]`.trim();
}

function getStripeInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const expandedInvoice = invoice as any;
  const subscription = expandedInvoice.subscription;
  if (typeof subscription === "string") return subscription;
  if (subscription?.id) return subscription.id;
  return (
    expandedInvoice.parent?.subscription_details?.subscription ||
    expandedInvoice.subscription_details?.subscription ||
    undefined
  );
}

function getStripePaidDate(invoice: Stripe.Invoice): string {
  const paidAt = (invoice.status_transitions?.paid_at || Math.floor(Date.now() / 1000)) * 1000;
  return new Date(paidAt).toISOString().split("T")[0];
}

async function markStripeInvoiceAsPaid(invoice: Stripe.Invoice): Promise<{ updated: boolean; reason?: string; txId?: string }> {
  const stripe = getStripe();
  const invoiceId = invoice.id;
  const subscriptionId = getStripeInvoiceSubscriptionId(invoice);

  if (!invoiceId) return { updated: false, reason: "missing_invoice_id" };
  if (!subscriptionId) return { updated: false, reason: "not_subscription_invoice" };

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const invoiceMetadata = (invoice as any).subscription_details?.metadata || {};
  const stripePlanId =
    subscription.metadata?.stripePlanId ||
    invoiceMetadata.stripePlanId ||
    invoice.metadata?.stripePlanId ||
    "";
  const firstPendingTxId =
    subscription.metadata?.pendingTxId ||
    invoiceMetadata.pendingTxId ||
    invoice.metadata?.pendingTxId ||
    "";

  const { data: transactions, error: txError } = await supabaseAdmin
    .from("finance_transactions")
    .select("*");

  if (txError) throw txError;

  const rows = transactions || [];
  if (rows.some((tx: any) => (tx.description || "").includes(`[STRIPEINVOICE:${invoiceId}]`))) {
    return { updated: false, reason: "already_processed" };
  }

  const matchingRows = rows.filter((tx: any) => {
    const description = tx.description || "";
    return (
      (stripePlanId && description.includes(`[STRIPEPLAN:${stripePlanId}]`)) ||
      (firstPendingTxId && tx.id === firstPendingTxId)
    );
  });

  if (matchingRows.length === 0) {
    return { updated: false, reason: "no_matching_transaction" };
  }

  const isFirstInvoice = (invoice as any).billing_reason === "subscription_create";
  let targetTx =
    isFirstInvoice && firstPendingTxId
      ? matchingRows.find((tx: any) => tx.id === firstPendingTxId)
      : undefined;

  if (targetTx?.status === "paid") {
    const description = targetTx.description || "";
    if (!description.includes(`[STRIPEINVOICE:${invoiceId}]`)) {
      const updatedDescription = writeTag(description, "STRIPEINVOICE", invoiceId);
      const { error: tagError } = await supabaseAdmin
        .from("finance_transactions")
        .update({ description: updatedDescription })
        .eq("id", targetTx.id);
      if (tagError) throw tagError;
      return { updated: false, reason: "already_paid_invoice_tag_saved", txId: targetTx.id };
    }
    return { updated: false, reason: "first_installment_already_paid" };
  }

  if (!targetTx) {
    targetTx = matchingRows
      .filter((tx: any) => tx.status === "pending")
      .sort((a: any, b: any) => {
        const aIndex = Number.parseInt(readTag(a.description || "", "STRIPEIDX") || "999", 10);
        const bIndex = Number.parseInt(readTag(b.description || "", "STRIPEIDX") || "999", 10);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return String(a.date || "").localeCompare(String(b.date || ""));
      })[0];
  }

  if (!targetTx) {
    return { updated: false, reason: "no_pending_transaction" };
  }

  let updatedDescription = (targetTx.description || "").replace(/\s*\(Pendiente\)/g, "").trim();
  updatedDescription = writeTag(updatedDescription, "STRIPEINVOICE", invoiceId);

  const { error: updateTxError } = await supabaseAdmin
    .from("finance_transactions")
    .update({
      status: "paid",
      date: getStripePaidDate(invoice),
      description: updatedDescription,
    })
    .eq("id", targetTx.id);

  if (updateTxError) throw updateTxError;

  const { data: invoices, error: invError } = await supabaseAdmin
    .from("finance_invoices")
    .select("*");

  if (invError) throw invError;

  await Promise.all(
    (invoices || [])
      .filter((financeInvoice: any) =>
        Array.isArray(financeInvoice.items) &&
        financeInvoice.items.some((item: any) => item.pendingTxId === targetTx.id),
      )
      .map((financeInvoice: any) => {
        const items = financeInvoice.items.map((item: any) =>
          item.pendingTxId === targetTx.id
            ? { ...item, isPending: false, paymentMethod: "transfer" }
            : item,
        );
        const status = items.some((item: any) => item.isPending) ? "sent" : "paid";
        return supabaseAdmin
          .from("finance_invoices")
          .update({ items, status })
          .eq("id", financeInvoice.id);
      }),
  );

  return { updated: true, txId: targetTx.id };
}

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"] as string | undefined;
    let event: Stripe.Event;

    if (webhookSecret) {
      if (!signature) {
        return res.status(400).json({ error: "Missing Stripe signature" });
      }
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString("utf8")) as Stripe.Event;
      console.warn("STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification is disabled.");
    }

    if (event.type === "invoice.paid") {
      const result = await markStripeInvoiceAsPaid(event.data.object as Stripe.Invoice);
      console.log("Processed Stripe invoice.paid webhook:", result);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Error handling Stripe webhook:", error);
    res.status(400).json({ error: error?.message || "Webhook error" });
  }
});

app.use(express.json());

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

app.post("/api/stripe/create-connect-account", async (req, res) => {
  try {
    const { comercialId, comercialName, comercialEmail, existingAccountId } = req.body;

    if (!comercialId || !comercialEmail) {
      return res.status(400).json({ error: "comercialId and comercialEmail are required" });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl(req);
    const accountId = existingAccountId || (await stripe.accounts.create({
      type: "express",
      country: "ES",
      email: comercialEmail,
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        comercialId,
        comercialName: comercialName || "",
      },
    })).id;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}?stripe_connect=refresh&comercial_id=${comercialId}`,
      return_url: `${appUrl}?stripe_connect=success&comercial_id=${comercialId}&stripe_account_id=${accountId}`,
      type: "account_onboarding",
    });

    res.json({ accountId, url: accountLink.url });
  } catch (error: any) {
    console.error("Error creating Stripe Connect account:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

app.post("/api/stripe/create-comercial-transfer", async (req, res) => {
  try {
    const { comercialId, comercialName, amount, stripeConnectAccountId } = req.body;

    if (!comercialId || !amount || !stripeConnectAccountId) {
      return res.status(400).json({ error: "comercialId, amount, and stripeConnectAccountId are required" });
    }

    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stripeConnectAccountId);
    if (account.capabilities?.transfers !== "active") {
      return res.status(400).json({
        error: "La cuenta Stripe Connect del comercial todavia no tiene transfers activos. Debe completar el onboarding de Stripe.",
      });
    }

    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "eur",
      destination: stripeConnectAccountId,
      description: `Liquidacion de comisiones - ${comercialName || comercialId}`,
      metadata: {
        comercialId,
        comercialName: comercialName || "",
      },
    });

    res.json({
      transferId: transfer.id,
      amount: amountCents / 100,
      destination: stripeConnectAccountId,
    });
  } catch (error: any) {
    console.error("Error creating Stripe transfer:", error);
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
