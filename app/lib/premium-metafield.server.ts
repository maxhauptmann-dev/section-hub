const API_VERSION = "2024-10";

/**
 * Sets the shop-level metafield `sectioniq.premium` to "active" or "inactive".
 * Premium blocks in the theme extension check this metafield to decide whether to render.
 * Uses REST API to set shop-owned metafield (more reliable for shop-level metafields).
 */
export async function setPremiumMetafield(
  shop: string,
  accessToken: string,
  active: boolean,
) {
  try {
    // First, ensure the metafield definition exists for Liquid access
    await ensureMetafieldDefinition(shop, accessToken);

    // Use REST API for shop-level metafield (simpler than GraphQL for this)
    const res = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/metafields.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          metafield: {
            namespace: "sectioniq",
            key: "premium",
            value: active ? "active" : "inactive",
            type: "single_line_text_field",
          },
        }),
      },
    );

    const json = await res.json();

    if (json.errors) {
      console.error("Metafield set errors:", json.errors);
    } else {
      console.log(`✅ Premium metafield set to ${active ? "active" : "inactive"} for ${shop}`);
    }

    return json;
  } catch (error) {
    console.error("Error setting premium metafield:", error);
  }
}

/**
 * Ensures the metafield definition exists so Liquid can access shop.metafields.sectioniq.premium
 */
async function ensureMetafieldDefinition(shop: string, accessToken: string) {
  try {
    const res = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: `
            mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
              metafieldDefinitionCreate(definition: $definition) {
                createdDefinition { id }
                userErrors { field message }
              }
            }
          `,
          variables: {
            definition: {
              name: "Premium Status",
              namespace: "sectioniq",
              key: "premium",
              type: "single_line_text_field",
              ownerType: "SHOP",
              access: {
                storefront: "PUBLIC_READ",
              },
            },
          },
        }),
      },
    );

    const json = await res.json();
    const errors = json.data?.metafieldDefinitionCreate?.userErrors;
    
    // Ignore "already exists" errors
    if (errors?.length > 0 && !errors.some((e: any) => e.message?.includes("already exists") || e.message?.includes("taken"))) {
      console.warn("Metafield definition errors:", errors);
    }
  } catch (error) {
    console.warn("Could not ensure metafield definition:", error);
  }
}

/**
 * Alternative: Set via admin GraphQL client (when we have the admin object from authenticate)
 */
export async function setPremiumMetafieldViaAdmin(
  admin: any,
  active: boolean,
) {
  // Ensure definition exists
  try {
    await admin.graphql(
      `#graphql
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          definition: {
            name: "Premium Status",
            namespace: "sectioniq",
            key: "premium",
            type: "single_line_text_field",
            ownerType: "SHOP",
            access: {
              storefront: "PUBLIC_READ",
            },
          },
        },
      },
    );
  } catch (e) {
    // Definition may already exist, that's fine
  }

  // First, get the shop's GID for ownerId
  const shopResponse = await admin.graphql(
    `#graphql
    query { shop { id } }`,
  );
  const shopJson = await shopResponse.json();
  const shopId = shopJson.data?.shop?.id;

  if (!shopId) {
    console.error("Could not get shop ID for metafield");
    return;
  }

  // Set the metafield value with ownerId
  const response = await admin.graphql(
    `#graphql
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key value }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: "sectioniq",
            key: "premium",
            value: active ? "active" : "inactive",
            type: "single_line_text_field",
          },
        ],
      },
    },
  );

  const json = await response.json();
  
  if (json.data?.metafieldsSet?.userErrors?.length > 0) {
    console.error("Metafield set errors:", json.data.metafieldsSet.userErrors);
  } else {
    console.log(`✅ Premium metafield set to ${active ? "active" : "inactive"}`);
  }

  return json;
}
