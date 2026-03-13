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
      <style>{`
        @keyframes sh-gradient-move{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes sh-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes sh-fade-up{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes sh-pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
        @keyframes sh-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes sh-check-pop{0%{transform:scale(0) rotate(-45deg)}50%{transform:scale(1.2) rotate(0)}100%{transform:scale(1) rotate(0)}}
        @keyframes sh-ring-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}

        .sh-upd-hero{
          position:relative;overflow:hidden;border-radius:16px;padding:28px 24px;
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite;
        }
        .sh-upd-hero.has-updates{background:linear-gradient(-45deg,#fef3c7,#fde68a,#fcd34d,#fef9c3)}
        .sh-upd-hero.all-good{background:linear-gradient(-45deg,#ecfdf5,#d1fae5,#a7f3d0,#bbf7d0)}
        .sh-upd-hero::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.5) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 4s ease-in-out infinite;pointer-events:none;
        }

        .sh-upd-glass{
          background:rgba(255,255,255,0.65);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:14px;padding:18px 20px;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
        }

        .sh-upd-section{
          border-radius:14px;border:1px solid #e5e7eb;background:#fff;
          padding:0;overflow:hidden;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          animation:sh-fade-up .5s ease both;
        }
        .sh-upd-section:hover{box-shadow:0 8px 28px rgba(0,0,0,0.08);border-color:#c7d2fe;transform:translateY(-2px)}

        .sh-upd-row{
          display:flex;align-items:center;gap:12px;padding:14px 20px;
          transition:all .2s ease;border-radius:8px;margin:0;
        }
        .sh-upd-row:hover{background:#f8fafc}

        .sh-upd-ok-item{
          display:flex;align-items:center;gap:12px;padding:12px 16px;
          transition:all .2s ease;border-radius:10px;
        }
        .sh-upd-ok-item:hover{background:rgba(255,255,255,0.7);transform:translateX(4px)}

        .sh-upd-changelog{
          background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 20px;
          animation:sh-fade-up .3s ease both;
        }

        .sh-upd-change-dot{width:6px;height:6px;border-radius:50%;background:#6366f1;flex-shrink:0;margin-top:6px}

        .sh-upd-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
        .sh-upd-badge-warn{background:rgba(245,158,11,0.12);color:#92400e;border:1px solid rgba(245,158,11,0.25)}
        .sh-upd-badge-new{background:rgba(22,163,74,0.12);color:#15803d;border:1px solid rgba(22,163,74,0.25)}
        .sh-upd-badge-info{background:rgba(99,102,241,0.1);color:#4338ca;border:1px solid rgba(99,102,241,0.2)}

        .sh-upd-icon-wrap{
          width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;
          font-size:24px;flex-shrink:0;animation:sh-float 3s ease-in-out infinite;
        }

        .sh-upd-arrow{
          display:inline-flex;align-items:center;justify-content:center;
          width:20px;height:20px;border-radius:50%;background:rgba(99,102,241,0.1);
          color:#6366f1;font-size:10px;font-weight:700;
        }

        .sh-upd-section-icon{
          width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;
          transition:all .2s ease;
        }
        .sh-upd-section:hover .sh-upd-section-icon{transform:scale(1.05)}

        .sh-upd-empty{text-align:center;padding:40px 20px}
        .sh-upd-empty-icon{font-size:56px;margin-bottom:16px;animation:sh-float 3s ease-in-out infinite}

        .sh-upd-ok-card{
          position:relative;overflow:hidden;border-radius:16px;
          background:linear-gradient(-45deg,#f8fafc,#f1f5f9,#e2e8f0,#f1f5f9);
          background-size:300% 300%;
          animation:sh-gradient-move 12s ease infinite;
          padding:4px;
        }
        .sh-upd-ok-inner{background:rgba(255,255,255,0.75);border-radius:12px;padding:16px 20px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      `}</style>

      <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <BlockStack gap="500">

        {/* Result Banner */}
        {result && (
          <Banner
            title={result.success ? "Success!" : "Error"}
            tone={result.success ? "success" : "critical"}
            onDismiss={() => setResult(null)}
          >
            <p>{result.success ? result.message : result.error}</p>
          </Banner>
        )}

        {/* ═══ HERO CARD ═══ */}
        <div className={`sh-upd-hero ${updatesCount > 0 ? 'has-updates' : 'all-good'}`}>
          <div className="sh-upd-glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="sh-upd-icon-wrap" style={{ background: updatesCount > 0 ? "rgba(245,158,11,0.15)" : "rgba(22,163,74,0.12)" }}>
                {updatesCount > 0 ? "🔄" : "✅"}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                  {updatesCount > 0
                    ? `${updatesCount} update${updatesCount > 1 ? "s" : ""} available`
                    : "All sections up to date!"}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                  {totalInstalled} section{totalInstalled !== 1 ? "s" : ""}{" "}
                  installed{themeName ? ` on ${themeName}` : ""}
                </div>
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
        </div>

        {/* ═══ AVAILABLE UPDATES ═══ */}
        {updatesCount > 0 && (
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <span style={{ fontSize: 18 }}>🔄</span>
              <Text as="h2" variant="headingMd">Available Updates</Text>
            </InlineStack>

            {updates.map((update, idx) => (
              <div key={update.section.id} className="sh-upd-section" style={{ animationDelay: `${idx * 0.08}s` }}>
                {/* Section Header */}
                <div className="sh-upd-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      className="sh-upd-section-icon"
                      style={{ background: `linear-gradient(135deg, ${update.section.previewColor}, ${update.section.previewColor}cc)` }}
                    >
                      <span style={{ color: "white", fontSize: 18, fontWeight: 700 }}>
                        {update.section.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                        {update.section.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span className="sh-upd-badge sh-upd-badge-warn">{`v${update.installedVersion}`}</span>
                        <span className="sh-upd-arrow">→</span>
                        <span className="sh-upd-badge sh-upd-badge-new">{`v${update.latestVersion}`}</span>
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>
                          · {update.changesCount} change{update.changesCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <InlineStack gap="200">
                    <Button
                      variant="plain"
                      onClick={() =>
                        setExpandedSection(
                          expandedSection === update.section.id ? null : update.section.id
                        )
                      }
                    >
                      {expandedSection === update.section.id ? "Hide changes" : "View changes"}
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
                  <div className="sh-upd-changelog">
                    <BlockStack gap="300">
                      {update.changelog.map((entry) => (
                        <div key={entry.version}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span className="sh-upd-badge sh-upd-badge-info">{`v${entry.version}`}</span>
                            <span style={{ color: "#94a3b8", fontSize: 12 }}>
                              {new Date(entry.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <BlockStack gap="100">
                            {entry.changes.map((change, i) => (
                              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <div className="sh-upd-change-dot" />
                                <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{change}</span>
                              </div>
                            ))}
                          </BlockStack>
                        </div>
                      ))}
                    </BlockStack>
                  </div>
                )}
              </div>
            ))}
          </BlockStack>
        )}

        {/* ═══ UP TO DATE ═══ */}
        {upToDate.length > 0 && (
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <span style={{ fontSize: 18 }}>✅</span>
              <Text as="h2" variant="headingMd">Up to Date ({upToDate.length})</Text>
            </InlineStack>

            <div className="sh-upd-ok-card">
              <div className="sh-upd-ok-inner">
                <BlockStack gap="0">
                  {upToDate.map((item, i) => (
                    <div key={item.section.id}>
                      {i > 0 && <Divider />}
                      <div className="sh-upd-ok-item">
                        <div
                          style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: `linear-gradient(135deg, ${item.section.previewColor}, ${item.section.previewColor}cc)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>
                            {item.section.name.charAt(0)}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{item.section.name}</span>
                        </div>
                        <span className="sh-upd-badge sh-upd-badge-new">{`v${item.version}`}</span>
                      </div>
                    </div>
                  ))}
                </BlockStack>
              </div>
            </div>
          </BlockStack>
        )}

        {/* ═══ EMPTY STATE ═══ */}
        {totalInstalled === 0 && (
          <div className="sh-upd-hero all-good">
            <div className="sh-upd-glass sh-upd-empty">
              <div className="sh-upd-empty-icon">📦</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                No sections installed yet
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
                Install sections from the Explore page to see updates here.
              </div>
              <Button variant="primary" url="/app/explore">Explore Sections</Button>
            </div>
          </div>
        )}

      </BlockStack>
      </div>
    </Page>
  );
}
