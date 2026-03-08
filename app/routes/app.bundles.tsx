import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Bundles page – redirects to Premium since all sections
 * are now included in the subscription model.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return redirect("/app/premium");
};

export default function BundlesRedirect() {
  return null;
}
