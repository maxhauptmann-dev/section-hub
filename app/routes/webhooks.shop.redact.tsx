import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Mandatory Compliance Webhook: shop/redact
 * Shopify sends this 48 hours after a store uninstalls the app.
 * We must delete all shop data.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // Delete all data associated with this shop
  if (shop) {
    await db.storeAnalysis.deleteMany({ where: { shop } });
    await db.sectionPurchase.deleteMany({ where: { shop } });
    await db.sectionInstallation.deleteMany({ where: { shop } });
    await db.subscription.deleteMany({ where: { shop } });
    await db.sectionPreview.deleteMany({ where: { shop } });
    await db.aiSection.deleteMany({ where: { shop } });
    await db.session.deleteMany({ where: { shop } });
    console.log(`All data deleted for shop ${shop}`);
  }

  return new Response();
};
