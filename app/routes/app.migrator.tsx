import { Page, Layout, Card, Text, BlockStack, Button, Banner } from "@shopify/polaris";

export default function ThemeMigratorPage() {
  return (
    <Page title="Theme Migrator">
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            <Text as="p" variant="bodyMd">
              Der Theme Migrator hilft dir, deine Sections beim Theme-Wechsel zu übertragen.
            </Text>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Sections migrieren
              </Text>
              <Text as="p" variant="bodyMd">
                Wähle dein Quell-Theme und Ziel-Theme aus, um alle installierten Sections automatisch zu übertragen.
              </Text>
              <Button variant="primary" onClick={() => alert("Migration Feature kommt bald!")}>
                Migration starten
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                So funktioniert&apos;s
              </Text>
              <Text as="p" variant="bodyMd">
                1. Wähle das Theme aus, von dem du migrieren möchtest
              </Text>
              <Text as="p" variant="bodyMd">
                2. Wähle das Ziel-Theme aus
              </Text>
              <Text as="p" variant="bodyMd">
                3. Klicke auf &quot;Migration starten&quot;
              </Text>
              <Text as="p" variant="bodyMd">
                4. Alle kompatiblen Sections werden automatisch übertragen
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
