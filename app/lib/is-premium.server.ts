import prisma from "../db.server";

// ── In-memory cache for premium status (60s TTL) ──
// Prevents a DB query on every single page load.
const CACHE_TTL = 60_000; // 60 seconds
const premiumCache = new Map<string, {
  result: { isPremium: boolean; isCancelling: boolean; currentPeriodEnd: Date | null };
  expiresAt: number;
}>();

/**
 * Invalidate the premium cache for a shop (call after subscription changes).
 */
export function invalidatePremiumCache(shop: string) {
  premiumCache.delete(shop);
}

/**
 * Checks if a shop has an active premium subscription.
 * Also returns true during "cancelling" state (subscription cancelled but period hasn't ended yet).
 * Results are cached in memory for 60 seconds.
 */
export async function checkIsPremium(shop: string): Promise<{
  isPremium: boolean;
  isCancelling: boolean;
  currentPeriodEnd: Date | null;
}> {
  // Check cache first
  const cached = premiumCache.get(shop);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const subscription = await prisma.subscription.findUnique({ where: { shop } });

  let result: { isPremium: boolean; isCancelling: boolean; currentPeriodEnd: Date | null };

  if (!subscription) {
    result = { isPremium: false, isCancelling: false, currentPeriodEnd: null };
  } else if (subscription.plan === "premium" && subscription.status === "active") {
    // Active subscription
    result = { isPremium: true, isCancelling: false, currentPeriodEnd: subscription.currentPeriodEnd };
  } else if (subscription.status === "cancelling" && subscription.currentPeriodEnd) {
    if (new Date() < subscription.currentPeriodEnd) {
      // Cancelling but period still active
      result = { isPremium: true, isCancelling: true, currentPeriodEnd: subscription.currentPeriodEnd };
    } else {
      // Period has ended – finalize cancellation
      await prisma.subscription.update({
        where: { shop },
        data: { status: "cancelled", plan: "free" },
      });
      result = { isPremium: false, isCancelling: false, currentPeriodEnd: null };
    }
  } else {
    result = { isPremium: false, isCancelling: false, currentPeriodEnd: null };
  }

  // Store in cache
  premiumCache.set(shop, { result, expiresAt: Date.now() + CACHE_TTL });

  return result;
}
