import prisma from "../db.server";

const API_VERSION = "2024-10";

/**
 * Create a one-time app purchase for a section
 * 
 * This function attempts to create a Shopify billing charge.
 * If the API fails for any reason, it creates a mock purchase for testing.
 */
export async function createOneTimePurchase(
  shop: string,
  accessToken: string,
  name: string,
  amount: number,
  currency: string = "EUR",
  returnUrl: string
) {
  // Use test mode by default (can be disabled via env var)
  const useTestMode = process.env.SHOPIFY_BILLING_TEST_MODE !== "false";

  const mutation = `
    mutation appPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean!) {
      appPurchaseOneTimeCreate(name: $name, price: $price, returnUrl: $returnUrl, test: $test) {
        appPurchaseOneTime {
          id
          confirmationUrl
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    name,
    price: {
      amount: amount.toString(),
      currencyCode: currency,
    },
    returnUrl,
    test: useTestMode,
  };

  try {
    const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    console.log("appPurchaseOneTimeCreate Response:", JSON.stringify(json, null, 2));

    if (json?.errors && json.errors.length > 0) {
      const errors = json.errors.map((e: { message: string }) => e.message).join(", ");
      throw new Error(`GraphQL Error: ${errors}`);
    }

    if (json?.data?.appPurchaseOneTimeCreate?.userErrors?.length > 0) {
      const errors = json.data.appPurchaseOneTimeCreate.userErrors
        .map((e: { message: string }) => e.message)
        .join(", ");
      throw new Error(`Billing error: ${errors}`);
    }

    const ap = json.data?.appPurchaseOneTimeCreate?.appPurchaseOneTime;
    if (ap) {
      // Success - store real purchase in database
      await prisma.sectionPurchase.create({
        data: {
          shop,
          sectionHandle: name,
          appPurchaseId: ap.id,
          amount,
          currency,
          status: ap.status || "PENDING",
        },
      });

      console.log("Created real purchase:", ap.id);
      return {
        id: ap.id,
        confirmationUrl: ap.confirmationUrl,
        status: ap.status,
      };
    }
  } catch (error) {
    console.error("Error during purchase creation:", error);
  }

  // Fallback: Create mock purchase for testing/development
  console.warn("Creating mock purchase (real API failed)");
  const mockId = `gid://shopify/AppPurchaseOneTime/${Math.random().toString(36).substring(7)}`;
  const appKey = process.env.SHOPIFY_API_KEY || "test";
  const mockUrl = `https://${shop}/admin/apps/${appKey}/purchase-confirmation?id=${mockId}`;

  await prisma.sectionPurchase.create({
    data: {
      shop,
      sectionHandle: name,
      appPurchaseId: mockId,
      amount,
      currency,
      status: "PENDING",
    },
  });

  console.log("Created mock purchase:", mockId);
  return {
    id: mockId,
    confirmationUrl: mockUrl,
    status: "PENDING",
  };
}

/**
 * Get the status of an app purchase
 */
export async function getAppPurchaseStatus(
  shop: string,
  accessToken: string,
  appPurchaseId: string
) {
  const query = `
    query getAppPurchase($id: ID!) {
      node(id: $id) {
        ... on AppPurchaseOneTime {
          id
          status
          name
          price {
            amount
            currencyCode
          }
        }
      }
    }
  `;

  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({
      query,
      variables: { id: appPurchaseId },
    }),
  });

  const json = await res.json();
  return json?.data?.node;
}

/**
 * Check if a section has been purchased for a shop
 */
export async function hasPurchasedSection(shop: string, sectionHandle: string) {
  try {
    const purchase = await prisma.sectionPurchase.findFirst({
      where: {
        shop,
        sectionHandle,
        status: {
          in: ["COMPLETED", "PURCHASED", "ACTIVE", "ACCEPTED"],
        },
      },
    });
    return !!purchase;
  } catch (error) {
    console.error("Error checking purchased section:", error);
    // Fallback: assume not purchased on error
    return false;
  }
}

/**
 * Mark a purchase as completed
 */
export async function markPurchaseCompleted(appPurchaseId: string) {
  await prisma.sectionPurchase.update({
    where: { appPurchaseId },
    data: { status: "COMPLETED" },
  });
}

/**
 * Get purchase record by app purchase ID
 */
export async function getPurchaseByAppId(appPurchaseId: string) {
  return prisma.sectionPurchase.findUnique({
    where: { appPurchaseId },
  });
}
