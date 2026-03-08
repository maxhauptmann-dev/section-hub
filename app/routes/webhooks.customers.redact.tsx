import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Mandatory Compliance Webhook: customers/redact
 * Shopify sends this when a store owner requests deletion of customer data.
 * Since we don't store any customer data, we just acknowledge the request.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // We don't store any customer personal data,
  // so there is nothing to delete.
  return new Response();
};
