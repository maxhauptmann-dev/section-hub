import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles } from "../lib/sections.server";
import { createOneTimePurchase, hasPurchasedSection } from "../services/billing.server";

/**
 * API Route: Purchase a section (One-Time Charge via Shopify Billing)
 * POST /app/api/purchase-section
 * Body: { sectionId: string }
 *
 * Returns either:
 *  - { alreadyPurchased: true } if the section was already bought
 *  - { purchaseRequired: true, confirmationUrl: "..." } if Shopify checkout is needed
 *  - { error: "..." } on failure
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const sectionId = formData.get("sectionId") as string;

  if (!sectionId) {
    return Response.json(
      { success: false, error: "Section ID is missing" },
      { status: 400 },
    );
  }

  const section = getSectionWithFiles(sectionId);
  if (!section) {
    return Response.json(
      { success: false, error: "Section not found" },
      { status: 404 },
    );
  }

  const shop = session.shop;
  const accessToken = session.accessToken || "";

  // Free sections don't need a purchase
  const sectionPrice = section.price?.amount || 0;
  if (sectionPrice <= 0 || section.price?.type === "free") {
    return Response.json({
      success: false,
      error: "This section is free – no purchase needed.",
    });
  }

  // Check if already purchased
  const alreadyPurchased = await hasPurchasedSection(shop, sectionId);
  if (alreadyPurchased) {
    return Response.json({ success: true, alreadyPurchased: true });
  }

  // Create the One-Time Charge via Shopify Billing API
  try {
    const appUrl =
      process.env.SHOPIFY_APP_URL || "https://shopify-quiet-night-395.fly.dev";
    const returnUrl = `${appUrl}/app/billing/complete?shop=${encodeURIComponent(shop)}&section=${encodeURIComponent(sectionId)}`;

    const purchase = await createOneTimePurchase(
      shop,
      accessToken,
      `${section.name} – Section Hub`,
      sectionPrice,
      section.price?.currency || "EUR",
      returnUrl,
    );

    return Response.json({
      success: true,
      purchaseRequired: true,
      confirmationUrl: purchase.confirmationUrl,
      appPurchaseId: purchase.id,
    });
  } catch (error) {
    console.error("Purchase creation error:", error);
    return Response.json(
      {
        success: false,
        error: `Failed to initiate purchase: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
};
