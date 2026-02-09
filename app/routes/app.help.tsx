import { Page, Layout, Card, Text, BlockStack, Button, InlineStack } from "@shopify/polaris";

export default function HelpcenterPage() {
  return (
    <Page title="Help Center">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                How can we help you?
              </Text>
              <Text as="p" variant="bodyMd">
                Find answers to common questions or contact our support team.
              </Text>
              <InlineStack gap="200">
                <Button variant="primary" onClick={() => window.open("mailto:support@sectionhub.io")}>
                  Contact Support
                </Button>
                <Button onClick={() => window.open("https://docs.sectionhub.io", "_blank")}>
                  Documentation
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Frequently Asked Questions
              </Text>
              <Text as="p" variant="bodyMd">
                • How do I install a section?
              </Text>
              <Text as="p" variant="bodyMd">
                • How do I update to the latest version?
              </Text>
              <Text as="p" variant="bodyMd">
                • Can I customize sections?
              </Text>
              <Text as="p" variant="bodyMd">
                • What happens if I uninstall the app?
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
