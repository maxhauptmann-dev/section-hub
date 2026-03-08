import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles } from "../lib/sections.server";
import prisma from "../db.server";

/**
 * API Route: Purchase a bundle of sections (One-Time Charge via Shopify Billing API)
 * POST /app/api/purchase-bundle
 * Body (JSON): { sections: string[], discount: number, total: number }
 *
 * NEVER creates mock/fallback "COMPLETED" records.
 * Sections are only marked COMPLETED after Shopify confirms payment
 * via the /app/billing/complete callback.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  let body: { sections?: string[]; discount?: number; total?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { sections: sectionIds } = body;

  if (!sectionIds || !Array.isArray(sectionIds) || sectionIds.length < 2) {
    return Response.json(
      { success: false, error: "Select at least 2 sections for a bundle" },
      { status: 400 },
    );
  }

  // Validate all sections exist and are paid; skip truly completed ones
  const validSections = [];
  for (const id of sectionIds) {
    const section = getSectionWithFiles(id);
    if (!section) {
      return Response.json(
        { success: false, error: `Section "${id}" not found` },
        { status: 404 },
      );
    }
    if (section.price?.type === "free" || (section.price?.amount ?? 0) <= 0)
      continue;

    // Only skip if there is a genuinely COMPLETED purchase
    const completedPurchase = await prisma.sectionPurchase.findFirst({
      where: { shop, sectionHandle: id, status: "COMPLETED" },
    });
    if (completedPurchase) continue;

    validSections.push(section);
  }

  if (validSections.length === 0) {
    return Response.json({
      success: true,
      alreadyPurchased: true,
      message: "All sections already purchased or free.",
    });
  }

  // Clean up old PENDING bundle records for these sections
  await prisma.sectionPurchase.deleteMany({
    where: {
      shop,
      status: "PENDING",
      sectionHandle: {
        in: validSections.map((s) => s.id),
      },
    },
  });

  // Discount based on total selected count (including already-owned)
  const totalSelected = sectionIds.length;
  let bundleDiscount = 0;
  if (totalSelected >= 5) bundleDiscount = 25;
  else if (totalSelected >= 3) bundleDiscount = 15;
  else if (totalSelected >= 2) bundleDiscount = 10;

  const rawTotal = validSections.reduce(
    (sum, s) => sum + (s.price?.amount ?? 0),
    0,
  );
  const bundleTotal =
    Math.round(rawTotal * (1 - bundleDiscount / 100) * 100) / 100;

  try {
    const appUrl =
      process.env.SHOPIFY_APP_URL ||
      "https://section-hub-app.fly.dev";
    const sectionIdsParam = validSections.map((s) => s.id).join(",");
    const returnUrl = `${appUrl}/app/billing/complete?shop=${encodeURIComponent(shop)}&bundle=${encodeURIComponent(sectionIdsParam)}&discount=${bundleDiscount}`;

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
          name: `Bundle (${validSections.length} Section${validSections.length !== 1 ? "s" : ""}) – Section Hub`,
          price: {
            amount: bundleTotal.toFixed(2),
            currencyCode: "EUR",
          },
          returnUrl,
          test: true,
        },
      },
    );

    const json = await response.json();
    console.log("Bundle purchase response:", JSON.stringify(json, null, 2));

    const result = json.data?.appPurchaseOneTimeCreate;

    if (result?.userErrors && result.userErrors.length > 0) {
      const errors = result.userErrors
        .map((e: { field: string[]; message: string }) => e.message)
        .join(", ");
      console.error("Bundle billing userErrors:", errors);
      return Response.json(
        { success: false, error: `Billing error: ${errors}` },
        { status: 400 },
      );
    }

    const confirmationUrl = result?.confirmationUrl;
    const purchase = result?.appPurchaseOneTime;

    if (confirmationUrl && purchase) {
      // Create one PENDING record per section in the bundle
      for (const section of validSections) {
        await prisma.sectionPurchase.create({
          data: {
            shop,
            sectionHandle: section.id,
            appPurchaseId: purchase.id,
            amount:
              Math.round(
                (section.price?.amount ?? 0) *
                  (1 - bundleDiscount / 100) *
                  100,
              ) / 100,
            currency: "EUR",
            status: "PENDING",
          },
        });
      }

      console.log(
        "Bundle purchase created (PENDING):",
        purchase.id,
        `${validSections.length} sections, €${bundleTotal}`,
      );

      return Response.json({
        success: true,
        purchaseRequired: true,
        confirmationUrl,
        appPurchaseId: purchase.id,
        sectionCount: validSections.length,
        bundleTotal,
      });
    }

    // No confirmation URL — should not happen with valid Shopify API
    console.error("No confirmationUrl returned from Shopify");
    return Response.json(
      { success: false, error: "Could not create charge. Please try again." },
      { status: 500 },
    );
  } catch (error) {
    console.error("Bundle purchase error:", error);
    // DO NOT create any mock records — just report the error
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
};
