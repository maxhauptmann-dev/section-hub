import { Page, Layout, Card, Text, BlockStack, InlineStack, Thumbnail } from "@shopify/polaris";

const INSPIRATIONS = [
  { title: "Hero mit Video Background", category: "Hero", color: "#dbeafe" },
  { title: "Animated Testimonials", category: "Social Proof", color: "#dcfce7" },
  { title: "Before/After Slider", category: "Product", color: "#fef3c7" },
  { title: "Mega Footer", category: "Footer", color: "#fee2e2" },
];

export default function InspirationPage() {
  return (
    <Page title="Section Inspiration">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Lass dich inspirieren
              </Text>
              <Text as="p" variant="bodyMd">
                Entdecke kreative Section-Designs von erfolgreichen Shopify Stores.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {INSPIRATIONS.map((item, idx) => (
              <Card key={idx}>
                <BlockStack gap="300">
                  <InlineStack gap="300" blockAlign="center">
                    <Thumbnail
                      source={`data:image/svg+xml;utf8,${encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
                          <rect width="80" height="80" rx="12" fill="${item.color}"/>
                        </svg>`
                      )}`}
                      alt={item.title}
                      size="large"
                    />
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingMd">{item.title}</Text>
                      <Text as="p" variant="bodySm" tone="subdued">{item.category}</Text>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </Card>
            ))}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
