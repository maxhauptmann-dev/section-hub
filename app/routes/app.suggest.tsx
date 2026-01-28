import { useState } from "react";
import { Page, Layout, Card, Text, BlockStack, TextField, Button, Banner } from "@shopify/polaris";

export default function SuggestIdeaPage() {
  const [idea, setIdea] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (idea.trim()) {
      // TODO: Hier später API-Call zum Speichern der Idee
      setSubmitted(true);
      setIdea("");
    }
  };

  return (
    <Page title="Suggest Idea 💡">
      <Layout>
        {submitted && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSubmitted(false)}>
              <Text as="p" variant="bodyMd">
                Danke für deine Idee! Wir prüfen jeden Vorschlag.
              </Text>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Hast du eine Idee für eine neue Section?
              </Text>
              <Text as="p" variant="bodyMd">
                Wir entwickeln regelmäßig neue Sections basierend auf Community-Feedback. 
                Teile deine Idee mit uns!
              </Text>
              <TextField
                label="Deine Idee"
                value={idea}
                onChange={setIdea}
                multiline={4}
                autoComplete="off"
                placeholder="Beschreibe deine Section-Idee..."
              />
              <Button variant="primary" onClick={handleSubmit} disabled={!idea.trim()}>
                Idee einreichen
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Beliebte Vorschläge
              </Text>
              <Text as="p" variant="bodyMd">
                🔥 Animated Product Showcase — 127 Votes
              </Text>
              <Text as="p" variant="bodyMd">
                ⭐ Instagram Feed Section — 98 Votes
              </Text>
              <Text as="p" variant="bodyMd">
                🎯 Quiz Section für Produktempfehlungen — 76 Votes
              </Text>
              <Text as="p" variant="bodyMd">
                📊 Live Sales Notification — 64 Votes
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
