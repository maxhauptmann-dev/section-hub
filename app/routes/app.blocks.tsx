import { Page, Layout, Card, Text, BlockStack, InlineStack, Badge } from "@shopify/polaris";

export default function ConversionBlocksPage() {
  return (
    <Page title="Conversion Blocks">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                High-Converting Blocks
              </Text>
              <Text as="p" variant="bodyMd">
                Steigere deine Conversion-Rate mit bewährten UI-Elementen.
              </Text>
              <InlineStack gap="200">
                <Badge tone="info">Countdown Timer</Badge>
                <Badge tone="info">Trust Badges</Badge>
                <Badge tone="info">Social Proof</Badge>
                <Badge tone="info">Urgency Bars</Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
