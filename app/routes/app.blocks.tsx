import { useState } from "react";
import { Page, Layout, Card, Text, BlockStack, Badge, Button, Box } from "@shopify/polaris";

interface ConversionBlock {
  id: string;
  name: string;
  description: string;
  category: string;
  preview: React.ReactNode;
  installed?: boolean;
  isLoading?: boolean;
}

const PaymentIconsBlockPreview = () => (
  <Box padding="400">
    <BlockStack gap="300">
      <Text as="p" variant="bodySm" tone="subdued">
        Store + custom payment icons
      </Text>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          <Text as="span" variant="bodySm">💳 6Pay</Text>
        </div>
        <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          <Text as="span" variant="bodySm">💳 Mastercard</Text>
        </div>
        <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          <Text as="span" variant="bodySm">🔵 Google Pay</Text>
        </div>
        <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          <Text as="span" variant="bodySm">🍎 Apple Pay</Text>
        </div>
        <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          <Text as="span" variant="bodySm">🅿️ PayPal</Text>
        </div>
        <div style={{ padding: "8px 12px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
          <Text as="span" variant="bodySm">💳 Visa</Text>
        </div>
      </div>
    </BlockStack>
  </Box>
);

const conversionBlocks: ConversionBlock[] = [
  {
    id: "payment-icons",
    name: "Payment Icons",
    description: "Display payment method icons below the purchase button to build customer trust and show accepted payment options.",
    category: "Trust & Credibility",
    preview: <PaymentIconsBlockPreview />,
    installed: false,
  },
  {
    id: "countdown-timer",
    name: "Countdown Timer",
    description: "Create urgency with a countdown timer for limited-time offers.",
    category: "Urgency",
    preview: null,
    installed: false,
  },
  {
    id: "trust-badges",
    name: "Trust Badges",
    description: "Display security and trust badges to increase customer confidence.",
    category: "Trust & Credibility",
    preview: null,
    installed: false,
  },
  {
    id: "social-proof",
    name: "Social Proof",
    description: "Show recent purchases and customer testimonials.",
    category: "Social Proof",
    preview: null,
    installed: false,
  },
];

export default function ConversionBlocksPage() {
  const [blocks, setBlocks] = useState<ConversionBlock[]>(conversionBlocks);

  const handleInstall = async (blockId: string) => {
    // Update UI to show loading state
    setBlocks(blocks.map(block => 
      block.id === blockId ? { ...block, isLoading: true } : block
    ));

    try {
      // Call the install-block API endpoint
      const formData = new FormData();
      formData.append("blockId", blockId);

      const response = await fetch("/app/api/install-block", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Mark block as installed
        setBlocks(blocks.map(block => 
          block.id === blockId 
            ? { ...block, installed: true, isLoading: false } 
            : block
        ));
        console.log(`✅ Block installed: ${result.message}`);
      } else {
        // Show error but don't change UI permanently
        console.error(`❌ Installation failed: ${result.error}`);
        setBlocks(blocks.map(block => 
          block.id === blockId ? { ...block, isLoading: false } : block
        ));
        alert(`Installation failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Installation error:", error);
      setBlocks(blocks.map(block => 
        block.id === blockId ? { ...block, isLoading: false } : block
      ));
      alert(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const categorizedBlocks = blocks.reduce((acc, block) => {
    if (!acc[block.category]) {
      acc[block.category] = [];
    }
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, ConversionBlock[]>);

  return (
    <Page title="Conversion Blocks">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  High-Converting Blocks
                </Text>
                <Text as="p" variant="bodyMd">
                  Boost your conversion rate with proven UI elements that can be fixed below the purchase button.
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {Object.entries(categorizedBlocks).map(([category, categoryBlocks]) => (
          <Layout.Section key={category}>
            <Card>
              <BlockStack gap="400">
                <div style={{ paddingBottom: "12px", borderBottom: "1px solid #d5d5d5" }}>
                  <Text as="h3" variant="headingMd">
                    {category}
                  </Text>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                  {categoryBlocks.map((block) => (
                    <Card key={block.id}>
                      <BlockStack gap="300">
                        <BlockStack gap="100">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Text as="h4" variant="headingMd">
                              {block.name}
                            </Text>
                            {block.installed && (
                              <Badge tone="success">Installed</Badge>
                            )}
                          </div>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {block.description}
                          </Text>
                        </BlockStack>

                        {block.preview && (
                          <div style={{ paddingTop: "12px", paddingBottom: "12px", borderTop: "1px solid #e5e5e5", borderBottom: "1px solid #e5e5e5" }}>
                            {block.preview}
                          </div>
                        )}

                        <div style={{ paddingTop: "8px" }}>
                          <Button
                            onClick={() => handleInstall(block.id)}
                            disabled={block.installed || block.isLoading}
                            loading={block.isLoading}
                            variant="primary"
                            fullWidth
                          >
                            {block.isLoading ? "Installing..." : block.installed ? "Installed" : "Install Block"}
                          </Button>
                        </div>
                      </BlockStack>
                    </Card>
                  ))}
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        ))}
      </Layout>
    </Page>
  );
}
