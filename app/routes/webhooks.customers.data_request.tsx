import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Mandatory Compliance Webhook: customers/data_request
 * Shopify sends this when a customer requests their data.
 * Since we don't store any customer data, we just acknowledge the request.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // We don't store any customer personal data,
  // so there is nothing to return.
  return new Response();
};
