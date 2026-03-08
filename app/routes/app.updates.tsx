import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation, useActionData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllSections, getSectionWithFiles } from "../lib/sections.server";
import type { SectionMeta, ChangelogEntry } from "../lib/sections.server";
import { sanitizeShopifySchema } from "../lib/sanitize-schema";
import prisma from "../db.server";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Banner,
  Divider,
  Box,
} from "@shopify/polaris";

/* ── semver compare: returns true if a > b ── */
function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

/* ── Loader ── */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const allSections = getAllSections();

  // Get all installation records for this shop
  const installations = await (prisma as any).sectionInstallation.findMany({
    where: { shop },
  });
  const installMap = new Map<string, any>(installations.map((i: any) => [i.sectionHandle, i]));

  // Find which sections are actually installed on the theme
  let themeSectionIds: string[] = [];
  let mainThemeId: string | null = null;
  let mainThemeName: string | null = null;

  try {
    const themesResponse = await admin.graphql(`
      query { themes(first: 10) { nodes { id name role } } }
    `);
    const themesData = (await themesResponse.json()) as any;
    const themes = themesData.data?.themes?.nodes || [];
    const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

    if (mainTheme) {
      mainThemeId = mainTheme.id;
      mainThemeName = mainTheme.name;

      const expectedFilenames = allSections.map(
        (s) => `sections/section-${s.id}.liquid`
      );

      const filesResponse = await admin.graphql(
        `query ThemeFiles($themeId: ID!, $filenames: [String!]!) {
          theme(id: $themeId) {
            files(first: 250, filenames: $filenames) {
              nodes { filename }
            }
          }
        }`,
        { variables: { themeId: mainTheme.id, filenames: expectedFilenames } }
      );
      const filesData = (await filesResponse.json()) as any;
      const themeFiles = filesData.data?.theme?.files?.nodes || [];
      themeSectionIds = themeFiles
        .map((f: { filename: string }) => {
          const m = f.filename.match(/^sections\/section-(.+)\.liquid$/);
          return m ? m[1] : null;
        })
        .filter(Boolean) as string[];
    }
  } catch (err) {
    console.error("Error fetching theme sections:", err);
  }

  // Build the updates list
  type UpdateInfo = {
    section: SectionMeta;
    installedVersion: string;
    latestVersion: string;
    changesCount: number;
    changelog: ChangelogEntry[];
  };

  const updates: UpdateInfo[] = [];
  const upToDate: { section: SectionMeta; version: string }[] = [];

  for (const sectionId of themeSectionIds) {
    const section = allSections.find((s) => s.id === sectionId);
    if (!section) continue;

    const install = installMap.get(sectionId);
    const installedVersion = install?.installedVersion || "1.0.0"; // assume 1.0.0 for sections installed before tracking

    if (isNewerVersion(section.version, installedVersion)) {
      // Collect only the changelog entries newer than installed version
      const newChanges = (section.changelog || []).filter((entry) =>
        isNewerVersion(entry.version, installedVersion)
      );
      updates.push({
        section,
        installedVersion,
        latestVersion: section.version,
        changesCount: newChanges.reduce((sum, e) => sum + e.changes.length, 0),
        changelog: newChanges,
      });
    } else {
      upToDate.push({ section, version: installedVersion });
    }
  }

  // Sort: most changes first
  updates.sort((a, b) => b.changesCount - a.changesCount);

  return {
    updates,
    upToDate,
    totalInstalled: themeSectionIds.length,
    themeName: mainThemeName,
  };
};

/* ── Action: update a section ── */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action") as string;
  const sectionId = formData.get("sectionId") as string;

  if (actionType === "update" && sectionId) {
    const section = getSectionWithFiles(sectionId);
    if (!section) {
      return { success: false, error: "Section not found" };
    }

    try {
      const themesResponse = await admin.graphql(`
        query { themes(first: 10) { nodes { id name role } } }
      `);
      const themesData = (await themesResponse.json()) as any;
      const themes = themesData.data?.themes?.nodes || [];
      const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

      if (!mainTheme) {
        return { success: false, error: "No active theme found." };
      }

      const sectionFileName = `section-${sectionId}.liquid`;
      const liquidWithStyles = `{% comment %}
  Section Hub - ${section.name}
  Version: ${section.version}
  Updated via Section Hub App
{% endcomment %}

<style>
${section.cssContent || ""}
</style>

${section.liquidContent || ""}`;

      const fileInput = {
        filename: `sections/${sectionFileName}`,
        body: { type: "TEXT", value: liquidWithStyles },
      };

      const themeFilesResponse = await admin.graphql(
        `mutation ThemeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
          themeFilesUpsert(files: $files, themeId: $themeId) {
            upsertedThemeFiles { filename }
            userErrors { field message }
            job { id }
          }
        }`,
        { variables: { files: [fileInput], themeId: mainTheme.id } }
      );

      const themeFilesData = (await themeFilesResponse.json()) as any;

      if (themeFilesData.errors) {
        const errorMsg =
          themeFilesData.errors[0]?.message ||
          JSON.stringify(themeFilesData.errors);
        return { success: false, error: `GraphQL Error: ${errorMsg}` };
      }

      const userErrors =
        themeFilesData.data?.themeFilesUpsert?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors
          .map(
            (e: { field?: string[]; message: string }) =>
              `${(e.field || []).join(".")}: ${e.message}`
          )
          .join(", ");
        return { success: false, error: `Error: ${errorMsg}` };
      }

      // Update installation record
      await (prisma as any).sectionInstallation.upsert({
        where: {
          shop_sectionHandle: {
            shop: session.shop,
            sectionHandle: sectionId,
          },
        },
        update: {
          installedVersion: section.version,
          themeId: mainTheme.id,
        },
        create: {
          shop: session.shop,
          sectionHandle: sectionId,
          installedVersion: section.version,
          themeId: mainTheme.id,
        },
      });

      return {
        success: true,
        sectionId,
        message: `${section.name} updated to v${section.version}!`,
      };
    } catch (error) {
      console.error("Update error:", error);
      return {
        success: false,
        error: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  if (actionType === "updateAll") {
    // Batch update all sections with available updates
    const allSections = getAllSections();
    const installations = await (prisma as any).sectionInstallation.findMany({
      where: { shop: session.shop },
    });
    const installMap = new Map<string, any>(installations.map((i: any) => [i.sectionHandle, i]));

    // Get theme
    const themesResponse = await admin.graphql(`
      query { themes(first: 10) { nodes { id name role } } }
    `);
    const themesData = (await themesResponse.json()) as any;
    const themes = themesData.data?.themes?.nodes || [];
    const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

    if (!mainTheme) {
      return { success: false, error: "No active theme found." };
    }

    // Find installed sections
    const expectedFilenames = allSections.map(
      (s) => `sections/section-${s.id}.liquid`
    );
    const filesResponse = await admin.graphql(
      `query ThemeFiles($themeId: ID!, $filenames: [String!]!) {
        theme(id: $themeId) {
          files(first: 250, filenames: $filenames) {
            nodes { filename }
          }
        }
      }`,
      { variables: { themeId: mainTheme.id, filenames: expectedFilenames } }
    );
    const filesData = (await filesResponse.json()) as any;
    const themeFiles = filesData.data?.theme?.files?.nodes || [];
    const themeSectionIds = themeFiles
      .map((f: { filename: string }) => {
        const m = f.filename.match(/^sections\/section-(.+)\.liquid$/);
        return m ? m[1] : null;
      })
      .filter(Boolean) as string[];

    // Build file inputs for all updatable sections
    const fileInputs: Array<{ filename: string; body: { type: string; value: string } }> = [];
    const updatedIds: string[] = [];

    for (const sid of themeSectionIds) {
      const section = getSectionWithFiles(sid);
      if (!section) continue;

      const install = installMap.get(sid);
      const installedVersion = install?.installedVersion || "1.0.0";

      if (isNewerVersion(section.version, installedVersion)) {
        const liquidWithStyles = `{% comment %}
  Section Hub - ${section.name}
  Version: ${section.version}
  Updated via Section Hub App
{% endcomment %}

<style>
${section.cssContent || ""}
</style>

${section.liquidContent || ""}`;

        fileInputs.push({
          filename: `sections/section-${sid}.liquid`,
          body: { type: "TEXT", value: liquidWithStyles },
        });
        updatedIds.push(sid);
      }
    }

    if (fileInputs.length === 0) {
      return { success: true, message: "All sections are already up to date!" };
    }

    try {
      // Shopify allows up to 20 files per upsert call, batch if needed
      for (let i = 0; i < fileInputs.length; i += 20) {
        const batch = fileInputs.slice(i, i + 20);
        const response = await admin.graphql(
          `mutation ThemeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
            themeFilesUpsert(files: $files, themeId: $themeId) {
              upsertedThemeFiles { filename }
              userErrors { field message }
              job { id }
            }
          }`,
          { variables: { files: batch, themeId: mainTheme.id } }
        );

        const data = (await response.json()) as any;
        const userErrors = data.data?.themeFilesUpsert?.userErrors || [];
        if (userErrors.length > 0) {
          console.error("Batch update errors:", userErrors);
        }
      }

      // Update all installation records
      for (const sid of updatedIds) {
        const section = allSections.find((s) => s.id === sid);
        if (!section) continue;

        await (prisma as any).sectionInstallation.upsert({
          where: {
            shop_sectionHandle: {
              shop: session.shop,
              sectionHandle: sid,
            },
          },
          update: {
            installedVersion: section.version,
            themeId: mainTheme.id,
          },
          create: {
            shop: session.shop,
            sectionHandle: sid,
            installedVersion: section.version,
            themeId: mainTheme.id,
          },
        });
      }

      return {
        success: true,
        message: `${updatedIds.length} section${updatedIds.length > 1 ? "s" : ""} updated successfully!`,
      };
    } catch (error) {
      console.error("Batch update error:", error);
      return {
        success: false,
        error: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  return { success: false, error: "Unknown action" };
};

/* ── Page Component ── */
export default function UpdatesPage() {
  const { updates, upToDate, totalInstalled, themeName } =
    useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData) {
      setResult(
        actionData as { success?: boolean; message?: string; error?: string }
      );
    }
  }, [actionData]);

  const handleUpdate = (sectionId: string) => {
    submit({ action: "update", sectionId }, { method: "post" });
  };

  const handleUpdateAll = () => {
    submit({ action: "updateAll" }, { method: "post" });
  };

  const updatesCount = updates.length;

  return (
    <Page
      title="Section Updates"
      subtitle={themeName ? `Theme: ${themeName}` : undefined}
      backAction={{ onAction: () => navigate("/app") }}
    >
      <Layout>
        {/* Result Banner */}
        {result && (
          <Layout.Section>
            <Banner
              title={result.success ? "Success!" : "Error"}
              tone={result.success ? "success" : "critical"}
              onDismiss={() => setResult(null)}
            >
              <p>{result.success ? result.message : result.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Summary Card */}
        <Layout.Section>
          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background:
                      updatesCount > 0
                        ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                        : "linear-gradient(135deg, #22c55e, #10b981)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                  }}
                >
                  {updatesCount > 0 ? "🔄" : "✅"}
                </div>
                <div>
                  <Text as="h2" variant="headingMd">
                    {updatesCount > 0
                      ? `${updatesCount} update${updatesCount > 1 ? "s" : ""} available`
                      : "All sections up to date!"}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {totalInstalled} section{totalInstalled !== 1 ? "s" : ""}{" "}
                    installed
                    {themeName ? ` on ${themeName}` : ""}
                  </Text>
                </div>
              </div>

              {updatesCount > 0 && (
                <Button
                  variant="primary"
                  onClick={handleUpdateAll}
                  loading={isSubmitting}
                >
                  Update All ({String(updatesCount)})
                </Button>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Available Updates */}
        {updatesCount > 0 && (
          <Layout.Section>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                🔄 Available Updates
              </Text>

              {updates.map((update) => (
                <Card key={update.section.id}>
                  <BlockStack gap="400">
                    {/* Section Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: `linear-gradient(135deg, ${update.section.previewColor} 0%, ${update.section.previewColor}99 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              color: "white",
                              fontSize: 16,
                              fontWeight: 700,
                            }}
                          >
                            {update.section.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <Text as="h3" variant="headingSm">
                            {update.section.name}
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <Badge tone="warning">
                              {`v${update.installedVersion}`}
                            </Badge>
                            <span style={{ color: "#9ca3af", fontSize: 14 }}>
                              →
                            </span>
                            <Badge tone="success">
                              {`v${update.latestVersion}`}
                            </Badge>
                            <Text as="span" variant="bodySm" tone="subdued">
                              · {update.changesCount} change
                              {update.changesCount > 1 ? "s" : ""}
                            </Text>
                          </InlineStack>
                        </div>
                      </div>

                      <InlineStack gap="200">
                        <Button
                          variant="plain"
                          onClick={() =>
                            setExpandedSection(
                              expandedSection === update.section.id
                                ? null
                                : update.section.id
                            )
                          }
                        >
                          {expandedSection === update.section.id
                            ? "Hide changes"
                            : "View changes"}
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => handleUpdate(update.section.id)}
                          loading={isSubmitting}
                        >
                          Update
                        </Button>
                      </InlineStack>
                    </div>

                    {/* Changelog (expandable) */}
                    {expandedSection === update.section.id && (
                      <>
                        <Divider />
                        <BlockStack gap="300">
                          {update.changelog.map((entry) => (
                            <div key={entry.version}>
                              <InlineStack gap="200" blockAlign="center">
                                <Badge tone="info">{`v${entry.version}`}</Badge>
                                <Text
                                  as="span"
                                  variant="bodySm"
                                  tone="subdued"
                                >
                                  {new Date(entry.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </Text>
                              </InlineStack>
                              <ul
                                style={{
                                  margin: "8px 0 0 0",
                                  paddingLeft: 20,
                                  listStyleType: "disc",
                                }}
                              >
                                {entry.changes.map((change, i) => (
                                  <li
                                    key={i}
                                    style={{
                                      fontSize: 13,
                                      color: "#374151",
                                      lineHeight: 1.6,
                                    }}
                                  >
                                    {change}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </BlockStack>
                      </>
                    )}
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          </Layout.Section>
        )}

        {/* Up-to-date Sections */}
        {upToDate.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  ✅ Up to Date ({upToDate.length})
                </Text>
                <BlockStack gap="0">
                  {upToDate.map((item, i) => (
                    <div key={item.section.id}>
                      {i > 0 && <Divider />}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            flexShrink: 0,
                            background: `linear-gradient(135deg, ${item.section.previewColor} 0%, ${item.section.previewColor}99 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              color: "white",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {item.section.name.charAt(0)}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {item.section.name}
                          </Text>
                        </div>
                        <Badge tone="success">{`v${item.version}`}</Badge>
                      </div>
                    </div>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Empty State */}
        {totalInstalled === 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                  <Text as="h2" variant="headingMd">
                    No sections installed yet
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Install sections from the Explore page to see updates here.
                  </Text>
                  <div style={{ marginTop: 16 }}>
                    <Button
                      variant="primary"
                      url="/app/explore"
                    >
                      Explore Sections
                    </Button>
                  </div>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
