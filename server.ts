import express from "express";
import path from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createHmac, randomBytes } from "crypto";

import fs from "fs";

dotenv.config({ path: ".env.local" });
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

let bitesAdminClient: ReturnType<typeof createClient> | null = null;
const BITES_PROJECT_URL = "https://ziwumcqfykbshcvycnnb.supabase.co";
const BITES_PUBLISHABLE_KEY = "sb_publishable__zbCiwuAZY4tgqRpHjuCEg_UFU_6-WF";

function getBitesIntegrationConfig() {
  const url = cleanEnv(process.env.BITES_SUPABASE_URL) || BITES_PROJECT_URL;
  const publishableKey = cleanEnv(process.env.BITES_SUPABASE_PUBLISHABLE_KEY) || BITES_PUBLISHABLE_KEY;
  const explicitToken = cleanEnv(process.env.BITES_ALTHERA_INTEGRATION_TOKEN);
  const derivationSecret = cleanEnv(
    process.env.BITES_INTEGRATION_DERIVATION_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      process.env.STRIPE_SECRET_KEY,
  );
  const token = explicitToken || (derivationSecret
    ? createHmac("sha256", derivationSecret).update("althera:bites:overview:v1").digest("base64url")
    : "");
  if (isPlaceholder(url) || !/^https:\/\//i.test(url) || isPlaceholder(publishableKey) || isPlaceholder(token)) {
    return null;
  }
  return { url: url.replace(/\/$/, ""), publishableKey, token };
}

function getBitesAdminClient() {
  if (bitesAdminClient) return bitesAdminClient;

  const url = cleanEnv(process.env.BITES_SUPABASE_URL);
  const secret = cleanEnv(
    process.env.BITES_SUPABASE_SECRET_KEY || process.env.BITES_SUPABASE_SERVICE_ROLE_KEY,
  );
  if (isPlaceholder(url) || !/^https:\/\//i.test(url) || isPlaceholder(secret) || secret.length < 20) {
    throw new Error("BITES_CONNECTION_NOT_CONFIGURED");
  }

  bitesAdminClient = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "althera-bites-readonly-dashboard" } },
  });
  return bitesAdminClient;
}

async function listBitesAuthUsers(client: ReturnType<typeof createClient>) {
  const users: Array<{
    id: string;
    email: string | null;
    createdAt: string;
    lastSignInAt: string | null;
    confirmedAt: string | null;
  }> = [];

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data.users || [];
    users.push(...batch.map((user) => ({
      id: user.id,
      email: user.email || null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at || null,
      confirmedAt: user.email_confirmed_at || user.confirmed_at || null,
    })));
    if (batch.length < 1000) break;
  }
  return users;
}

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
const STRIPE_PAYOUT_TRACKING_START_UNIX = Math.floor(new Date("2026-08-30T13:05:07.971Z").getTime() / 1000);

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

async function syncPaidStripePayoutToRevolut(payout: Stripe.Payout): Promise<boolean> {
  if (
    payout.status !== "paid" ||
    payout.currency.toLowerCase() !== "eur" ||
    payout.arrival_date < STRIPE_PAYOUT_TRACKING_START_UNIX
  ) {
    return false;
  }

  const payoutDate = new Date(payout.arrival_date * 1000).toISOString().slice(0, 10);
  const { error } = await supabaseAdmin.from("finance_transactions").upsert({
    id: `tx_stripe_payout_${payout.id}`,
    user_id: null,
    type: "income",
    category: "Transferencia interna",
    amount: Number(payout.amount || 0) / 100,
    date: payoutDate,
    description: `Traspaso Stripe a Revolut [PM:transfer] [PACC:revolut_pro]`,
    "isRecurring": false,
    "recurrencePeriod": null,
    status: "paid",
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
  return true;
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

const STRIPE_SHORT_LINK_CODE_PATTERN = /^[a-f0-9]{8}$/;

async function createStripeShortLink(input: {
  stripeUrl: string;
  stripeCheckoutSessionId: string;
  clientId: string;
  pendingTxId?: string;
  stripePlanId?: string;
  concept?: string;
}): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = randomBytes(4).toString("hex");
    const { error } = await supabaseAdmin
      .from("stripe_short_links")
      .insert({
        slug,
        stripe_url: input.stripeUrl,
        stripe_checkout_session_id: input.stripeCheckoutSessionId,
        client_id: input.clientId,
        pending_tx_id: input.pendingTxId || null,
        stripe_plan_id: input.stripePlanId || null,
        concept: input.concept || null,
      });

    if (!error) return slug;
    if (error.code !== "23505") throw error;
  }

  throw new Error("No se pudo reservar un identificador único para el enlace de pago.");
}

async function getShareableStripeUrl(
  stripeCheckoutSessionId: string,
  stripeUrl: string | null,
  appUrl: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("stripe_short_links")
    .select("slug")
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
    .maybeSingle();

  if (error) throw error;
  return data?.slug ? `${appUrl}/p/${data.slug}` : stripeUrl;
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
  const paidAt = (invoice.status_transitions?.paid_at || invoice.created || Math.floor(Date.now() / 1000)) * 1000;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(paidAt));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function getContactMetadataValue(rawValue: unknown, key: string): string {
  const marker = "\n\n---METADATA---";
  const metadataText = String(rawValue || "").split(marker)[1] || "";
  const line = metadataText.split("\n").find(candidate => candidate.slice(0, candidate.indexOf(":")) === key);
  if (!line) return "";
  const value = line.slice(line.indexOf(":") + 1).trim();
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanFinanceDescription(description: string): string {
  return String(description || "")
    .replace(/\s*\[[A-Z_]+:[^\]]+\]/g, "")
    .replace(/\s*\((?:Pendiente|Ingreso recurrente Stripe|Cobro denegado Stripe|Enlace de pago caducado)\)/gi, "")
    .trim();
}

async function ensureInternalInvoiceForPaidStripeRecurrence(
  invoice: Stripe.Invoice,
  transactionId?: string,
): Promise<{ created: boolean; invoiceId?: string; reason?: string }> {
  const stripeInvoiceId = invoice.id;
  const subscriptionId = getStripeInvoiceSubscriptionId(invoice);
  if (!stripeInvoiceId || !subscriptionId) return { created: false, reason: "not_subscription_invoice" };

  const grossTotal = Number(invoice.amount_paid || 0) / 100;
  if (invoice.status !== "paid" || grossTotal <= 0) return { created: false, reason: "invoice_not_paid" };

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const invoiceMetadata = (invoice as any).subscription_details?.metadata || {};
  const clientId = subscription.metadata?.clientId || invoiceMetadata.clientId || invoice.metadata?.clientId || "";

  const [{ data: contact, error: contactError }, customerResult] = await Promise.all([
    clientId
      ? supabaseAdmin.from("contacts").select("id,name,email,location,hostingCredentials").eq("id", clientId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    typeof subscription.customer === "string"
      ? stripe.customers.retrieve(subscription.customer).catch(() => null)
      : Promise.resolve(subscription.customer || null),
  ]);
  if (contactError) throw contactError;

  const customer = customerResult && !(customerResult as any).deleted ? customerResult as Stripe.Customer : null;
  const fiscalName = getContactMetadataValue(contact?.hostingCredentials, "fiscalName");
  const clientTaxId = getContactMetadataValue(contact?.hostingCredentials, "taxId");
  const clientAddress = getContactMetadataValue(contact?.hostingCredentials, "fiscalAddress") || contact?.location || "";
  const configuredTaxValue = getContactMetadataValue(contact?.hostingCredentials, "taxPercentage");
  const configuredTax = configuredTaxValue === "" ? Number.NaN : Number(configuredTaxValue);
  const taxPercentage = Number.isFinite(configuredTax) && configuredTax >= 0 ? configuredTax : 21;
  const subtotal = Number((grossTotal / (1 + taxPercentage / 100)).toFixed(2));
  const taxAmount = Number((grossTotal - subtotal).toFixed(2));
  const paidDate = getStripePaidDate(invoice);
  const year = Number(paidDate.slice(0, 4)) || new Date().getFullYear();
  const currencyCode = String(invoice.currency || "eur").toUpperCase();
  const supportedCurrency = ["EUR", "USD", "GBP", "MXN", "CHF"].includes(currencyCode) ? currencyCode : "EUR";

  const sourceTransaction = transactionId
    ? (await supabaseAdmin.from("finance_transactions").select("id,user_id,description").eq("id", transactionId).maybeSingle()).data
    : null;
  const lineDescription = (invoice.lines?.data || []).map((line: any) => line.description).find(Boolean);
  const concept =
    subscription.metadata?.concept ||
    invoiceMetadata.concept ||
    invoice.metadata?.concept ||
    cleanFinanceDescription(sourceTransaction?.description || "") ||
    lineDescription ||
    "Servicio recurrente Althera";

  const notes = [
    "Factura generada automáticamente tras la confirmación del cobro recurrente por Stripe.",
    clientTaxId ? `[CLIENT_TAX_ID:${encodeURIComponent(clientTaxId)}]` : "",
    clientAddress ? `[CLIENT_ADDRESS:${encodeURIComponent(clientAddress)}]` : "",
    `[ISSUER_NAME:${encodeURIComponent("Carlos Ronco Meneses")}]`,
    `[ISSUER_TAX_ID:${encodeURIComponent("09104663K")}]`,
    `[ISSUER_ADDRESS:${encodeURIComponent("Carrer dels Tamarells 1, 07800 - Ibiza, España")}]`,
    `[ISSUER_BRAND:${encodeURIComponent("Althera Solutions")}]`,
    `[ISSUER_EMAIL:${encodeURIComponent("contacto@altherasolutions.com")}]`,
    `[INVOICE_CURRENCY:${supportedCurrency}]`,
    `[INVOICE_LANGUAGE:${getContactMetadataValue(contact?.hostingCredentials, "language") || "es"}]`,
  ].filter(Boolean).join("\n");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [{ data: existingInvoices, error: existingInvoiceError }, { data: currentInvoices, error: invoiceReadError }] = await Promise.all([
      supabaseAdmin
        .from("finance_invoices")
        .select("id")
        .contains("items", [{ stripeInvoiceId }])
        .limit(1),
      supabaseAdmin
      .from("finance_invoices")
      .select("id")
      .or(`id.ilike.AL-${year}-%,id.ilike.FAC-${year}-%`),
    ]);
    if (existingInvoiceError) throw existingInvoiceError;
    if (invoiceReadError) throw invoiceReadError;

    const alreadyCreated = existingInvoices?.[0];
    if (alreadyCreated) return { created: false, invoiceId: alreadyCreated.id, reason: "already_created" };

    const pattern = new RegExp(`^(?:AL|FAC)-${year}-(\\d+)$`, "i");
    const highest = (currentInvoices || []).reduce((max: number, row: any) => {
      const match = String(row.id || "").match(pattern);
      return match ? Math.max(max, Number(match[1]) || 0) : max;
    }, 0);
    const internalInvoiceId = `AL-${year}-${String(highest + 1).padStart(3, "0")}`;
    const item = {
      id: `item_stripe_${stripeInvoiceId}`,
      description: concept,
      quantity: 1,
      unitPrice: subtotal,
      total: subtotal,
      grossAmount: grossTotal,
      isPending: false,
      paymentMethod: "stripe",
      ...(transactionId ? { pendingTxId: transactionId } : {}),
      stripeInvoiceId,
    };
    const { error: insertError } = await supabaseAdmin.from("finance_invoices").insert({
      id: internalInvoiceId,
      user_id: sourceTransaction?.user_id || null,
      clientId: clientId || null,
      clientName: fiscalName || contact?.name || customer?.name || subscription.metadata?.clientName || "Cliente Stripe",
      clientEmail: contact?.email || customer?.email || subscription.metadata?.clientEmail || "",
      date: paidDate,
      dueDate: paidDate,
      status: "paid",
      items: [item],
      subtotal,
      taxPercentage,
      taxAmount,
      total: grossTotal,
      notes,
    });

    if (!insertError) {
      if (transactionId && sourceTransaction) {
        const linkedDescription = writeTag(sourceTransaction.description || "", "INV", internalInvoiceId);
        const { error: linkError } = await supabaseAdmin
          .from("finance_transactions")
          .update({ description: linkedDescription })
          .eq("id", transactionId);
        if (linkError) console.warn("Invoice created but transaction link could not be saved:", linkError.message);
      }
      return { created: true, invoiceId: internalInvoiceId };
    }
    if (insertError.code !== "23505") throw insertError;
  }

  throw new Error(`No se pudo reservar una numeración para la factura Stripe ${stripeInvoiceId}.`);
}

const stripeTransactionColumns = "id,user_id,category,amount,date,description,status";

async function getStripeTransactionCandidates(options: {
  invoiceId: string;
  stripePlanId?: string;
  pendingTxId?: string;
}): Promise<any[]> {
  const queries = [
    supabaseAdmin
      .from("finance_transactions")
      .select(stripeTransactionColumns)
      .ilike("description", `%[STRIPEINVOICE:${options.invoiceId}]%`),
  ];
  if (options.stripePlanId) {
    queries.push(
      supabaseAdmin
        .from("finance_transactions")
        .select(stripeTransactionColumns)
        .ilike("description", `%[STRIPEPLAN:${options.stripePlanId}]%`),
    );
  }
  if (options.pendingTxId) {
    queries.push(
      supabaseAdmin
        .from("finance_transactions")
        .select(stripeTransactionColumns)
        .eq("id", options.pendingTxId),
    );
  }

  const results = await Promise.all(queries);
  const rows = new Map<string, any>();
  results.forEach(result => {
    if (result.error) throw result.error;
    (result.data || []).forEach(row => rows.set(row.id, row));
  });
  return [...rows.values()];
}

function writeContactMetadataValues(rawValue: string, values: Record<string, string>): string {
  const marker = "\n\n---METADATA---";
  const markerIndex = rawValue.indexOf(marker);
  const credentials = markerIndex >= 0 ? rawValue.slice(0, markerIndex) : rawValue;
  const metadataText = markerIndex >= 0 ? rawValue.slice(markerIndex + marker.length) : "";
  const keys = new Set(Object.keys(values));
  const lines = metadataText
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !keys.has(line.slice(0, line.indexOf(":"))));
  Object.entries(values).forEach(([key, value]) => {
    if (value) lines.push(`${key}: ${value}`);
  });
  return `${credentials}${marker}\n${lines.join("\n")}`;
}

async function syncStripeSubscriptionToContact(subscription: Stripe.Subscription): Promise<{ updated: boolean; reason?: string }> {
  const clientId = subscription.metadata?.clientId || "";
  if (!clientId) return { updated: false, reason: "missing_client_id" };

  const { data: contact, error: contactReadError } = await supabaseAdmin
    .from("contacts")
    .select("id,hostingCredentials")
    .eq("id", clientId)
    .maybeSingle();
  if (contactReadError) throw contactReadError;
  if (!contact) return { updated: false, reason: "contact_not_found" };

  const status = ["active", "trialing", "canceled", "past_due"].includes(subscription.status)
    ? subscription.status
    : subscription.status === "unpaid"
      ? "past_due"
      : "none";
  const firstItem = subscription.items.data[0];
  const amount = subscription.items.data.reduce(
    (sum, item) => sum + Number(item.price.unit_amount || 0) * Number(item.quantity || 1),
    0,
  ) / 100;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const hostingCredentials = writeContactMetadataValues(String(contact.hostingCredentials || ""), {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: status,
    stripeSubscriptionPrice: String(amount),
    stripeSubscriptionInterval: firstItem?.price.recurring?.interval || "month",
  });

  const { error: contactUpdateError } = await supabaseAdmin
    .from("contacts")
    .update({ hostingCredentials })
    .eq("id", clientId);
  if (contactUpdateError) throw contactUpdateError;
  return { updated: true };
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

function getCancelAtAfterFinalChargeDate(subscription: Stripe.Subscription, finalChargeDate: string): number {
  const recurringInterval = subscription.items.data[0]?.price.recurring?.interval || "month";
  const billingAnchor = subscription.trial_end || subscription.billing_cycle_anchor || subscription.start_date;
  if (!billingAnchor) throw new Error("Stripe no devolvió el inicio del ciclo de facturación.");

  // The requested date represents a real renewal date, not an arbitrary day.
  // Resolve it from Stripe's original billing anchor so end-of-month plans keep
  // their natural sequence (31 Jan -> 28 Feb -> 31 Mar, for example).
  const targetDate = finalChargeDate;
  const maxOccurrences = recurringInterval === "year" ? 100 : 1200;
  for (let occurrence = 0; occurrence <= maxOccurrences; occurrence += 1) {
    const chargeAt = addStripeBillingIntervalsKeepingDay(billingAnchor * 1000, occurrence, recurringInterval);
    const chargeDate = new Date(chargeAt).toISOString().slice(0, 10);
    if (chargeDate === targetDate) {
      return Math.floor(addStripeBillingIntervalsKeepingDay(billingAnchor * 1000, occurrence + 1, recurringInterval) / 1000);
    }
    if (chargeDate > targetDate) break;
  }

  throw new Error("La fecha final debe coincidir con una fecha real de cobro de esta suscripción.");
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
  const minimumCount = 1;
  if (!Number.isFinite(requestedCount) || requestedCount < minimumCount) {
    return { updated: false, reason: "not_finite_subscription" };
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
    return { updated: false, reason: `subscription_${subscription.status}` };
  }
  const existingCount = Number.parseInt(
    billingType === "subscription"
      ? subscription.metadata?.althera_recurrence_count || ""
      : subscription.metadata?.installments || "",
    10,
  );
  const effectiveCount = Number.isFinite(existingCount) && existingCount >= minimumCount ? existingCount : requestedCount;
  const recurringInterval = options.interval || subscription.metadata?.interval || subscription.items.data[0]?.price.recurring?.interval || "month";

  const startAt = (subscription.trial_end || subscription.start_date || Math.floor(Date.now() / 1000)) * 1000;
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
  if (Number(invoice.amount_paid || invoice.amount_due || 0) <= 0) {
    return { updated: false, reason: "invoice_has_no_charge" };
  }

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

  const rows = await getStripeTransactionCandidates({ invoiceId, stripePlanId, pendingTxId: firstPendingTxId });
  const existingInvoiceRow = rows.find((tx: any) => (tx.description || "").includes(`[STRIPEINVOICE:${invoiceId}]`));
  if (existingInvoiceRow?.status === "paid") {
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
    recurringDescription = writeTag(recurringDescription, "RECUR_SOURCE", sourceTx.id);
    recurringDescription = writeTag(recurringDescription, "RECUR_DATE", getStripePaidDate(invoice));
    recurringDescription = writeTag(recurringDescription, "ISINITIAL", "false");

    if (existingInvoiceRow?.status === "failed") {
      const { error: recoveryError } = await supabaseAdmin
        .from("finance_transactions")
        .update({
          status: "paid",
          amount: Number(invoice.amount_paid || invoice.amount_due || 0) / 100 || Number(existingInvoiceRow.amount || sourceTx.amount || 0),
          date: getStripePaidDate(invoice),
          description: recurringDescription,
        })
        .eq("id", existingInvoiceRow.id);
      if (recoveryError) throw recoveryError;
      return { updated: true, reason: "recovered_failed_payment", txId: existingInvoiceRow.id };
    }

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
        .update({ description: updatedDescription, date: getStripePaidDate(invoice) })
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

  let updatedDescription = (targetTx.description || "")
    .replace(/\s*\(Pendiente\)/gi, "")
    .replace(/\s*\(Cobro denegado Stripe\)/gi, "")
    .replace(/\s*\(Enlace de pago caducado\)/gi, "")
    .trim();
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
    .select("id,items")
    .contains("items", [{ pendingTxId: targetTx.id }]);

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

async function markStripeInvoiceAsFailed(invoice: Stripe.Invoice): Promise<{ updated: boolean; reason?: string; txId?: string }> {
  const stripe = getStripe();
  const invoiceId = invoice.id;
  const subscriptionId = getStripeInvoiceSubscriptionId(invoice);
  if (!invoiceId) return { updated: false, reason: "missing_invoice_id" };
  if (!subscriptionId) return { updated: false, reason: "not_subscription_invoice" };

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const invoiceMetadata = (invoice as any).subscription_details?.metadata || {};
  const stripePlanId = subscription.metadata?.stripePlanId || invoiceMetadata.stripePlanId || invoice.metadata?.stripePlanId || "";
  const firstPendingTxId = subscription.metadata?.pendingTxId || invoiceMetadata.pendingTxId || invoice.metadata?.pendingTxId || "";
  const billingType = subscription.metadata?.althera_billing_type || invoiceMetadata.billingType || invoice.metadata?.billingType || "";
  const installments = subscription.metadata?.installments || invoiceMetadata.installments || invoice.metadata?.installments || "";

  const rows = await getStripeTransactionCandidates({ invoiceId, stripePlanId, pendingTxId: firstPendingTxId });
  const existingInvoiceRow = rows.find((tx: any) => (tx.description || "").includes(`[STRIPEINVOICE:${invoiceId}]`));
  if (existingInvoiceRow?.status === "paid") return { updated: false, reason: "invoice_already_paid", txId: existingInvoiceRow.id };
  if (existingInvoiceRow?.status === "failed") return { updated: false, reason: "already_marked_failed", txId: existingInvoiceRow.id };

  const matchingRows = rows.filter((tx: any) => {
    const description = tx.description || "";
    return (stripePlanId && description.includes(`[STRIPEPLAN:${stripePlanId}]`)) || (firstPendingTxId && tx.id === firstPendingTxId);
  });
  const sourceTx = matchingRows.find((tx: any) => tx.id === firstPendingTxId) || matchingRows[0];
  if (!sourceTx) return { updated: false, reason: "no_matching_transaction" };

  const isFirstInvoice = (invoice as any).billing_reason === "subscription_create";
  const installmentCount = Number.parseInt(String(installments || ""), 10);
  const isInstallment = billingType === "installment" || (!billingType && Number.isFinite(installmentCount) && installmentCount > 1);
  const failedDate = new Date((invoice.created || Math.floor(Date.now() / 1000)) * 1000).toISOString().slice(0, 10);
  let failedDescription = (sourceTx.description || "")
    .replace(/\s*\(Pendiente\)/gi, "")
    .replace(/\s*\(Cobro denegado Stripe\)/gi, "")
    .trim();
  failedDescription = `${failedDescription} (Cobro denegado Stripe)`;
  failedDescription = writeTag(failedDescription, "STRIPEINVOICE", invoiceId);

  if (isFirstInvoice || isInstallment) {
    let targetTx = isFirstInvoice && firstPendingTxId
      ? matchingRows.find((tx: any) => tx.id === firstPendingTxId)
      : matchingRows.filter((tx: any) => tx.status === "pending").sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || "")))[0];
    if (!targetTx) targetTx = sourceTx;
    const { error: updateError } = await supabaseAdmin.from("finance_transactions").update({
      status: "failed",
      date: failedDate,
      description: failedDescription,
    }).eq("id", targetTx.id);
    if (updateError) throw updateError;
    return { updated: true, txId: targetTx.id };
  }

  failedDescription = writeTag(failedDescription, "RECUR_SOURCE", sourceTx.id);
  failedDescription = writeTag(failedDescription, "RECUR_DATE", failedDate);
  failedDescription = writeTag(failedDescription, "ISINITIAL", "false");
  const failedTxId = `tx_stripe_failed_${invoiceId}`;
  const { error: insertError } = await supabaseAdmin.from("finance_transactions").insert({
    id: failedTxId,
    user_id: sourceTx.user_id || null,
    type: "income",
    category: sourceTx.category || "Mensualidad",
    amount: Number(invoice.amount_due || 0) / 100 || Number(sourceTx.amount || 0),
    date: failedDate,
    description: failedDescription,
    "isRecurring": false,
    "recurrencePeriod": null,
    status: "failed",
  });
  if (insertError && insertError.code !== "23505") throw insertError;
  return { updated: !insertError, reason: insertError ? "already_marked_failed" : undefined, txId: failedTxId };
}

async function markStripeCheckoutSessionAsPaid(session: Stripe.Checkout.Session): Promise<{ updated: boolean; reason?: string; txId?: string }> {
  const isPaid = session.payment_status === "paid";
  if (!isPaid) return { updated: false, reason: "payment_not_confirmed" };

  const pendingTxId = session.metadata?.pendingTxId || "";
  if (!pendingTxId) return { updated: false, reason: "missing_pending_transaction" };

  const { data: targetTx, error: txReadError } = await supabaseAdmin
    .from("finance_transactions")
    .select("id,description,status")
    .eq("id", pendingTxId)
    .maybeSingle();

  if (txReadError) throw txReadError;
  if (!targetTx) return { updated: false, reason: "transaction_not_found" };

  let updatedDescription = (targetTx.description || "")
    .replace(/\s*\(Pendiente\)/gi, "")
    .replace(/\s*\(Cobro denegado Stripe\)/gi, "")
    .replace(/\s*\(Enlace de pago caducado\)/gi, "")
    .trim();
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
    .select("id,items")
    .contains("items", [{ pendingTxId }]);

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

async function markStripeCheckoutSessionAsExpired(session: Stripe.Checkout.Session): Promise<{ updated: boolean; reason?: string; txId?: string }> {
  if (session.status !== "expired") return { updated: false, reason: "session_not_expired" };
  if (session.metadata?.althera_deleted === "true") return { updated: false, reason: "intentionally_deleted" };
  const pendingTxId = session.metadata?.pendingTxId || "";
  if (!pendingTxId) return { updated: false, reason: "missing_pending_transaction" };
  const { data: targetTx, error } = await supabaseAdmin
    .from("finance_transactions")
    .select("id,description,status")
    .eq("id", pendingTxId)
    .maybeSingle();
  if (error) throw error;
  if (!targetTx) return { updated: false, reason: "transaction_not_found" };
  if (targetTx.status === "paid") return { updated: false, reason: "transaction_already_paid", txId: pendingTxId };
  const recordedSessionId = readTag(targetTx.description || "", "STRIPESESSION");
  if (recordedSessionId && recordedSessionId !== session.id) {
    return { updated: false, reason: "session_superseded", txId: pendingTxId };
  }
  let description = (targetTx.description || "")
    .replace(/\s*\(Pendiente\)/gi, "")
    .replace(/\s*\(Enlace de pago caducado\)/gi, "")
    .trim();
  description = `${description} (Enlace de pago caducado)`;
  description = writeTag(description, "STRIPESESSION", session.id);
  const { error: updateError } = await supabaseAdmin.from("finance_transactions").update({ status: "failed", description }).eq("id", pendingTxId);
  if (updateError) throw updateError;
  return { updated: targetTx.status !== "failed", txId: pendingTxId };
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
      const unverifiedEvent = JSON.parse(req.body.toString("utf8")) as Stripe.Event;
      if (!unverifiedEvent?.id || !String(unverifiedEvent.id).startsWith("evt_")) {
        return res.status(400).json({ error: "Invalid Stripe event" });
      }
      // Some deployments don't expose the endpoint signing secret. In that
      // case, verify the event against Stripe's API instead of trusting the
      // submitted payload. Replays remain safe because invoice processing is
      // idempotent by Stripe invoice id.
      event = await stripe.events.retrieve(unverifiedEvent.id);
      console.warn("STRIPE_WEBHOOK_SECRET is not set. Event verified through the Stripe Events API.");
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const paidInvoice = event.data.object as Stripe.Invoice;
      const ledgerResult = await markStripeInvoiceAsPaid(paidInvoice);
      const invoiceResult = await ensureInternalInvoiceForPaidStripeRecurrence(paidInvoice, ledgerResult.txId);
      console.log(`Processed Stripe ${event.type} webhook:`, { ledgerResult, invoiceResult });
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

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const result = await syncStripeSubscriptionToContact(event.data.object as Stripe.Subscription);
      console.log(`Processed Stripe ${event.type} webhook:`, result);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const result = await markStripeInvoiceAsFailed(invoice);
      console.warn("Processed Stripe invoice.payment_failed webhook:", result);
    }

    if (event.type === "checkout.session.expired") {
      const result = await markStripeCheckoutSessionAsExpired(event.data.object as Stripe.Checkout.Session);
      console.warn("Processed Stripe checkout.session.expired webhook:", result);
    }

    if (event.type === "payout.paid") {
      const synced = await syncPaidStripePayoutToRevolut(event.data.object as Stripe.Payout);
      console.log("Processed Stripe payout.paid webhook:", { payoutId: event.data.object.id, synced });
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Error handling Stripe webhook:", error);
    res.status(400).json({ error: error?.message || "Webhook error" });
  }
});

app.use(express.json());

app.post('/api/analytics/track', async (req, res) => {
  try {
    const body = req.body || {};
    if (!['page_view', 'contact_intent', 'portal_open'].includes(body.eventName)) return res.status(400).json({ error: 'Invalid event' });
    const clean = (value: unknown, max = 120) => String(value || '').slice(0, max);
    const { error } = await supabaseAdmin.from('website_analytics_events').insert({
      visitor_id: clean(body.visitorId, 36), session_id: clean(body.sessionId, 36), event_name: body.eventName,
      path: clean(body.path, 240) || '/', referrer_host: clean(body.referrerHost), utm_source: clean(body.utmSource),
      utm_medium: clean(body.utmMedium), utm_campaign: clean(body.utmCampaign), device_type: clean(body.deviceType, 20) || 'desktop',
    });
    if (error) throw error;
    res.status(204).end();
  } catch (error: any) { res.status(202).end(); }
});

app.get('/api/analytics/summary', requireAdminAuth, async (_req, res) => {
  try {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const { data, error } = await supabaseAdmin.from('website_analytics_events').select('visitor_id,session_id,event_name,referrer_host,utm_source,device_type,created_at').gte('created_at', since.toISOString()).limit(50_000);
    if (error) throw error;
    const events = data || [];
    const group = (values: string[]) => Object.entries(values.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value || 'Directo']: (acc[value || 'Directo'] || 0) + 1 }), {})).sort(([, a], [, b]) => b - a).slice(0, 6).map(([label, value]) => ({ label, value }));
    res.json({ days: 30, visitors: new Set(events.map(event => event.visitor_id)).size, sessions: new Set(events.map(event => event.session_id)).size, pageViews: events.filter(event => event.event_name === 'page_view').length, conversions: events.filter(event => event.event_name !== 'page_view').length, sources: group(events.map(event => event.utm_source || event.referrer_host || 'Directo')), devices: group(events.map(event => event.device_type)) });
  } catch (error: any) { res.status(500).json({ error: error?.message || 'Analytics unavailable' }); }
});

let stripeFinanceReconciliationRunning = false;

async function reconcileRecentStripeFinance(): Promise<{ checked: number; updated: number; skipped: number; failed: number }> {
  if (stripeFinanceReconciliationRunning) return { checked: 0, updated: 0, skipped: 0, failed: 0 };
  stripeFinanceReconciliationRunning = true;
  try {
    const stripe = getStripe();
    const createdAfter = Math.floor((Date.now() - 180 * 24 * 60 * 60 * 1000) / 1000);
    const paidInvoices = await stripe.invoices
      .list({ status: "paid", created: { gte: createdAfter }, limit: 100 })
      .autoPagingToArray({ limit: 500 });
    const failedInvoices = (await stripe.invoices
      .list({ status: "open", created: { gte: createdAfter }, limit: 100 })
      .autoPagingToArray({ limit: 500 }))
      .filter(invoice => Number(invoice.attempt_count || 0) > 0 && Boolean(getStripeInvoiceSubscriptionId(invoice)));
    const expiredSessions = await stripe.checkout.sessions
      .list({ status: "expired", created: { gte: createdAfter }, limit: 100 })
      .autoPagingToArray({ limit: 500 });
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    for (const invoice of paidInvoices) {
      try {
        const ledgerResult = await markStripeInvoiceAsPaid(invoice);
        const invoiceResult = await ensureInternalInvoiceForPaidStripeRecurrence(invoice, ledgerResult.txId);
        if (ledgerResult.updated || invoiceResult.created) updated += 1;
        else skipped += 1;
      } catch (error: any) {
        failed += 1;
        console.error(`Could not reconcile Stripe invoice ${invoice.id}:`, error?.message || error);
      }
    }
    for (const invoice of failedInvoices) {
      try {
        const result = await markStripeInvoiceAsFailed(invoice);
        if (result.updated) updated += 1;
        else skipped += 1;
      } catch (error: any) {
        failed += 1;
        console.error(`Could not reconcile failed Stripe invoice ${invoice.id}:`, error?.message || error);
      }
    }
    for (const session of expiredSessions) {
      try {
        const result = await markStripeCheckoutSessionAsExpired(session);
        if (result.updated) updated += 1;
        else skipped += 1;
      } catch (error: any) {
        failed += 1;
        console.error(`Could not reconcile expired Stripe session ${session.id}:`, error?.message || error);
      }
    }
    return { checked: paidInvoices.length + failedInvoices.length + expiredSessions.length, updated, skipped, failed };
  } finally {
    stripeFinanceReconciliationRunning = false;
  }
}

// Repairs ledger state when a webhook was delayed or unavailable. Stripe is
// the source of truth for paid invoices, rejected renewals and expired links.
app.post("/api/stripe/reconcile-finance", requireAdminAuth, async (_req, res) => {
  try {
    res.json(await reconcileRecentStripeFinance());
  } catch (error: any) {
    console.error("Error reconciling Stripe finance:", error);
    res.status(500).json({ error: error?.message || "No se pudo reconciliar Stripe." });
  }
});

app.post("/api/stripe/subscriptions/:subscriptionId/final-charge-date", requireAdminAuth, async (req, res) => {
  try {
    const finalChargeDate = String(req.body?.finalChargeDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalChargeDate)) return res.status(400).json({ error: "Fecha final inválida." });
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(req.params.subscriptionId);
    let cancelAt: number;
    try {
      cancelAt = getCancelAtAfterFinalChargeDate(subscription, finalChargeDate);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "La fecha final no coincide con el ciclo de cobro." });
    }
    await stripe.subscriptions.update(subscription.id, {
      cancel_at: cancelAt,
      proration_behavior: "none",
      metadata: { ...(subscription.metadata || {}), althera_finite_subscription: "true", althera_final_charge_date: finalChargeDate },
    });
    res.json({ finalChargeDate, cancelAt: new Date(cancelAt * 1000).toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "No se pudo programar el fin de la suscripción." });
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Stripe CRM API is active!" });
});

// Public compact payment links. New links use the dedicated mapping table.
// The finance-transaction lookup remains only so previously generated compact
// links continue to work without modifying or migrating them.
app.get("/p/:shortCode", async (req, res) => {
  try {
    const shortCode = String(req.params.shortCode || "").trim();
    const isNewShortCode = STRIPE_SHORT_LINK_CODE_PATTERN.test(shortCode);
    const isLegacyShortCode = /^[a-zA-Z0-9_-]{10,32}$/.test(shortCode);
    if (!isNewShortCode && !isLegacyShortCode) {
      return res.status(400).send("Enlace de pago no válido.");
    }

    if (isNewShortCode) {
      const { data: shortLink, error: shortLinkError } = await supabaseAdmin
        .from("stripe_short_links")
        .select("stripe_url, click_count")
        .eq("slug", shortCode)
        .maybeSingle();

      if (shortLinkError) throw shortLinkError;
      if (!shortLink) return res.status(404).send("Este enlace de pago no existe.");

      // Click analytics must never delay or prevent the payment redirect.
      void supabaseAdmin
        .from("stripe_short_links")
        .update({
          click_count: Number(shortLink.click_count || 0) + 1,
          last_clicked_at: new Date().toISOString(),
        })
        .eq("slug", shortCode)
        .then(({ error }) => {
          if (error) console.warn("Could not register Stripe short-link click:", error.message);
        });

      res.setHeader("Cache-Control", "no-store");
      return res.redirect(302, shortLink.stripe_url);
    }

    const { data: transaction, error } = await supabaseAdmin
      .from("finance_transactions")
      .select("description")
      .ilike("description", `%${shortCode}]%`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!transaction) return res.status(404).send("Este enlace de pago no existe.");

    const checkoutSessionId = readTag(transaction.description || "", "STRIPESESSION");
    if (!checkoutSessionId) return res.status(404).send("El enlace de Stripe todavía no está disponible.");

    const session = await getStripe().checkout.sessions.retrieve(checkoutSessionId);
    if (!session.url || session.status === "expired") {
      return res.status(410).send("Este enlace de pago ha caducado.");
    }

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, session.url);
  } catch (error: any) {
    console.error("Error resolving compact Stripe payment link:", error);
    return res.status(500).send("No se pudo abrir el enlace de pago.");
  }
});

// Check if Stripe is configured
app.get("/api/stripe/config", (req, res) => {
  res.json({
    hasKey: !!process.env.STRIPE_SECRET_KEY,
  });
});

app.get("/api/bites/overview", requireAdminAuth, async (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const integration = getBitesIntegrationConfig();
    if (integration) {
      const response = await fetch(`${integration.url}/functions/v1/althera-overview`, {
        method: "GET",
        headers: {
          apikey: integration.publishableKey,
          "x-althera-bites-token": integration.token,
        },
        signal: AbortSignal.timeout(15_000),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(`BITES_EDGE_${response.status}`);
      return res.json(payload);
    }

    const bites = getBitesAdminClient();
    const [authUsers, accountsResult, restaurantsResult, paymentsResult] = await Promise.all([
      listBitesAuthUsers(bites),
      bites
        .from("users")
        .select("id,username,name,plan,subscriptionStatus,restaurantId,trialEndsAt,accessType,accessEndsAt,stripeCustomerId,stripeSubscriptionId,setupPaidAt,subscriptionStartedAt,subscriptionCurrentPeriodEnd,subscriptionCancelAtPeriodEnd,subscriptionCancelAt,pendingPlan,pendingPlanEffectiveAt,subscriptionUpdatedAt")
        .order("subscriptionUpdatedAt", { ascending: false, nullsFirst: false })
        .limit(5000),
      bites
        .from("restaurants")
        .select("id,name,username,country,isOpen,ownerUserId,moderationStatus")
        .order("name")
        .limit(5000),
      bites
        .from("subscription_payments")
        .select("id,account_id,status,description,amount_due_cents,amount_paid_cents,currency,period_start,period_end,paid_at,hosted_invoice_url,invoice_pdf_url,created_at")
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

    const queryError = accountsResult.error || restaurantsResult.error || paymentsResult.error;
    if (queryError) throw queryError;

    const emailById = new Map(authUsers.map((user) => [user.id, user.email]));
    const restaurants = restaurantsResult.data || [];
    const restaurantCountByOwner = new Map<string, number>();
    restaurants.forEach((restaurant: any) => {
      const ownerId = String(restaurant.ownerUserId || "");
      if (ownerId) restaurantCountByOwner.set(ownerId, (restaurantCountByOwner.get(ownerId) || 0) + 1);
    });

    const accounts = (accountsResult.data || []).map((account: any) => ({
      ...account,
      email: emailById.get(account.id) || null,
      restaurantCount: restaurantCountByOwner.get(account.id) || 0,
    }));

    const accountNameById = new Map(accounts.map((account: any) => [account.id, account.name || account.email || account.username || "Cuenta Bites"]));
    const payments = (paymentsResult.data || []).map((payment: any) => ({
      ...payment,
      accountName: accountNameById.get(payment.account_id) || "Cuenta Bites",
      accountEmail: emailById.get(payment.account_id) || null,
    }));

    const userById = new Map(authUsers.map((user) => [user.id, user]));
    const registeredUsers = authUsers.map((user) => {
      const account: any = accounts.find((item: any) => item.id === user.id);
      return {
        ...user,
        name: account?.name || null,
        username: account?.username || null,
        plan: account?.plan || null,
        subscriptionStatus: account?.subscriptionStatus || null,
        accessType: account?.accessType || null,
      };
    });
    accounts.forEach((account: any) => {
      if (!userById.has(account.id)) registeredUsers.push({
        id: account.id,
        email: account.email,
        createdAt: account.subscriptionStartedAt || account.setupPaidAt || account.subscriptionUpdatedAt || "",
        lastSignInAt: null,
        confirmedAt: null,
        name: account.name,
        username: account.username,
        plan: account.plan,
        subscriptionStatus: account.subscriptionStatus,
        accessType: account.accessType,
      });
    });

    res.json({
      generatedAt: new Date().toISOString(),
      accounts,
      payments,
      users: registeredUsers,
      restaurants,
    });
  } catch (error: any) {
    if (error?.message === "BITES_CONNECTION_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "La conexión segura de Bites todavía no está configurada en el servidor.",
        code: "BITES_CONNECTION_NOT_CONFIGURED",
      });
    }
    console.error("Bites overview error:", error?.message || error);
    return res.status(502).json({ error: "No se pudo consultar Bites de forma segura." });
  }
});

app.get("/api/stripe/balance", requireAdminAuth, async (_req, res) => {
  try {
    const stripe = getStripe();
    const [balance, payouts, balanceTransactions] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.payouts.list({ limit: 10 }),
      stripe.balanceTransactions.list({ limit: 10 }),
    ]);
    await Promise.all(payouts.data.map(syncPaidStripePayoutToRevolut));
    const normalizeAmounts = (items: Stripe.Balance.Available[] | Stripe.Balance.Pending[]) =>
      items.map(item => ({
        amount: Number(item.amount || 0) / 100,
        currency: item.currency,
      }));

    res.setHeader("Cache-Control", "no-store");
    res.json({
      available: normalizeAmounts(balance.available),
      pending: normalizeAmounts(balance.pending),
      movements: balanceTransactions.data.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        reportingCategory: transaction.reporting_category,
        description: transaction.description,
        amount: Number(transaction.amount || 0) / 100,
        fee: Number(transaction.fee || 0) / 100,
        net: Number(transaction.net || 0) / 100,
        currency: transaction.currency,
        status: transaction.status,
        createdAt: new Date(transaction.created * 1000).toISOString(),
        availableOn: new Date(transaction.available_on * 1000).toISOString(),
      })),
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
    const shareableUrl = await getShareableStripeUrl(latestSession.id, latestSession.url, getAppUrl(req));
    return res.json({
      checkoutSession: {
        id: latestSession.id,
        status: latestSession.status,
        paymentStatus: latestSession.payment_status,
        mode: latestSession.mode,
        url: shareableUrl,
        expiresAt: latestSession.expires_at,
        amountTotal: latestSession.amount_total ? latestSession.amount_total / 100 : null,
        currency: latestSession.currency,
        dashboardUrl: `https://dashboard.stripe.com${dashboardMode}/checkout/sessions/${latestSession.id}`,
        metadata: {
          pendingTxId: latestSession.metadata?.pendingTxId || "",
          stripePlanId: latestSession.metadata?.stripePlanId || "",
          installmentIndex: latestSession.metadata?.installmentIndex || "",
          installments: latestSession.metadata?.installments || "",
          firstPaymentDate: latestSession.metadata?.firstPaymentDate || "",
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
      const installmentCount = Number.parseInt(subscription.metadata?.althera_cancel_after_installments || subscription.metadata?.installments || "0", 10) || null;
      const recurrenceCount = Number.parseInt(subscription.metadata?.althera_recurrence_count || "0", 10) || null;
      const isInstallmentPlan = isFiniteInstallmentSubscription(subscription);
      // A finite recurring subscription is still a subscription (not a split
      // payment), but it must stop appearing in forecasts after its last cycle.
      const paymentLimit = isInstallmentPlan ? installmentCount : recurrenceCount;
      const scheduledOutstanding = paymentLimit
        ? Math.max(0, paymentLimit - subscriptionPaidInvoices.length) * amount
        : subscriptionOpenInvoices.reduce((sum, invoice) => sum + Number(invoice.amount_remaining || 0), 0) / 100;

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
        billingType: isInstallmentPlan ? "installment" : "subscription",
        installmentCount,
        paymentLimit,
        endsAt: paymentLimit
          ? new Date(addStripeBillingIntervalsKeepingDay(
              (subscription.trial_end || subscription.start_date || Math.floor(Date.now() / 1000)) * 1000,
              Math.max(0, paymentLimit - 1),
              firstItem?.price.recurring?.interval || "month",
            )).toISOString()
          : subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        paymentCount: subscriptionPaidInvoices.length,
        paidAmount: subscriptionPaidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount_paid || 0), 0) / 100,
        openAmount: scheduledOutstanding,
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

// Create subscription or single payment checkout session. Creating a first
// link remains available to the existing public flows; replacing an existing
// Stripe session is an administrative mutation and therefore requires auth.
app.post(
  "/api/stripe/create-checkout-session",
  async (req, res, next) => {
    if (req.body?.replaceExisting !== true) return next();
    return requireAdminAuth(req, res, next);
  },
  async (req, res) => {
  try {
    const { clientId, clientName, clientEmail, amount, interval, installments, recurrenceCount, billingType, concept, pendingTxId, stripePlanId, installmentIndex, previousSessionId, firstPaymentDate, replaceExisting } = req.body;

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
    let effectiveFirstPaymentDate = typeof firstPaymentDate === "string" ? firstPaymentDate.trim() : "";
    let previousSessionToReplace: Stripe.Checkout.Session | null = null;

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
      if (previousSession.payment_status === "paid") {
        return res.status(409).json({ error: "El cobro ya está pagado y no se puede generar otro enlace." });
      }
      if (previousSession.status === "open" && replaceExisting !== true) {
        return res.status(409).json({ error: "El enlace solo se puede renovar cuando Stripe confirma que ha caducado y sigue sin pagar." });
      }
      if (previousSession.status !== "open" && previousSession.status !== "expired") {
        return res.status(409).json({ error: "Stripe todavía está procesando este enlace y no permite sustituirlo." });
      }
      if (previousSession.status === "open") previousSessionToReplace = previousSession;

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
      effectiveFirstPaymentDate = previousSession.metadata?.firstPaymentDate || effectiveFirstPaymentDate;
    }
    let scheduledFirstPaymentAt: number | undefined;
    if (effectiveFirstPaymentDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFirstPaymentDate)) {
        return res.status(400).json({ error: "La fecha del primer cobro no es válida." });
      }
      scheduledFirstPaymentAt = Math.floor(Date.parse(`${effectiveFirstPaymentDate}T12:00:00Z`) / 1000);
      if (!Number.isFinite(scheduledFirstPaymentAt) || scheduledFirstPaymentAt < Math.floor(Date.now() / 1000) + (48 * 60 * 60)) {
        return res.status(400).json({ error: "Stripe exige programar el primer cobro con al menos 48 horas de antelación." });
      }
      effectiveBillingType = billingType || "installment";
    }
    const appUrl = getAppUrl(req);
    const isSubscription = effectiveInterval !== "once" || Boolean(scheduledFirstPaymentAt);

    const lineItem: any = {
      price_data: {
        currency: "eur",
        product_data: {
          name: effectiveConcept || (effectiveFirstPaymentDate
            ? `Pago Programado - ${clientName || "Cliente"}`
            : isSubscription
            ? `Mensualidad Automática - ${clientName || "Cliente"}`
            : `Pago Único - ${clientName || "Cliente"}`),
          description: effectiveFirstPaymentDate
            ? `Primer cobro programado para el ${effectiveFirstPaymentDate}`
            : isSubscription
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
      success_url: `${appUrl}/pago-confirmado?stripe_session_id={CHECKOUT_SESSION_ID}&stripe_status=success&client_id=${clientId}&amount=${effectiveAmountNumber}&interval=${effectiveInterval}&installments=${effectiveInstallments}&concept=${encodeURIComponent(effectiveConcept)}&pending_tx_id=${effectivePendingTxId}&stripe_plan_id=${effectiveStripePlanId}&installment_index=${effectiveInstallmentIndex}`,
      cancel_url: `${appUrl}?stripe_status=cancel&client_id=${clientId}`,
      client_reference_id: effectivePendingTxId || clientId,
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
        firstPaymentDate: effectiveFirstPaymentDate,
      },
    };

    if (isSubscription) {
      sessionConfig.subscription_data = {
        metadata: {
          clientId,
          clientName: clientName || "",
          clientEmail,
          pendingTxId: effectivePendingTxId,
          stripePlanId: effectiveStripePlanId,
          installments: effectiveInstallments,
          recurrenceCount: effectiveRecurrenceCount,
          billingType: effectiveBillingType,
          interval: effectiveInterval,
          concept: effectiveConcept,
          firstPaymentDate: effectiveFirstPaymentDate,
        },
        ...(scheduledFirstPaymentAt ? { trial_end: scheduledFirstPaymentAt } : {}),
      };
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);
    if (!session.url) {
      throw new Error("Stripe no devolvió una URL para la sesión de pago.");
    }

    let compactCode: string;
    try {
      compactCode = await createStripeShortLink({
        stripeUrl: session.url,
        stripeCheckoutSessionId: session.id,
        clientId,
        pendingTxId: effectivePendingTxId,
        stripePlanId: effectiveStripePlanId,
        concept: effectiveConcept,
      });
    } catch (shortLinkError) {
      // Avoid leaving a usable Stripe session whose shareable short URL was
      // not persisted successfully.
      try {
        await stripe.checkout.sessions.update(session.id, {
          metadata: { ...(session.metadata || {}), althera_deleted: "true" },
        });
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireError: any) {
        console.warn("Could not expire orphaned Stripe Checkout Session:", expireError?.message || expireError);
      }
      throw shortLinkError;
    }
    const compactUrl = `${appUrl}/p/${compactCode}`;

    // When an operator explicitly replaces a still-open link, retire the old
    // Checkout Session only after the new session and short URL both exist.
    // If Stripe cannot retire it (for example because payment completed in the
    // meantime), remove the replacement so two usable links never coexist.
    if (previousSessionToReplace) {
      try {
        await stripe.checkout.sessions.update(previousSessionToReplace.id, {
          metadata: {
            ...(previousSessionToReplace.metadata || {}),
            althera_replaced: "true",
            replaced_by_session_id: session.id,
          },
        });
        await stripe.checkout.sessions.expire(previousSessionToReplace.id);
      } catch (replaceError: any) {
        try {
          await stripe.checkout.sessions.update(session.id, {
            metadata: { ...(session.metadata || {}), althera_deleted: "true" },
          });
          await stripe.checkout.sessions.expire(session.id);
        } catch (cleanupError: any) {
          console.warn("Could not expire failed replacement Checkout Session:", cleanupError?.message || cleanupError);
        }
        const { error: shortLinkCleanupError } = await supabaseAdmin
          .from("stripe_short_links")
          .delete()
          .eq("stripe_checkout_session_id", session.id);
        if (shortLinkCleanupError) {
          console.warn("Could not remove failed replacement short link:", shortLinkCleanupError.message);
        }
        throw new Error(`No se pudo desactivar el enlace anterior: ${replaceError?.message || "Stripe rechazó la sustitución"}`);
      }
    }

    if (previousSessionId && effectivePendingTxId) {
      const { data: retryTx, error: retryReadError } = await supabaseAdmin
        .from("finance_transactions")
        .select("description")
        .eq("id", effectivePendingTxId)
        .maybeSingle();
      if (retryReadError) throw retryReadError;
      if (retryTx) {
        let retryDescription = String(retryTx.description || "")
          .replace(/\s*\(Enlace de pago caducado\)/gi, "")
          .replace(/\s*\(Cobro denegado Stripe\)/gi, "")
          .trim();
        retryDescription = `${retryDescription} (Pendiente)`;
        retryDescription = writeTag(retryDescription, "STRIPESESSION", session.id);
        const { error: retryUpdateError } = await supabaseAdmin
          .from("finance_transactions")
          .update({ status: "pending", description: retryDescription })
          .eq("id", effectivePendingTxId);
        if (retryUpdateError) throw retryUpdateError;
      }
    }

    res.json({
      url: compactUrl,
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
  },
);

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

    const shareableCheckoutUrl = checkoutSession
      ? await getShareableStripeUrl(checkoutSession.id, checkoutSession.url, getAppUrl(req))
      : null;

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
            url: shareableCheckoutUrl,
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
    const shareableUrl = await getShareableStripeUrl(session.id, session.url, getAppUrl(req));
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
    const expandedInvoice = typeof session.invoice === "string" || !session.invoice ? null : session.invoice as Stripe.Invoice;
    let generatedInvoice = null;
    if (expandedInvoice?.status === "paid" && getStripeInvoiceSubscriptionId(expandedInvoice)) {
      const ledgerResult = await markStripeInvoiceAsPaid(expandedInvoice);
      generatedInvoice = await ensureInternalInvoiceForPaidStripeRecurrence(
        expandedInvoice,
        ledgerResult.txId || paymentResult.txId,
      );
    }
    
    res.json({
      customerId: session.customer,
      subscriptionId,
      mode: session.mode,
      paymentStatus: session.payment_status,
      status: session.status,
      expiresAt: session.expires_at,
      url: shareableUrl,
      transactionUpdated: paymentResult.updated,
      transactionId: paymentResult.txId,
      invoiceGenerated: generatedInvoice,
      firstPaymentDate: session.metadata?.firstPaymentDate || "",
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

    // Webhooks are the primary path. This periodic reconciliation is a safety
    // net for transient delivery failures and keeps paid or failed recurring
    // charges in the ledger even when no administrator has the dashboard open.
    const firstReconciliation = setTimeout(() => {
      void reconcileRecentStripeFinance().then(result => {
        if (result.updated > 0) console.log("Stripe finance startup reconciliation:", result);
      }).catch(error => console.error("Stripe finance startup reconciliation failed:", error));
    }, 20_000);
    firstReconciliation.unref();

    const reconciliationTimer = setInterval(() => {
      void reconcileRecentStripeFinance().then(result => {
        if (result.updated > 0) console.log("Stripe finance scheduled reconciliation:", result);
      }).catch(error => console.error("Stripe finance scheduled reconciliation failed:", error));
    }, 5 * 60_000);
    reconciliationTimer.unref();
  });
}

startServer();
