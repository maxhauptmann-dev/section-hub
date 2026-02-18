import prisma from "../db.server";

const API_VERSION = "2024-10";

/**
 * Create a one-time app purchase for a section
 */
export async function createOneTimePurchase(
  shop: string,
  accessToken: string,
  name: string,
  amount: number,
  currency: string = "EUR",
  returnUrl: string
) {
  const mutation = `
    mutation appPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!) {
      appPurchaseOneTimeCreate(name: $name, price: $price, returnUrl: $returnUrl) {
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
  };

  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  const json = await res.json();

  console.log("appPurchaseOneTimeCreate Response:", JSON.stringify(json, null, 2));

  if (json?.data?.appPurchaseOneTimeCreate?.userErrors?.length > 0) {
    const errors = json.data.appPurchaseOneTimeCreate.userErrors
      .map((e: { message: string }) => e.message)
      .join(", ");
    throw new Error(`Billing error: ${errors}`);
  }

  const ap = json.data?.appPurchaseOneTimeCreate?.appPurchaseOneTime;
  if (!ap) {
    // Fallback für Test/Dev Umgebung: Erstelle einen Mock-Purchase
    if (process.env.NODE_ENV === "development") {
      console.warn("No purchase response from Shopify - creating mock for development");
      const mockId = `gid://shopify/AppPurchaseOneTime/${Math.random().toString(36).substring(7)}`;
      const mockUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}/purchase-confirmation?id=${mockId}`;

      // Store mock purchase in database
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

      return {
        id: mockId,
        confirmationUrl: mockUrl,
        status: "PENDING",
      };
    }

    throw new Error("No purchase response received from Shopify");
  }

  // Store purchase in database
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
 * Check if a section has been purchased for a shop
 */
export async function hasPurchasedSection(shop: string, sectionHandle: string) {
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
