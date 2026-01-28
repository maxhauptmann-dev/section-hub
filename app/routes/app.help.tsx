import { Page, Layout, Card, Text, BlockStack, Button, InlineStack } from "@shopify/polaris";

export default function HelpcenterPage() {
  return (
    <Page title="Helpcenter">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Wie können wir dir helfen?
              </Text>
              <Text as="p" variant="bodyMd">
                Finde Antworten auf häufige Fragen oder kontaktiere unser Support-Team.
              </Text>
              <InlineStack gap="200">
                <Button variant="primary" onClick={() => window.open("mailto:support@sectionhub.io")}>
                  Support kontaktieren
                </Button>
                <Button onClick={() => window.open("https://docs.sectionhub.io", "_blank")}>
                  Dokumentation
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Häufige Fragen
              </Text>
              <Text as="p" variant="bodyMd">
                • Wie installiere ich eine Section?
              </Text>
              <Text as="p" variant="bodyMd">
                • Wie aktualisiere ich auf die neueste Version?
              </Text>
              <Text as="p" variant="bodyMd">
                • Kann ich Sections anpassen?
              </Text>
              <Text as="p" variant="bodyMd">
                • Was passiert wenn ich die App deinstalliere?
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
