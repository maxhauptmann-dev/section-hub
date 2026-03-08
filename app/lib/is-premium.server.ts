import prisma from "../db.server";

/**
 * Checks if a shop has an active premium subscription.
 * Also returns true during "cancelling" state (subscription cancelled but period hasn't ended yet).
 */
export async function checkIsPremium(shop: string): Promise<{
  isPremium: boolean;
  isCancelling: boolean;
  currentPeriodEnd: Date | null;
}> {
  const subscription = await prisma.subscription.findUnique({ where: { shop } });

  if (!subscription) {
    return { isPremium: false, isCancelling: false, currentPeriodEnd: null };
  }

  // Active subscription
  if (subscription.plan === "premium" && subscription.status === "active") {
    return { isPremium: true, isCancelling: false, currentPeriodEnd: subscription.currentPeriodEnd };
  }

  // Cancelling but period still active
  if (subscription.status === "cancelling" && subscription.currentPeriodEnd) {
    if (new Date() < subscription.currentPeriodEnd) {
      return { isPremium: true, isCancelling: true, currentPeriodEnd: subscription.currentPeriodEnd };
    }
    // Period has ended – finalize cancellation
    await prisma.subscription.update({
      where: { shop },
      data: { status: "cancelled", plan: "free" },
    });
    return { isPremium: false, isCancelling: false, currentPeriodEnd: null };
  }

  return { isPremium: false, isCancelling: false, currentPeriodEnd: null };
}
