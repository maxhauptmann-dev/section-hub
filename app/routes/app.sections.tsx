import { useMemo, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Badge,
  InlineStack,
  BlockStack,
  TextField,
  Select,
  Thumbnail,
} from "@shopify/polaris";

type Price =
  | { type: "free" }
  | { type: "one_time"; amount: number; currency: "EUR" | "USD" }
  | { type: "subscription"; label: string };

type SectionItem = {
  id: string;
  name: string;
  description: string;
  category: "Hero" | "FAQ" | "Social proof" | "Conversion" | "Footer";
  price: Price;
  tags: string[];
  updatedAt: string; // ISO
  previewColor: string; // nur für Mock-Thumbnail
};

const CATALOG: SectionItem[] = [
  {
    id: "hero-001",
    name: "Hero — Simple",
    description: "Überschrift, Text, Button. Sauberer Start für Landingpages.",
    category: "Hero",
    price: { type: "free" },
    tags: ["OS2.0", "Minimal"],
    updatedAt: "2026-01-10",
    previewColor: "#dbeafe",
  },
  {
    id: "faq-001",
    name: "FAQ — Accordion",
    description: "Accordion FAQ mit Überschrift + Fragen/Antworten.",
    category: "FAQ",
    price: { type: "one_time", amount: 19, currency: "EUR" },
    tags: ["Conversion", "Support"],
    updatedAt: "2026-01-18",
    previewColor: "#dcfce7",
  },
  {
    id: "proof-001",
    name: "Social Proof — Logos",
    description: "Logo-Leiste für Vertrauen: 'As seen in …'",
    category: "Social proof",
    price: { type: "one_time", amount: 9, currency: "EUR" },
    tags: ["Trust"],
    updatedAt: "2026-01-20",
    previewColor: "#fee2e2",
  },
];

function priceLabel(p: Price) {
  if (p.type === "free") return "Free";
  if (p.type === "one_time") return `${p.amount} ${p.currency} one-time`;
  return p.label;
}

function priceTone(p: Price): "success" | "info" | "attention" {
  if (p.type === "free") return "success";
  if (p.type === "one_time") return "attention";
  return "info";
}

export default function SectionsPage() {
  // Mock: was der Shop "besitzt"
  const [ownedIds] = useState<string[]>(["hero-001"]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | SectionItem["category"]>("All");
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [sort, setSort] = useState<"updated_desc" | "name_asc">("updated_desc");

  const items = useMemo(() => {
    let list = [...CATALOG];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (category !== "All") list = list.filter((s) => s.category === category);
    if (onlyOwned) list = list.filter((s) => ownedIds.includes(s.id));

    if (sort === "updated_desc") {
      list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [query, category, onlyOwned, sort, ownedIds]);

  return (
    <Page title="Section Store">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="300" wrap>
                <div style={{ minWidth: 240, flex: 1 }}>
                  <TextField
                    label="Search"
                    labelHidden
                    value={query}
                    onChange={setQuery}
                    placeholder="Search sections, tags…"
                    autoComplete="off"
                  />
                </div>

                <Select
                  label="Category"
                  labelHidden
                  options={[
                    { label: "All categories", value: "All" },
                    { label: "Hero", value: "Hero" },
                    { label: "FAQ", value: "FAQ" },
                    { label: "Social proof", value: "Social proof" },
                    { label: "Conversion", value: "Conversion" },
                    { label: "Footer", value: "Footer" },
                  ]}
                  value={category}
                  onChange={(v) => setCategory(v as "All" | SectionItem["category"])}
                />

                <Select
                  label="Sort"
                  labelHidden
                  options={[
                    { label: "Recently updated", value: "updated_desc" },
                    { label: "Name (A–Z)", value: "name_asc" },
                  ]}
                  value={sort}
                  onChange={(v) => setSort(v as "updated_desc" | "name_asc")}
                />

                <Button
                  pressed={onlyOwned}
                  onClick={() => setOnlyOwned((x) => !x)}
                >
                  Owned
                </Button>
              </InlineStack>

              <Text as="p" variant="bodySm" tone="subdued">
                {items.length} sections
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {items.map((s) => {
              const owned = ownedIds.includes(s.id);
              const needsPurchase = !owned && s.price.type !== "free";

              return (
                <Card key={s.id} roundedAbove="sm">
                  <BlockStack gap="300">
                    <InlineStack gap="300" blockAlign="center">
                      <Thumbnail
                        source={`data:image/svg+xml;utf8,${encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
                            <rect width="80" height="80" rx="12" fill="${s.previewColor}"/>
                            <rect x="14" y="18" width="52" height="10" rx="5" fill="rgba(0,0,0,0.12)"/>
                            <rect x="14" y="36" width="40" height="8" rx="4" fill="rgba(0,0,0,0.10)"/>
                            <rect x="14" y="52" width="30" height="10" rx="5" fill="rgba(0,0,0,0.12)"/>
                          </svg>`
                        )}`}
                        alt={`${s.name} preview`}
                        size="large"
                      />
                      <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">{s.name}</Text>
                        <InlineStack gap="200">
                          <Badge tone={priceTone(s.price)}>{priceLabel(s.price)}</Badge>
                          <Badge>{s.category}</Badge>
                          {owned ? <Badge tone="success">Owned</Badge> : null}
                        </InlineStack>
                      </BlockStack>
                    </InlineStack>

                    <Text as="p" variant="bodyMd">{s.description}</Text>

                    <InlineStack gap="200" wrap>
                      {s.tags.map((t) => (
                        <Badge key={t} tone="info">{t}</Badge>
                      ))}
                    </InlineStack>

                    <InlineStack gap="200">
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (needsPurchase) {
                            // später: Shopify Billing / Stripe
                            alert(`Purchase flow (mock): ${s.name}`);
                            return;
                          }
                          alert(`Install (mock): ${s.name}`);
                        }}
                      >
                        {needsPurchase ? "Buy" : "Install"}
                      </Button>

                      <Button
                        onClick={() => alert(`Open details (mock): ${s.id}`)}
                      >
                        Details
                      </Button>
                    </InlineStack>

                    <Text as="p" variant="bodySm" tone="subdued">
                      Updated: {s.updatedAt}
                    </Text>
                  </BlockStack>
                </Card>
              );
            })}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
