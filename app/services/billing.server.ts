import prisma from "../db.server";

const API_VERSION = "2025-10";

/**
 * Create a one-time app purchase for a section.
 *
 * Returns the Shopify purchase data (id, confirmationUrl, status)
 * or null if the API call failed. NEVER creates mock/fallback records.
 */
export async function createOneTimePurchase(
  shop: string,
  accessToken: string,
  name: string,
  amount: number,
  currency: string = "EUR",
  returnUrl: string
) {
  const useTestMode = false;

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
  if (!ap) {
    throw new Error("No purchase object returned from Shopify");
  }

  return {
    id: ap.id,
    confirmationUrl: ap.confirmationUrl,
    status: ap.status,
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
 * Check if a section has been purchased for a shop.
 * Only returns true for genuinely COMPLETED purchases.
 */
export async function hasPurchasedSection(shop: string, sectionHandle: string) {
  try {
    const purchase = await prisma.sectionPurchase.findFirst({
      where: {
        shop,
        sectionHandle,
        status: "COMPLETED",
      },
    });
    return !!purchase;
  } catch (error) {
    console.error("Error checking purchased section:", error);
    return false;
  }
}

/**
 * Mark all purchase records with a given appPurchaseId as COMPLETED
 */
export async function markPurchaseCompleted(appPurchaseId: string) {
  await prisma.sectionPurchase.updateMany({
    where: { appPurchaseId },
    data: { status: "COMPLETED" },
  });
}

/**
 * Get purchase records by app purchase ID
 */
export async function getPurchaseByAppId(appPurchaseId: string) {
  return prisma.sectionPurchase.findMany({
    where: { appPurchaseId },
  });
}
