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

function cleanEnv(value?: string): string {
  let cleaned = (value || "").trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  return !value || normalized.includes("placeholder") || normalized.includes("my_") || normalized.includes("your_");
}

function resolveSupabaseUrl(): string {
  const configured = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  if (!isPlaceholder(configured) && /^https?:\/\//i.test(configured)) {
    return configured;
  }
  return DEFAULT_SUPABASE_URL;
}

function resolveSupabaseKey(): string {
  const configured = cleanEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY,
  );
  if (!isPlaceholder(configured) && configured.length > 20) {
    return configured;
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

const supabaseAdmin = createClient(resolveSupabaseUrl(), resolveSupabaseKey());

const normalizeAdminEmail = (value?: string | null) => (value || "").trim().toLowerCase();
const authorizedAdminEmails = new Set([
  "carlosronco14@gmail.com",
  "mgnacho96@gmail.com",
  ...cleanEnv(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS)
    .split(",")
    .map(normalizeAdminEmail)
    .filter(Boolean),
]);
const authorizedAdminIds = new Set([
  "c2eef079-4ab8-4711-8641-45f0fd4a14e",
  "711ab85b-db59-447c-93df-1951d24b133f",
]);

async function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return res.status(401).json({ error: "Sesión administrativa requerida." });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  const authorized = Boolean(user && (
    authorizedAdminIds.has(user.id) || authorizedAdminEmails.has(normalizeAdminEmail(user.email))
  ));
  if (error || !authorized) return res.status(403).json({ error: "Acceso administrativo no autorizado." });
  res.locals.adminUserId = user!.id;
  next();
}

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

function redactHeaders(headers: express.Request["headers"]) {
  const safeHeaders = { ...headers };
  for (const key of ["authorization", "cookie", "set-cookie", "x-supabase-auth", "stripe-signature"]) {
    if (safeHeaders[key]) safeHeaders[key] = "[redacted]";
  }
  return safeHeaders;
}

// Request logging middleware for debugging API calls
app.use((req, res, next) => {
  const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.path} - Headers: ${JSON.stringify(redactHeaders(req.headers))}\n`;
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
// Primer cobro real confirmado por el usuario: 31/07/2026 14:08:53 en Dubái (UTC+4).
// Los cargos anteriores permanecen en Stripe, pero no cuentan en Finanzas porque eran pruebas.
const STRIPE_FINANCE_TRACKING_START_AT = "2026-07-31T10:08:53.000Z";
const STRIPE_FINANCE_TRACKING_START_UNIX = Math.floor(new Date(STRIPE_FINANCE_TRACKING_START_AT).getTime() / 1000);

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
  const configuredUrl = cleanEnv(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL);
  const isLocalConfiguredUrl = /localhost|127\.0\.0\.1/i.test(configuredUrl);
  if (configuredUrl && !(process.env.NODE_ENV === "production" && isLocalConfiguredUrl)) {
    return configuredUrl.replace(/\/$/, "");
  }

  const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const forwardedHost = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const host = req.get("host") || "localhost:3000";
  const origin = req.headers.origin;

  if (origin && !(process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(origin))) {
    return origin.replace(/\/$/, "");
  }
  if (forwardedHost) return `${forwardedProto || req.protocol}://${forwardedHost}`.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && host.includes("onrender.com")) {
    return `https://${host}`.replace(/\/$/, "");
  }
  return `${req.protocol}://${host}`.replace(/\/$/, "");
}

function formatStripeConnectAccount(account: any) {
  return {
    accountId: account.id,
    onboardingCompleted: Boolean(account.details_submitted),
    payoutsEnabled: Boolean(account.payouts_enabled),
    chargesEnabled: Boolean(account.charges_enabled),
    requirementsDue: account.requirements?.currently_due || [],
    disabledReason: account.requirements?.disabled_reason || "",
  };
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

function addStripeBillingIntervalsKeepingDay(startAt: number, count: number, interval: string): number {
  const source = new Date(startAt);
  const monthOffset = interval === "year" ? count * 12 : count;
  const absoluteMonth = source.getUTCMonth() + monthOffset;
  const targetYear = source.getUTCFullYear() + Math.floor(absoluteMonth / 12);
  const targetMonth = ((absoluteMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return Date.UTC(
    targetYear,
    targetMonth,
    Math.min(source.getUTCDate(), lastDay),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
  );
}

async function ensureFiniteSubscriptionSchedule(
  subscriptionId: string | undefined,
  options: {
    installments?: string | number;
    recurrenceCount?: string | number;
    billingType?: string;
    interval?: string;
  },
): Promise<{ updated: boolean; reason?: string; cancelAt?: number }> {
  if (!subscriptionId) return { updated: false, reason: "missing_subscription_id" };
  const billingType = options.billingType === "subscription" ? "subscription" : "installment";
  const requestedCount = Number.parseInt(String(
    billingType === "subscription" ? options.recurrenceCount || "" : options.installments || "",
  ), 10);
  const minimumCount = billingType === "subscription" ? 1 : 2;
  if (!Number.isFinite(requestedCount) || requestedCount < minimumCount) {
    return { updated: false, reason: "not_finite_subscription" };
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const existingCount = Number.parseInt(
    billingType === "subscription"
      ? subscription.metadata?.althera_recurrence_count || ""
      : subscription.metadata?.installments || "",
    10,
  );
  const effectiveCount = Number.isFinite(existingCount) && existingCount >= minimumCount ? existingCount : requestedCount;
  const recurringInterval = options.interval || subscription.metadata?.interval || subscription.items.data[0]?.price.recurring?.interval || "month";

  const startAt = (subscription.start_date || Math.floor(Date.now() / 1000)) * 1000;
  const cancelAt = Math.floor(addStripeBillingIntervalsKeepingDay(startAt, effectiveCount, recurringInterval) / 1000);

  if (subscription.cancel_at && subscription.cancel_at <= cancelAt) {
    return { updated: false, reason: "already_finite", cancelAt: subscription.cancel_at };
  }

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at: cancelAt,
    metadata: {
      ...(subscription.metadata || {}),
      althera_billing_type: billingType,
      ...(billingType === "subscription"
        ? {
            althera_recurrence_count: String(effectiveCount),
            althera_finite_subscription: "true",
          }
        : {
            installments: String(effectiveCount),
            althera_finite_installment_plan: "true",
            althera_cancel_after_installments: String(effectiveCount),
          }),
    },
  });

  return { updated: true, cancelAt };
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
  const installments =
    subscription.metadata?.installments ||
    invoiceMetadata.installments ||
    invoice.metadata?.installments ||
    "";
  const billingType = subscription.metadata?.althera_billing_type || invoiceMetadata.billingType || invoice.metadata?.billingType || "";
  const recurrenceCount = subscription.metadata?.althera_recurrence_count || invoiceMetadata.recurrenceCount || invoice.metadata?.recurrenceCount || "";
  const recurrenceInterval = subscription.metadata?.interval || invoiceMetadata.interval || invoice.metadata?.interval || "month";

  await ensureFiniteSubscriptionSchedule(subscriptionId, {
    installments,
    recurrenceCount,
    billingType: billingType || (Number.parseInt(String(installments || "0"), 10) > 1 ? "installment" : "subscription"),
    interval: recurrenceInterval,
  });

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
  const installmentCount = Number.parseInt(String(installments || ""), 10);
  const isFiniteInstallmentPlan = billingType === "installment" || (!billingType && Number.isFinite(installmentCount) && installmentCount > 1);

  if (!isFiniteInstallmentPlan && !isFirstInvoice) {
    const sourceTx = matchingRows.find((tx: any) => tx.id === firstPendingTxId) || matchingRows[0];
    if (!sourceTx) return { updated: false, reason: "missing_subscription_source" };
    let recurringDescription = (sourceTx.description || "")
      .replace(/\s*\(Pendiente\)/gi, "")
      .replace(/\s*\[STRIPEINVOICE:[^\]]+\]/g, "")
      .replace(/\s*\[STRIPEURL:[^\]]+\]/g, "")
      .replace(/\s*\[STRIPESESSION:[^\]]+\]/g, "")
      .trim();
    recurringDescription = `${recurringDescription} (Ingreso recurrente Stripe)`;
    recurringDescription = writeTag(recurringDescription, "STRIPEINVOICE", invoiceId);

    const recurringTxId = `tx_stripe_invoice_${invoiceId}`;
    const { error: recurringInsertError } = await supabaseAdmin
      .from("finance_transactions")
      .insert({
        id: recurringTxId,
        user_id: sourceTx.user_id || null,
        type: "income",
        category: sourceTx.category || "Mensualidad",
        amount: Number(invoice.amount_paid || invoice.amount_due || 0) / 100 || Number(sourceTx.amount || 0),
        date: getStripePaidDate(invoice),
        description: recurringDescription,
        "isRecurring": false,
        "recurrencePeriod": null,
        status: "paid",
      });
    if (recurringInsertError && recurringInsertError.code !== "23505") throw recurringInsertError;
    return { updated: !recurringInsertError, reason: recurringInsertError ? "already_processed" : undefined, txId: recurringTxId };
  }

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
            ? { ...item, isPending: false, paymentMethod: "stripe" }
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

async function markStripeCheckoutSessionAsPaid(session: Stripe.Checkout.Session): Promise<{ updated: boolean; reason?: string; txId?: string }> {
  const isPaid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!isPaid) return { updated: false, reason: "payment_not_confirmed" };

  const pendingTxId = session.metadata?.pendingTxId || "";
  if (!pendingTxId) return { updated: false, reason: "missing_pending_transaction" };

  const { data: targetTx, error: txReadError } = await supabaseAdmin
    .from("finance_transactions")
    .select("*")
    .eq("id", pendingTxId)
    .maybeSingle();

  if (txReadError) throw txReadError;
  if (!targetTx) return { updated: false, reason: "transaction_not_found" };

  let updatedDescription = (targetTx.description || "").replace(/\s*\(Pendiente\)/gi, "").trim();
  updatedDescription = writeTag(updatedDescription, "STRIPESESSION", session.id);
  const stripeInvoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
  if (stripeInvoiceId) updatedDescription = writeTag(updatedDescription, "STRIPEINVOICE", stripeInvoiceId);

  const { error: txUpdateError } = await supabaseAdmin
    .from("finance_transactions")
    .update({
      status: "paid",
      date: new Date().toISOString().split("T")[0],
      description: updatedDescription,
    })
    .eq("id", pendingTxId);

  if (txUpdateError) throw txUpdateError;

  const { data: invoices, error: invoiceReadError } = await supabaseAdmin
    .from("finance_invoices")
    .select("*");

  if (invoiceReadError) throw invoiceReadError;

  await Promise.all(
    (invoices || [])
      .filter((financeInvoice: any) =>
        Array.isArray(financeInvoice.items) &&
        financeInvoice.items.some((item: any) => item.pendingTxId === pendingTxId),
      )
      .map((financeInvoice: any) => {
        const items = financeInvoice.items.map((item: any) =>
          item.pendingTxId === pendingTxId
            ? { ...item, isPending: false, paymentMethod: "stripe" }
            : item,
        );
        const status = items.some((item: any) => item.isPending) ? "sent" : "paid";
        return supabaseAdmin
          .from("finance_invoices")
          .update({ items, status })
          .eq("id", financeInvoice.id);
      }),
  );

  return { updated: targetTx.status !== "paid", txId: pendingTxId };
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

    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const result = await markStripeInvoiceAsPaid(event.data.object as Stripe.Invoice);
      console.log(`Processed Stripe ${event.type} webhook:`, result);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const [subscriptionResult, paymentResult] = await Promise.all([
        ensureFiniteSubscriptionSchedule(subscriptionId, {
          installments: session.metadata?.installments,
          recurrenceCount: session.metadata?.recurrenceCount,
          billingType: session.metadata?.billingType,
          interval: session.metadata?.interval,
        }),
        markStripeCheckoutSessionAsPaid(session),
      ]);
      console.log("Processed Stripe checkout.session.completed webhook:", { subscriptionResult, paymentResult });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn("Stripe invoice.payment_failed webhook:", {
        invoiceId: invoice.id,
        customer: invoice.customer,
        subscription: (invoice as any).subscription,
        amountDue: invoice.amount_due,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      });
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

app.get("/api/stripe/balance", requireAdminAuth, async (_req, res) => {
  try {
    const balance = await getStripe().balance.retrieve();
    const normalizeAmounts = (items: Stripe.Balance.Available[] | Stripe.Balance.Pending[]) =>
      items.map(item => ({
        amount: Number(item.amount || 0) / 100,
        currency: item.currency,
      }));

    res.setHeader("Cache-Control", "no-store");
    res.json({
      available: normalizeAmounts(balance.available),
      pending: normalizeAmounts(balance.pending),
      livemode: balance.livemode,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error retrieving Stripe balance:", error);
    res.status(500).json({ error: error?.message || "No se pudieron consultar los fondos de Stripe." });
  }
});

app.get("/api/stripe/client-checkout-session", requireAdminAuth, async (req, res) => {
  try {
    const clientId = typeof req.query.clientId === "string" ? req.query.clientId.trim() : "";
    if (!clientId) return res.status(400).json({ error: "clientId is required" });

    const sessions = await getStripe().checkout.sessions.list({ limit: 100 });
    const latestSession = sessions.data
      .filter(session => session.metadata?.clientId === clientId && session.metadata?.althera_deleted !== "true")
      .sort((a, b) => b.created - a.created)[0];

    res.setHeader("Cache-Control", "no-store");
    if (!latestSession) return res.json({ checkoutSession: null });

    const dashboardMode = latestSession.livemode ? "" : "/test";
    return res.json({
      checkoutSession: {
        id: latestSession.id,
        status: latestSession.status,
        paymentStatus: latestSession.payment_status,
        mode: latestSession.mode,
        url: latestSession.url,
        expiresAt: latestSession.expires_at,
        amountTotal: latestSession.amount_total ? latestSession.amount_total / 100 : null,
        currency: latestSession.currency,
        dashboardUrl: `https://dashboard.stripe.com${dashboardMode}/checkout/sessions/${latestSession.id}`,
        metadata: {
          pendingTxId: latestSession.metadata?.pendingTxId || "",
          stripePlanId: latestSession.metadata?.stripePlanId || "",
          installmentIndex: latestSession.metadata?.installmentIndex || "",
          installments: latestSession.metadata?.installments || "",
        },
      },
    });
  } catch (error: any) {
    console.error("Error retrieving latest client checkout session:", error);
    return res.status(500).json({ error: error?.message || "No se pudo recuperar el enlace de Stripe del cliente." });
  }
});

app.post("/api/stripe/invalidate-checkout-sessions", requireAdminAuth, async (req, res) => {
  try {
    const requestedSessionIds: unknown[] = Array.isArray(req.body?.sessionIds) ? req.body.sessionIds : [];
    const sessionIds = Array.from(new Set<string>(
      requestedSessionIds
        .filter((value: unknown): value is string => typeof value === "string" && value.startsWith("cs_"))
        .slice(0, 50),
    ));
    if (sessionIds.length === 0) return res.json({ invalidated: [], skipped: [] });

    const stripe = getStripe();
    const results = await Promise.all(sessionIds.map(async sessionId => {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      await stripe.checkout.sessions.update(sessionId, {
        metadata: { ...(session.metadata || {}), althera_deleted: "true" },
      });
      if (session.status === "open") {
        await stripe.checkout.sessions.expire(sessionId);
        return { sessionId, action: "expired" };
      }
      return { sessionId, action: "hidden", status: session.status, paymentStatus: session.payment_status };
    }));

    res.json({
      invalidated: results.filter(result => result.action === "expired"),
      skipped: results.filter(result => result.action !== "expired"),
    });
  } catch (error: any) {
    console.error("Error invalidating Stripe checkout sessions:", error);
    res.status(500).json({ error: error?.message || "No se pudieron retirar los enlaces de Stripe." });
  }
});

app.get("/api/stripe/finance-overview", requireAdminAuth, async (_req, res) => {
  try {
    const stripe = getStripe();
    const [subscriptions, paidInvoices, openInvoices, charges] = await Promise.all([
      stripe.subscriptions
        .list({ status: "active", limit: 100, expand: ["data.customer"] })
        .autoPagingToArray({ limit: 1_000 }),
      stripe.invoices
        .list({ status: "paid", limit: 100 })
        .autoPagingToArray({ limit: 10_000 }),
      stripe.invoices
        .list({ status: "open", limit: 100 })
        .autoPagingToArray({ limit: 10_000 }),
      stripe.charges
        .list({
          limit: 100,
          created: { gte: STRIPE_FINANCE_TRACKING_START_UNIX },
          expand: ["data.customer"],
        })
        .autoPagingToArray({ limit: 10_000 }),
    ]);

    const addCurrencyAmount = (totals: Map<string, number>, currency: string, amount: number) => {
      const normalizedCurrency = String(currency || "eur").toLowerCase();
      totals.set(normalizedCurrency, (totals.get(normalizedCurrency) || 0) + amount);
    };
    const monthlyRecurringTotals = new Map<string, number>();
    const chargedVolumeTotals = new Map<string, number>();

    const isFiniteInstallmentSubscription = (subscription: Stripe.Subscription): boolean =>
      subscription.metadata?.althera_billing_type === "installment" ||
      (subscription.metadata?.althera_billing_type !== "subscription" && (
        subscription.metadata?.althera_finite_installment_plan === "true" ||
        Number.parseInt(subscription.metadata?.althera_cancel_after_installments || subscription.metadata?.installments || "0", 10) > 1
      ));
    const recurringMembershipSubscriptions = subscriptions.filter(subscription => !isFiniteInstallmentSubscription(subscription));

    const getMonthlyFactor = (recurring: Stripe.Price.Recurring | null | undefined): number => {
      if (!recurring) return 0;
      const intervalCount = Math.max(1, Number(recurring.interval_count || 1));
      if (recurring.interval === "year") return 1 / (12 * intervalCount);
      if (recurring.interval === "week") return 52 / (12 * intervalCount);
      if (recurring.interval === "day") return 365 / (12 * intervalCount);
      return 1 / intervalCount;
    };

    recurringMembershipSubscriptions.forEach(subscription => {
      subscription.items.data.forEach(item => {
        if (!item.price.recurring) return;
        const unitAmount = Number(item.price.unit_amount_decimal || item.price.unit_amount || 0) / 100;
        const monthlyAmount = unitAmount * Number(item.quantity || 1) * getMonthlyFactor(item.price.recurring);
        addCurrencyAmount(monthlyRecurringTotals, item.price.currency, monthlyAmount);
      });
    });

    const successfulCharges = charges.filter(charge => charge.paid && Number(charge.amount || 0) > 0);
    successfulCharges.forEach(charge => {
      const netCaptured = Math.max(0, Number(charge.amount || 0) - Number(charge.amount_refunded || 0)) / 100;
      addCurrencyAmount(chargedVolumeTotals, charge.currency, netCaptured);
    });

    const invoicesForSubscription = (subscriptionId: string, invoices: Stripe.Invoice[]) =>
      invoices.filter(invoice => getStripeInvoiceSubscriptionId(invoice) === subscriptionId);

    const activeSubscriptions = subscriptions.map(subscription => {
      const customer = typeof subscription.customer === "string" ? null : subscription.customer as any;
      const subscriptionPaidInvoices = invoicesForSubscription(subscription.id, paidInvoices)
        .filter(invoice => {
          const paidAt = Number(invoice.status_transitions?.paid_at || invoice.created || 0);
          return Number(invoice.amount_paid || 0) > 0 && paidAt >= STRIPE_FINANCE_TRACKING_START_UNIX;
        });
      const subscriptionOpenInvoices = invoicesForSubscription(subscription.id, openInvoices);
      const firstItem = subscription.items.data[0];
      const amount = subscription.items.data.reduce(
        (sum, item) => sum + (Number(item.price.unit_amount_decimal || item.price.unit_amount || 0) / 100) * Number(item.quantity || 1),
        0,
      );
      const lastPaidInvoice = [...subscriptionPaidInvoices].sort(
        (a, b) => Number(b.status_transitions?.paid_at || b.created) - Number(a.status_transitions?.paid_at || a.created),
      )[0];

      return {
        id: subscription.id,
        customerId: typeof subscription.customer === "string" ? subscription.customer : customer?.id || "",
        customerName: customer?.name || subscription.metadata?.clientName || customer?.email || "Cliente Stripe",
        customerEmail: customer?.email || subscription.metadata?.clientEmail || "",
        status: subscription.status,
        amount,
        currency: firstItem?.price.currency || "eur",
        interval: firstItem?.price.recurring?.interval || "month",
        intervalCount: firstItem?.price.recurring?.interval_count || 1,
        billingType: isFiniteInstallmentSubscription(subscription) ? "installment" : "subscription",
        installmentCount: Number.parseInt(subscription.metadata?.althera_cancel_after_installments || subscription.metadata?.installments || "0", 10) || null,
        paymentCount: subscriptionPaidInvoices.length,
        paidAmount: subscriptionPaidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount_paid || 0), 0) / 100,
        openAmount: subscriptionOpenInvoices.reduce((sum, invoice) => sum + Number(invoice.amount_remaining || 0), 0) / 100,
        lastPaidAt: lastPaidInvoice
          ? new Date(Number(lastPaidInvoice.status_transitions?.paid_at || lastPaidInvoice.created) * 1000).toISOString()
          : null,
        dashboardUrl: `https://dashboard.stripe.com${subscription.livemode ? "" : "/test"}/subscriptions/${subscription.id}`,
      };
    });

    const paymentHistory = successfulCharges
      .sort((a, b) => b.created - a.created)
      .slice(0, 100)
      .map(charge => {
        const customer = typeof charge.customer === "string" ? null : charge.customer as any;
        const paymentIntentId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id || "";
        return {
          id: charge.id,
          paymentIntentId,
          concept: charge.description || charge.metadata?.concept || "Pago procesado por Stripe",
          customerName: customer?.name || charge.billing_details?.name || customer?.email || charge.billing_details?.email || "Cliente Stripe",
          customerEmail: customer?.email || charge.billing_details?.email || "",
          amount: Number(charge.amount || 0) / 100,
          refundedAmount: Number(charge.amount_refunded || 0) / 100,
          currency: charge.currency,
          paidAt: new Date(charge.created * 1000).toISOString(),
          status: charge.refunded ? "refunded" : charge.amount_refunded ? "partially_refunded" : "paid",
          receiptUrl: charge.receipt_url || "",
          dashboardUrl: `https://dashboard.stripe.com${charge.livemode ? "" : "/test"}/payments/${paymentIntentId || charge.id}`,
        };
      });

    const normalizeTotals = (totals: Map<string, number>) =>
      [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));

    res.setHeader("Cache-Control", "no-store");
    res.json({
      activeSubscriptions,
      paymentHistory,
      totals: {
        activeSubscriptions: recurringMembershipSubscriptions.length,
        activeInstallmentPlans: subscriptions.length - recurringMembershipSubscriptions.length,
        mrr: normalizeTotals(monthlyRecurringTotals),
        chargedVolume: normalizeTotals(chargedVolumeTotals),
        successfulPayments: successfulCharges.length,
      },
      livemode: subscriptions[0]?.livemode ?? successfulCharges[0]?.livemode ?? false,
      trackingStartedAt: STRIPE_FINANCE_TRACKING_START_AT,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error retrieving Stripe finance overview:", error);
    res.status(500).json({ error: error?.message || "No se pudo consultar la información financiera real de Stripe." });
  }
});

// Create subscription or single payment checkout session
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const { clientId, clientName, clientEmail, amount, interval, installments, recurrenceCount, billingType, concept, pendingTxId, stripePlanId, installmentIndex, previousSessionId } = req.body;

    if (!clientId || !clientEmail || !amount) {
      return res.status(400).json({ error: "clientId, clientEmail, and amount are required" });
    }
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0 || amountNumber > 1_000_000) {
      return res.status(400).json({ error: "El importe debe ser un número válido superior a cero." });
    }
    if (!new Set(["once", "month", "year"]).has(interval || "month")) {
      return res.status(400).json({ error: "La modalidad de cobro no es válida." });
    }
    if (String(concept || "").length > 180) {
      return res.status(400).json({ error: "El concepto no puede superar los 180 caracteres." });
    }

    const stripe = getStripe();
    let effectiveAmountNumber = amountNumber;
    let effectiveInterval = interval || "month";
    let effectiveInstallments = installments || "";
    let effectiveRecurrenceCount = recurrenceCount || "";
    let effectiveBillingType = billingType || (Number.parseInt(String(installments || "0"), 10) > 1 ? "installment" : "subscription");
    let effectiveConcept = concept || "";
    let effectivePendingTxId = pendingTxId || "";
    let effectiveStripePlanId = stripePlanId || "";
    let effectiveInstallmentIndex = installmentIndex || "";

    if (previousSessionId) {
      const previousSession = await stripe.checkout.sessions.retrieve(previousSessionId);
      const previousPendingTxId = previousSession.metadata?.pendingTxId || "";
      const previousStripePlanId = previousSession.metadata?.stripePlanId || "";
      const belongsToSameClient = !previousSession.metadata?.clientId || previousSession.metadata.clientId === clientId;
      const belongsToSameTransaction = !previousPendingTxId || previousPendingTxId === pendingTxId;
      const belongsToSamePlan = Boolean(previousStripePlanId && stripePlanId && previousStripePlanId === stripePlanId);
      if (!belongsToSameClient || (!belongsToSameTransaction && !belongsToSamePlan)) {
        return res.status(409).json({ error: "El enlace anterior no pertenece a este cobro." });
      }
      if (previousSession.payment_status === "paid" || previousSession.status !== "expired") {
        return res.status(409).json({ error: "El enlace solo se puede renovar cuando Stripe confirma que ha caducado y sigue sin pagar." });
      }

      effectiveAmountNumber = previousSession.amount_total
        ? previousSession.amount_total / 100
        : amountNumber;
      effectiveInterval = previousSession.metadata?.interval || effectiveInterval;
      effectiveInstallments = previousSession.metadata?.installments || effectiveInstallments;
      effectiveRecurrenceCount = previousSession.metadata?.recurrenceCount || effectiveRecurrenceCount;
      effectiveBillingType = previousSession.metadata?.billingType || effectiveBillingType;
      effectiveConcept = previousSession.metadata?.concept || effectiveConcept;
      effectivePendingTxId = previousPendingTxId || effectivePendingTxId;
      effectiveStripePlanId = previousStripePlanId || effectiveStripePlanId;
      effectiveInstallmentIndex = previousSession.metadata?.installmentIndex || effectiveInstallmentIndex;
    }
    const appUrl = getAppUrl(req);
    const isSubscription = effectiveInterval !== "once";

    const lineItem: any = {
      price_data: {
        currency: "eur",
        product_data: {
          name: effectiveConcept || (isSubscription
            ? `Mensualidad Automática - ${clientName || "Cliente"}` 
            : `Pago Único - ${clientName || "Cliente"}`),
          description: isSubscription 
            ? `Suscripción recurrente de pago para el cliente ${clientName || clientEmail}` 
            : `Pago único de servicio para el cliente ${clientName || clientEmail}`,
        },
        unit_amount: Math.round(effectiveAmountNumber * 100), // convert to cents
      },
      quantity: 1,
    };

    if (isSubscription) {
      lineItem.price_data.recurring = {
        interval: effectiveInterval === "year" ? "year" : "month",
      };
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: isSubscription ? "subscription" : "payment",
      customer_email: clientEmail,
      success_url: `${appUrl}?stripe_session_id={CHECKOUT_SESSION_ID}&stripe_status=success&client_id=${clientId}&amount=${effectiveAmountNumber}&interval=${effectiveInterval}&installments=${effectiveInstallments}&concept=${encodeURIComponent(effectiveConcept)}&pending_tx_id=${effectivePendingTxId}&stripe_plan_id=${effectiveStripePlanId}&installment_index=${effectiveInstallmentIndex}`,
      cancel_url: `${appUrl}?stripe_status=cancel&client_id=${clientId}`,
      metadata: {
        clientId,
        clientName: clientName || "",
        clientEmail,
        interval: effectiveInterval,
        installments: effectiveInstallments,
        recurrenceCount: effectiveRecurrenceCount,
        billingType: effectiveBillingType,
        concept: effectiveConcept,
        pendingTxId: effectivePendingTxId,
        stripePlanId: effectiveStripePlanId,
        installmentIndex: effectiveInstallmentIndex,
      },
    };

    if (isSubscription) {
      sessionConfig.subscription_data = {
        metadata: {
          clientId,
          pendingTxId: effectivePendingTxId,
          stripePlanId: effectiveStripePlanId,
          installments: effectiveInstallments,
          recurrenceCount: effectiveRecurrenceCount,
          billingType: effectiveBillingType,
          interval: effectiveInterval,
        },
      };
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({
      url: session.url,
      sessionId: session.id,
      mode: session.mode,
      status: session.status,
      paymentStatus: session.payment_status,
      expiresAt: session.expires_at,
    });
  } catch (error: any) {
    console.error("Error creating stripe checkout session:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

// Create billing customer portal session
app.post("/api/stripe/create-portal-session", requireAdminAuth, async (req, res) => {
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

app.post("/api/stripe/customer-overview", requireAdminAuth, async (req, res) => {
  try {
    const { customerId, subscriptionId, checkoutSessionId, invoiceId, email } = req.body || {};
    const stripe = getStripe();

    let resolvedCustomerId = typeof customerId === "string" ? customerId : "";
    let checkoutSession: Stripe.Checkout.Session | null = null;

    if (checkoutSessionId && typeof checkoutSessionId === "string" && !checkoutSessionId.includes("_mock_")) {
      checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ["customer", "subscription", "payment_intent"],
      });
      const sessionCustomer = checkoutSession.customer;
      if (!resolvedCustomerId) {
        resolvedCustomerId = typeof sessionCustomer === "string" ? sessionCustomer : sessionCustomer?.id || "";
      }
    }

    if (!resolvedCustomerId && invoiceId && typeof invoiceId === "string") {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const invoiceCustomer = invoice.customer;
      resolvedCustomerId = typeof invoiceCustomer === "string" ? invoiceCustomer : invoiceCustomer?.id || "";
    }

    if (!resolvedCustomerId && subscriptionId && typeof subscriptionId === "string") {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const subscriptionCustomer = subscription.customer;
      resolvedCustomerId = typeof subscriptionCustomer === "string" ? subscriptionCustomer : subscriptionCustomer?.id || "";
    }

    if (!resolvedCustomerId && email && typeof email === "string") {
      const customersByEmail = await stripe.customers.list({ email, limit: 1 });
      resolvedCustomerId = customersByEmail.data[0]?.id || "";
    }

    if (!resolvedCustomerId) {
      return res.status(404).json({ error: "No se encontro cliente de Stripe para esta ficha." });
    }

    const [customer, subscriptions, invoices, paymentIntents] = await Promise.all([
      stripe.customers.retrieve(resolvedCustomerId),
      stripe.subscriptions.list({ customer: resolvedCustomerId, status: "all", limit: 10 }),
      stripe.invoices.list({ customer: resolvedCustomerId, limit: 12 }),
      stripe.paymentIntents.list({ customer: resolvedCustomerId, limit: 12 }),
    ]);

    const normalizedSubscriptions = subscriptions.data.map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cancelAt: sub.cancel_at,
      canceledAt: sub.canceled_at,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      amount:
        sub.items?.data?.[0]?.price?.unit_amount !== undefined
          ? sub.items.data[0].price.unit_amount / 100
          : null,
      currency: sub.currency,
      interval: sub.items?.data?.[0]?.price?.recurring?.interval || null,
      productName: sub.items?.data?.[0]?.price?.nickname || sub.description || null,
      dashboardUrl: `https://dashboard.stripe.com/subscriptions/${sub.id}`,
    }));

    const normalizedInvoices = invoices.data.map((invoice: any) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      paid: invoice.paid,
      amountDue: (invoice.amount_due || 0) / 100,
      amountPaid: (invoice.amount_paid || 0) / 100,
      amountRemaining: (invoice.amount_remaining || 0) / 100,
      currency: invoice.currency,
      created: invoice.created,
      dueDate: invoice.due_date,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      subscriptionId: typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id || null,
      dashboardUrl: `https://dashboard.stripe.com/invoices/${invoice.id}`,
    }));

    const normalizedPayments = paymentIntents.data.map((payment: any) => ({
      id: payment.id,
      status: payment.status,
      amount: (payment.amount || 0) / 100,
      amountReceived: (payment.amount_received || 0) / 100,
      currency: payment.currency,
      created: payment.created,
      description: payment.description,
      latestCharge: typeof payment.latest_charge === "string" ? payment.latest_charge : payment.latest_charge?.id || null,
      dashboardUrl: `https://dashboard.stripe.com/payments/${payment.id}`,
    }));

    const activeCustomer = customer as Stripe.Customer;

    res.json({
      customer:
        "deleted" in customer && customer.deleted
          ? { id: resolvedCustomerId, deleted: true }
          : {
              id: activeCustomer.id,
              email: activeCustomer.email,
              name: activeCustomer.name,
              phone: activeCustomer.phone,
              balance: activeCustomer.balance,
              delinquent: activeCustomer.delinquent,
              created: activeCustomer.created,
              dashboardUrl: `https://dashboard.stripe.com/customers/${activeCustomer.id}`,
            },
      checkoutSession: checkoutSession
        ? {
            id: checkoutSession.id,
            status: checkoutSession.status,
            paymentStatus: checkoutSession.payment_status,
            amountTotal: checkoutSession.amount_total ? checkoutSession.amount_total / 100 : null,
            currency: checkoutSession.currency,
            url: checkoutSession.url,
          }
        : null,
      subscriptions: normalizedSubscriptions,
      invoices: normalizedInvoices,
      payments: normalizedPayments,
      totals: {
        paidInvoices: normalizedInvoices.filter(inv => inv.paid).reduce((sum, inv) => sum + inv.amountPaid, 0),
        openInvoices: normalizedInvoices.filter(inv => inv.status === "open").reduce((sum, inv) => sum + inv.amountRemaining, 0),
        successfulPayments: normalizedPayments.filter(p => p.status === "succeeded").reduce((sum, p) => sum + p.amountReceived, 0),
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error retrieving Stripe customer overview:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

app.post("/api/stripe/cancel-subscription", requireAdminAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.body || {};
    if (!subscriptionId || typeof subscriptionId !== "string") {
      return res.status(400).json({ error: "subscriptionId is required" });
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    res.json({
      id: subscription.id,
      status: subscription.status,
      canceledAt: subscription.canceled_at,
      dashboardUrl: `https://dashboard.stripe.com/subscriptions/${subscription.id}`,
    });
  } catch (error: any) {
    console.error("Error canceling stripe subscription:", error);
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
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        comercialId,
        comercialName: comercialName || "",
      },
    })).id;

    if (existingAccountId) {
      await stripe.accounts.update(accountId, {
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
    }

    const account = await stripe.accounts.retrieve(accountId);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}?stripe_connect=refresh&comercial_id=${comercialId}`,
      return_url: `${appUrl}?stripe_connect=success&comercial_id=${comercialId}&stripe_account_id=${accountId}`,
      type: "account_onboarding",
    });

    res.json({ ...formatStripeConnectAccount(account), url: accountLink.url });
  } catch (error: any) {
    console.error("Error creating Stripe Connect account:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
});

app.post("/api/stripe/connect-account-status", async (req, res) => {
  try {
    const { stripeConnectAccountId } = req.body;
    if (!stripeConnectAccountId) {
      return res.status(400).json({ error: "stripeConnectAccountId is required" });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stripeConnectAccountId);
    res.json(formatStripeConnectAccount(account));
  } catch (error: any) {
    console.error("Error retrieving Stripe Connect account:", error);
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
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["invoice"] });
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const [, paymentResult] = await Promise.all([
      ensureFiniteSubscriptionSchedule(subscriptionId, {
        installments: session.metadata?.installments,
        recurrenceCount: session.metadata?.recurrenceCount,
        billingType: session.metadata?.billingType,
        interval: session.metadata?.interval,
      }),
      markStripeCheckoutSessionAsPaid(session),
    ]);
    
    res.json({
      customerId: session.customer,
      subscriptionId,
      mode: session.mode,
      paymentStatus: session.payment_status,
      status: session.status,
      expiresAt: session.expires_at,
      url: session.url,
      transactionUpdated: paymentResult.updated,
      transactionId: paymentResult.txId,
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
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      const safeAppUrl = getAppUrl(req).replace(/[<>"']/g, "");
      const html = fs.readFileSync(indexPath, "utf8").replaceAll("__APP_ORIGIN__", safeAppUrl);
      res.type("html").send(html);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
