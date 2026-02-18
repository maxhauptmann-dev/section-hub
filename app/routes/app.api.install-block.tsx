import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * API Route: Install conversion block to theme
 * POST /app/api/install-block
 * Body: { blockId: string }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const { admin, session } = await authenticate.admin(request);

  // Parse request body
  const formData = await request.formData();
  const blockId = formData.get("blockId") as string;

  if (!blockId) {
    return Response.json({ success: false, error: "Block ID is missing" }, { status: 400 });
  }

  try {
    // Load block files from the app/sections directory
    const blockDir = join(process.cwd(), "app", "sections", blockId);
    
    let liquidContent = "";
    let cssContent = "";

    try {
      // Try to read block.liquid, fall back to section.liquid
      try {
        liquidContent = readFileSync(join(blockDir, "block.liquid"), "utf-8");
      } catch {
        liquidContent = readFileSync(join(blockDir, "section.liquid"), "utf-8");
      }

      // Try to read styles.css
      try {
        cssContent = readFileSync(join(blockDir, "styles.css"), "utf-8");
      } catch {
        cssContent = "";
      }
    } catch (readError) {
      console.error(`Error reading block files for ${blockId}:`, readError);
      return Response.json(
        { success: false, error: `Block files not found for ${blockId}` },
        { status: 404 }
      );
    }

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

    // Extract theme ID from GID
    const themeId = mainTheme.id.split("/").pop();

    // 2. Read meta.json for block name
    let blockName = blockId;
    try {
      const metaPath = join(blockDir, "meta.json");
      const metaContent = readFileSync(metaPath, "utf-8");
      const meta = JSON.parse(metaContent);
      blockName = meta.name || blockId;
    } catch (metaError) {
      console.error(`Error reading meta.json for ${blockId}:`, metaError);
    }

    // 3. Create block file with embedded CSS
    const blockFileName = `block-${blockId}.liquid`;
    
    // Don't wrap the liquid content - it already has the schema section
    const liquidWithStyles = `${liquidContent}`;

    // 4. Upload block file to theme via REST API
    const shop = session.shop;
    const accessToken = session.accessToken;
    
    console.log("Attempting to upload block as section:", {
      shop,
      themeId,
      blockFileName,
      assetKey: `sections/${blockFileName}`,
      contentLength: liquidWithStyles.length,
    });

    const assetResponse = await fetch(
      `https://${shop}/admin/api/2025-10/themes/${themeId}/assets.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken || "",
        },
        body: JSON.stringify({
          asset: {
            key: `sections/${blockFileName}`,
            value: liquidWithStyles,
          },
        }),
      }
    );

    const responseText = await assetResponse.text();
    console.log("Asset upload response:", {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      body: responseText,
    });

    if (!assetResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }
      console.error("Block asset upload error:", errorData);
      return Response.json(
        { 
          success: false, 
          error: "Error uploading block to theme",
          details: errorData,
          apiEndpoint: `https://${shop}/admin/api/2025-10/themes/${themeId}/assets.json`,
        },
        { status: 500 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { success: true };
    }
    
    // 5. Now update product.liquid to include the block reference
    // First, fetch the current product.liquid content
    console.log("Fetching product.liquid to add block reference...");
    
    const productLiquidResponse = await fetch(
      `https://${shop}/admin/api/2025-10/themes/${themeId}/assets.json?asset[key]=templates/product.liquid`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken || "",
        },
      }
    );

    if (productLiquidResponse.ok) {
      try {
        const productData = await productLiquidResponse.json();
        let productLiquidContent = productData.asset?.value || "";

        // Add the block reference if it's not already there
        if (productLiquidContent && !productLiquidContent.includes("block-payment-icons")) {
          const blockReference = `\n{%- section "block-payment-icons" -%}\n`;

          // Try to insert after add-to-cart or before related products
          if (productLiquidContent.includes("cart-form")) {
            productLiquidContent = productLiquidContent.replace(
              /({%.*?cart-form.*?%})/,
              `$1${blockReference}`
            );
          } else if (productLiquidContent.includes("related-products")) {
            productLiquidContent = productLiquidContent.replace(
              /({%.*?related-products.*?%})/,
              `${blockReference}$1`
            );
          } else {
            // Just append at the end
            productLiquidContent = productLiquidContent + blockReference;
          }

          // Update product.liquid
          const updateProductResponse = await fetch(
            `https://${shop}/admin/api/2025-10/themes/${themeId}/assets.json`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken || "",
              },
              body: JSON.stringify({
                asset: {
                  key: "templates/product.liquid",
                  value: productLiquidContent,
                },
              }),
            }
          );

          if (updateProductResponse.ok) {
            console.log("✅ Updated product.liquid with block reference");
          } else {
            console.warn("⚠️ Could not update product.liquid, but block file was uploaded successfully");
          }
        }
      } catch (productError) {
        console.warn("Could not update product.liquid:", productError instanceof Error ? productError.message : String(productError));
      }
    }
    
    return Response.json({
      success: true,
      message: `${blockName} block was successfully installed! Please refresh your product page in the Theme Editor.`,
      block: {
        id: blockId,
        name: blockName,
        fileName: blockFileName,
        key: `blocks/${blockFileName}`,
      },
      asset: result.asset,
      sectionPath: `sections/${blockFileName}`,
    });

  } catch (error) {
    console.error("Block installation error:", error);
    return Response.json(
      {
        success: false,
        error: "An unexpected error occurred during block installation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
