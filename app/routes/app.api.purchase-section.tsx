import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles } from "../lib/sections.server";
import { hasPurchasedSection } from "../services/billing.server";
import prisma from "../db.server";

/**
 * API Route: Purchase a section (One-Time Charge via Shopify Billing API)
 * POST /app/api/purchase-section
 * Body: { sectionId: string }
 *
 * Uses admin.graphql() for proper authenticated Shopify API calls.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

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

  // Create One-Time Charge via authenticated admin.graphql()
  try {
    // Clean up any old PENDING records for this section
    await prisma.sectionPurchase.deleteMany({
      where: { shop, sectionHandle: sectionId, status: "PENDING" },
    });

    const appUrl =
      process.env.SHOPIFY_APP_URL || "https://section-hub-app.fly.dev";
    const returnUrl = `${appUrl}/app/billing/complete?shop=${encodeURIComponent(shop)}&section=${encodeURIComponent(sectionId)}`;

    const response = await admin.graphql(
      `#graphql
      mutation appPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean!) {
        appPurchaseOneTimeCreate(name: $name, price: $price, returnUrl: $returnUrl, test: $test) {
          appPurchaseOneTime {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          name: `${section.name} – Section Hub`,
          price: {
            amount: sectionPrice.toFixed(2),
            currencyCode: section.price?.currency || "EUR",
          },
          returnUrl,
          test: true, // TEST MODE – set to false for production
        },
      },
    );

    const json = await response.json();
    console.log(
      "appPurchaseOneTimeCreate Response:",
      JSON.stringify(json, null, 2),
    );

    const result = json.data?.appPurchaseOneTimeCreate;

    // Check for user errors
    if (result?.userErrors && result.userErrors.length > 0) {
      const errors = result.userErrors
        .map((e: { field: string[]; message: string }) => e.message)
        .join(", ");
      console.error("Billing userErrors:", errors);
      return Response.json(
        { success: false, error: `Billing error: ${errors}` },
        { status: 400 },
      );
    }

    const confirmationUrl = result?.confirmationUrl;
    const purchase = result?.appPurchaseOneTime;

    if (confirmationUrl && purchase) {
      // Save the purchase record in the database
      await prisma.sectionPurchase.create({
        data: {
          shop,
          sectionHandle: sectionId,
          appPurchaseId: purchase.id,
          amount: sectionPrice,
          currency: section.price?.currency || "EUR",
          status: purchase.status || "PENDING",
        },
      });

      console.log("Purchase created:", purchase.id, "->", confirmationUrl);
      return Response.json({
        success: true,
        purchaseRequired: true,
        confirmationUrl,
        appPurchaseId: purchase.id,
      });
    }

    // No confirmation URL received – should not happen
    console.error("No confirmationUrl from Shopify");
    return Response.json(
      { success: false, error: "Could not create charge. Please try again." },
      { status: 500 },
    );
  } catch (error) {
    console.error("Purchase creation error:", error);
    // DO NOT create mock records — just report the error
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
};
