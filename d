// src/routes/stripeWebhook.js
const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const { classifyPrice, PLAN_LIMITS } = require("../pricing.js");

const router = express.Router();

const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;
if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY env var is required");
if (!STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET env var is required");

const stripe = new Stripe(STRIPE_SECRET_KEY); // use dashboard API version

function getDb() {
  return admin.firestore();
}

/** Idempotency for Stripe retries */
async function runOnce(eventId, workFn) {
  const db = getDb();
  const ref = db.collection("stripe_processed_events").doc(eventId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) throw new Error("__SKIP__");
    tx.set(ref, { processedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  await workFn();
}

/** Resolve UID from subscription OR checkout session OR customer */
async function getUidFromStripe({ subscription, session, customerId }) {
  // 1) Sub metadata
  if (subscription?.metadata?.uid) return subscription.metadata.uid;

  // 2) Checkout session metadata
  if (session?.metadata?.uid) return session.metadata.uid;

  // 3) Customer metadata
  const cid =
    customerId ||
    session?.customer ||
    subscription?.customer ||
    session?.customer_details?.customer ||
    null;

  if (!cid) return null;

  try {
    const customer = await stripe.customers.retrieve(cid);
    return customer?.metadata?.uid || null;
  } catch {
    return null;
  }
}

/** Credit PAYG: users/{uid}/paygCredits/main.balance */
async function addPaygTokens(uid, tokens) {
  if (!tokens || tokens <= 0) return;
  const db = getDb();
  const paygRef = db.collection("users").doc(uid).collection("paygCredits").doc("main");
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(paygRef);
    const cur = snap.exists && typeof snap.data().balance === "number" ? snap.data().balance : 0;
    tx.set(
      paygRef,
      {
        balance: cur + tokens,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/** Save Stripe linkage; keep any legacy entitlements.payg.remaining if present */
async function upsertStripeLink(uid, { customerId, subscriptionId, priceId, status }) {
  const db = getDb();
  const userRef = db.collection("users").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const existing = snap.exists ? snap.data() : {};
    const existingPayg = existing?.entitlements?.payg?.remaining ?? null;

    tx.set(
      userRef,
      {
        stripe: {
          customerId: customerId ?? existing?.stripe?.customerId ?? null,
          subscriptionId: subscriptionId ?? null,
          priceId: priceId ?? null,
          status: status ?? null,
        },
        ...(existingPayg != null ? { entitlements: { payg: { remaining: existingPayg } } } : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/** Update subscription-backed entitlements on users/{uid} (used by your fallback) */
async function setSubEntitlements(uid, plan, cycle, sub) {
  const db = getDb();
  const limit = PLAN_LIMITS?.[plan] ?? (PLAN_LIMITS?.FREE ?? 50000);
  const resetsAtDate = sub?.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null;
  const resetsAtIso = resetsAtDate ? resetsAtDate.toISOString() : null;

  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        entitlements: {
          plan,
          cycle,
          sub: {
            limit,
            used: 0, // your consume endpoint increments this
            resetsAt: resetsAtIso,
          },
        },
        ...(resetsAtDate ? { subPeriodEnd: resetsAtDate } : {}),
        subUsed: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

/** Clear subscription plan (downgrade to FREE) but keep PAYG */
async function downgradeToFree(uid) {
  const db = getDb();
  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        entitlements: {
          plan: "FREE",
          cycle: null,
          sub: {
            limit: PLAN_LIMITS?.FREE ?? 50000,
            // do NOT zero used; your /consume logic manages this over time
          },
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const type = event.type;

    try {
      await runOnce(event.id, async () => {
        // ---- A) CHECKOUT SESSION COMPLETED (subscription OR PAYG) ----
        if (type === "checkout.session.completed") {
          const session = event.data.object;

          // 1) PAYG (mode: payment) → credit tokens
          if (session.mode === "payment") {
            // Obtain price id from line items
            let priceId = null;
            try {
              const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
              const first = li?.data?.[0];
              priceId = first?.price?.id || null;
            } catch (e) {
              console.error("listLineItems error:", e?.message || e);
            }

            // Determine uid
            const uid = await getUidFromStripe({ session });

            if (!uid) {
              console.warn("⚠️ PAYG checkout with no UID in metadata/customer. Skipping.");
              return;
            }

            const cls = priceId ? classifyPrice(priceId) : null;
            if (cls?.kind === "payg" && cls.tokens > 0) {
              await addPaygTokens(uid, cls.tokens);
              await upsertStripeLink(uid, {
                customerId: session.customer || null,
                subscriptionId: null,
                priceId,
                status: "paid",
              });
              console.log(`✅ PAYG credited ${cls.tokens} tokens to ${uid}`);
            } else {
              console.warn("⚠️ PAYG classifyPrice failed or non-PAYG line item:", priceId);
            }

            return;
          }

          // 2) SUBSCRIPTION (mode: subscription) → set entitlements
          if (session.mode === "subscription") {
            let sub = null;
            try {
              if (session.subscription) {
                sub = await stripe.subscriptions.retrieve(session.subscription);
              }
            } catch (e) {
              console.error("Failed to retrieve sub from session:", e);
            }
            if (!sub) return;

            const uid = await getUidFromStripe({ subscription: sub, session });
            if (!uid) return;

            const item = sub.items?.data?.[0];
            const priceId = item?.price?.id;
            const cls = classifyPrice(priceId); // { kind:'sub', plan, cycle }

            if (cls?.kind === "sub") {
              await upsertStripeLink(uid, {
                customerId: sub.customer,
                subscriptionId: sub.id,
                priceId,
                status: sub.status,
              });
              await setSubEntitlements(uid, cls.plan, cls.cycle, sub);
              console.log(`✅ Sub entitlements set for ${uid}: ${cls.plan} / ${cls.cycle}`);
            }
            return;
          }
        }

        // ---- B) INVOICE PAYMENT SUCCEEDED (covers renewals) ----
        if (type === "invoice.payment_succeeded") {
          const invoice = event.data.object;
          if (!invoice.subscription) return;

          const sub = await stripe.subscriptions.retrieve(invoice.subscription).catch(() => null);
          if (!sub) return;

          const uid = await getUidFromStripe({ subscription: sub });
          if (!uid) return;

          const item = sub.items?.data?.[0];
          const priceId = item?.price?.id;
          const cls = classifyPrice(priceId);

          if (cls?.kind === "sub") {
            await upsertStripeLink(uid, {
              customerId: sub.customer,
              subscriptionId: sub.id,
              priceId,
              status: sub.status,
            });
            await setSubEntitlements(uid, cls.plan, cls.cycle, sub);
            console.log(`✅ Renewal synced for ${uid}: ${cls.plan} / ${cls.cycle}`);
          }
          return;
        }

        // ---- C) SUBSCRIPTION LIFECYCLE ----
        if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
          const sub = event.data.object;
          const uid = await getUidFromStripe({ subscription: sub });
          if (!uid) return;

          const item = sub.items?.data?.[0];
          const priceId = item?.price?.id;
          const cls = classifyPrice(priceId);

          if (cls?.kind === "sub") {
            await upsertStripeLink(uid, {
              customerId: sub.customer,
              subscriptionId: sub.id,
              priceId,
              status: sub.status,
            });
            await setSubEntitlements(uid, cls.plan, cls.cycle, sub);
            console.log(`✅ Subscription sync for ${uid}: ${cls.plan} / ${cls.cycle}`);
          }
          return;
        }

        if (type === "customer.subscription.deleted") {
          const sub = event.data.object;
          const uid = await getUidFromStripe({ subscription: sub });
          if (!uid) return;

          await upsertStripeLink(uid, {
            customerId: sub.customer,
            subscriptionId: null,
            priceId: null,
            status: "canceled",
          });
          await downgradeToFree(uid);
          console.log(`✅ Subscription canceled; downgraded ${uid} to FREE`);
          return;
        }

        // ---- D) PAYMENT INTENT SUCCEEDED (PAYG direct PaymentIntent flow) ----
        if (type === "payment_intent.succeeded") {
          const pi = event.data.object;
          const uid = pi.metadata?.uid;
          const tokens = parseInt(pi.metadata?.tokens, 10);

          if (!uid || !tokens || tokens <= 0) {
            console.warn("⚠️ PAYG payment_intent.succeeded missing uid or tokens");
            return;
          }

          await addPaygTokens(uid, tokens);
          await upsertStripeLink(uid, {
            customerId: pi.customer || null,
            subscriptionId: null,
            priceId: null,
            status: "paid",
          });
          console.log(`✅ PAYG (PI) credited ${tokens} tokens to ${uid}`);
          return;
        }

        // Unhandled, but acknowledged
        console.log(`ℹ️ Unhandled event type: ${type}`);
      });

      res.json({ received: true });
    } catch (err) {
      if (String(err.message) === "__SKIP__") {
        // duplicate delivery
        return res.json({ received: true, deduped: true });
      }
      console.error("⚠️ Webhook handler failed:", err);
      res.status(500).send("Webhook handler error");
    }
  }
);

module.exports = router;
