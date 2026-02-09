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
                Thanks for your idea! We review every suggestion.
              </Text>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Have an idea for a new section?
              </Text>
              <Text as="p" variant="bodyMd">
                We regularly develop new sections based on community feedback. 
                Share your idea with us!
              </Text>
              <TextField
                label="Your Idea"
                value={idea}
                onChange={setIdea}
                multiline={4}
                autoComplete="off"
                placeholder="Describe your section idea..."
              />
              <Button variant="primary" onClick={handleSubmit} disabled={!idea.trim()}>
                Submit Idea
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Popular Suggestions
              </Text>
              <Text as="p" variant="bodyMd">
                🔥 Animated Product Showcase — 127 Votes
              </Text>
              <Text as="p" variant="bodyMd">
                ⭐ Instagram Feed Section — 98 Votes
              </Text>
              <Text as="p" variant="bodyMd">
                🎯 Quiz Section for Product Recommendations — 76 Votes
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
