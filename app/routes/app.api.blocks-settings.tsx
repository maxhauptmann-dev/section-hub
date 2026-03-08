import type { ActionFunctionArgs } from "react-router";

// In-Memory Store für Block-Einstellungen (vereinfacht)
const blockStates = new Map<string, boolean>();

// Alle verfügbaren Blocks
const DEFAULT_BLOCKS = [
  "social-proof",
  "countdown",
  "benefit-boxes",
  "copy-discount-code",
  "inventory-bar",
  "inventory-status",
  "payment-icons",
  "feature-list",
  "badges",
  "video-carousel",
  "upsell",
  "wrapper",
  "trustpilot-review",
  "shipping-info",
];

// Initialize alle Blocks als enabled
DEFAULT_BLOCKS.forEach(blockId => {
  if (!blockStates.has(blockId)) {
    blockStates.set(blockId, true);
  }
});

// Speichert die aktivierten Conversion Blocks
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { blockId, enabled } = body;

    // Speichere Block-Status im Memory
    blockStates.set(blockId, enabled);

    return Response.json({
      success: true,
      message: `Block ${blockId} ${enabled ? "enabled" : "disabled"}`,
      blockId,
      enabled,
    });
  } catch (error) {
    console.error("Error updating block:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

// Lädt die aktivierten Blocks
export const loader = async () => {
  try {
    const blocks = DEFAULT_BLOCKS.map(blockId => ({
      blockId,
      enabled: blockStates.get(blockId) ?? true,
    }));
    
    return Response.json({ blocks });
  } catch (error) {
    console.error("Error loading blocks:", error);
    return Response.json({ blocks: [] });
  }
};

