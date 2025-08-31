const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const { classifyPrice, PLAN_LIMITS } = require("../pricing.js");

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY env var is required");
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET env var is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getUidFromStripe(sub) {
  const uidFromSub = sub?.metadata?.uid;
  if (uidFromSub) return uidFromSub;

  let customerId = sub?.customer;
  if (!customerId && sub?.customer_details?.customer) {
    customerId = sub.customer_details.customer;
  }
  if (!customerId) return null;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer?.metadata?.uid || null;
  } catch {
    return null;
  }
}

router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Handle only relevant Stripe events
      const type = event.type;
      let subscription = null;

      // Helper: get subscription object from event
      if (type.startsWith("customer.subscription.")) {
        subscription = event.data.object;
      } else if (type === "checkout.session.completed") {
        const session = event.data.object;
        if (session.subscription) {
          subscription = await stripe.subscriptions.retrieve(session.subscription);
        }
      } else if (type === "invoice.payment_succeeded") {
        const invoice = event.data.object;
        if (invoice.subscription) {
          subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        }
      }

      if (
        type === "checkout.session.completed" ||
        type === "invoice.payment_succeeded" ||
        type === "customer.subscription.updated" ||
        type === "customer.subscription.created" ||
        type === "customer.subscription.deleted"
      ) {
        if (!subscription) {
          console.warn("No subscription found for event", type);
          return res.json({ received: true });
        }

        const uid = await getUidFromStripe(subscription);
        if (!uid) {
          console.warn("No UID found in subscription/customer metadata");
          return res.json({ received: true });
        }

        // Determine plan classification from the active item (assumes single-item subs)
        const item = subscription.items?.data?.[0];
        const priceId = item?.price?.id;
        const classification = classifyPrice(priceId); // { kind, plan, cycle, tokens? }

        // Firestore user doc
        const userRef = admin.firestore().collection("users").doc(uid);

        if (type === "customer.subscription.deleted") {
          // Downgrade to FREE, keep PAYG
          await userRef.set(
            {
              plan: "FREE",
              subLimit: PLAN_LIMITS.FREE,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } else if (classification && classification.plan) {
          // Upgrade or update plan
          await userRef.set(
            {
              plan: classification.plan,
              subLimit: PLAN_LIMITS[classification.plan] || PLAN_LIMITS.FREE,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }

      console.log("✅ Webhook event processed:", event.type);
      res.json({ received: true });
    } catch (err) {
      console.error("⚠️ Webhook handler failed:", err);
      res.status(500).send("Webhook handler error");
    }
  }
);

module.exports = router;