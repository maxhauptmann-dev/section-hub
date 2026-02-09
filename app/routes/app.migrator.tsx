import { Page, Layout, Card, Text, BlockStack, Button, Banner } from "@shopify/polaris";

export default function ThemeMigratorPage() {
  return (
    <Page title="Theme Migrator">
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            <Text as="p" variant="bodyMd">
              The Theme Migrator helps you transfer your sections when switching themes.
            </Text>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Migrate Sections
              </Text>
              <Text as="p" variant="bodyMd">
                Select your source theme and target theme to automatically transfer all installed sections.
              </Text>
              <Button variant="primary" onClick={() => alert("Migration feature coming soon!")}>
                Start Migration
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                How it works
              </Text>
              <Text as="p" variant="bodyMd">
                1. Select the theme you want to migrate from
              </Text>
              <Text as="p" variant="bodyMd">
                2. Select the target theme
              </Text>
              <Text as="p" variant="bodyMd">
                3. Click &quot;Start Migration&quot;
              </Text>
              <Text as="p" variant="bodyMd">
                4. All compatible sections will be transferred automatically
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
