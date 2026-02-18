import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles } from "../lib/sections.server";
import { createOneTimePurchase, hasPurchasedSection } from "../services/billing.server";

/**
 * API Route: Install section to theme
 * POST /app/api/install-section
 * Body: { sectionId: string }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Parse request body
  const formData = await request.formData();
  const sectionId = formData.get("sectionId") as string;

  if (!sectionId) {
    return Response.json({ success: false, error: "Section ID is missing" }, { status: 400 });
  }

  // Load section files
  const section = getSectionWithFiles(sectionId);
  if (!section) {
    return Response.json({ success: false, error: "Section not found" }, { status: 404 });
  }

  const shop = session.shop;
  const accessToken = session.accessToken || "";

  // Check if section has a price and if it has been purchased
  const sectionPrice = section.price?.amount || 0;
  if (sectionPrice > 0) {
    const purchased = await hasPurchasedSection(shop, sectionId);
    if (!purchased) {
      // Trigger one-time purchase
      try {
        const returnUrl = `${process.env.SHOPIFY_APP_URL || "http://localhost:3000"}/app/billing/complete?shop=${encodeURIComponent(shop)}&section=${encodeURIComponent(sectionId)}`;
        const purchase = await createOneTimePurchase(
          shop,
          accessToken,
          `${section.name} - Section Hub`,
          sectionPrice,
          section.price?.currency || "EUR",
          returnUrl
        );
        return Response.json({
          success: false,
          purchaseRequired: true,
          confirmationUrl: purchase.confirmationUrl,
          appPurchaseId: purchase.id,
        });
      } catch (error) {
        console.error("Purchase creation error:", error);
        return Response.json({
          success: false,
          error: "Failed to initiate purchase",
        }, { status: 500 });
      }
    }
  }

  try {
    // 1. Fetch all themes and find the main theme
    const themesResponse = await admin.graphql(`
      query {
        themes(first: 10) {
          nodes {
            id
            name
            role
          }
        }
      }
    `);

    const themesData = await themesResponse.json();
    const themes = themesData.data?.themes?.nodes || [];
    const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

    if (!mainTheme) {
      return Response.json({ success: false, error: "No active theme found" }, { status: 400 });
    }

    // Extract theme ID from GID (gid://shopify/Theme/123456789 -> 123456789)
    const themeId = mainTheme.id.split("/").pop();

    // 2. Upload section liquid file to theme
    const sectionFileName = `section-${sectionId}.liquid`;

    // Embed CSS inline into liquid file
    const liquidWithStyles = `{% comment %}
  Section Hub - ${section.name}
  Version: ${section.version}
  Installed via Section Hub App
{% endcomment %}

<style>
${section.cssContent}
</style>

${section.liquidContent}`;

    const assetResponse = await fetch(
      `https://${shop}/admin/api/2024-10/themes/${themeId}/assets.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          asset: {
            key: `sections/${sectionFileName}`,
            value: liquidWithStyles,
          },
        }),
      }
    );

    if (!assetResponse.ok) {
      const errorData = await assetResponse.json();
      console.error("Asset upload error:", errorData);
      return Response.json({
        success: false,
        error: "Error uploading section to theme",
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: `${section.name} was successfully installed!`,
      sectionFileName,
      themeName: mainTheme.name,
    });
  } catch (error) {
    console.error("Install section error:", error);
    return Response.json({
      success: false,
      error: "An error occurred",
    }, { status: 500 });
  }
};
