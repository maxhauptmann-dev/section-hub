import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles } from "../lib/sections.server";
import prisma from "../db.server";

/**
 * API Route: Try a section before purchasing
 *
 * Strategy (like competitor "Section Store"):
 * 1. Reuse or create a lightweight "Section Hub Demo" theme (unpublished).
 * 2. Upload the section + overwrite the index template so the section
 *    is the ONLY thing the merchant sees → instant preview.
 * 3. Deep-link the merchant into the Theme Editor for that theme.
 * 4. Track the preview in DB with a 7-day expiry for auto-cleanup.
 *
 * POST /app/api/try-section
 * Body: { sectionId: string }
 */

const DEMO_THEME_NAME = "Section Hub Demo";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  const sectionId = formData.get("sectionId") as string;

  if (!sectionId) {
    return Response.json(
      { success: false, error: "Section ID is missing" },
      { status: 400 },
    );
  }

  const section = getSectionWithFiles(sectionId);
  if (!section) {
    return Response.json(
      { success: false, error: "Section not found" },
      { status: 404 },
    );
  }

  const shop = session.shop;

  try {
    // ----------------------------------------------------------------
    // 1. Fetch all themes – look for an existing demo theme
    // ----------------------------------------------------------------
    const themesResponse = await admin.graphql(`
      query {
        themes(first: 50) {
          nodes {
            id
            name
            role
          }
        }
      }
    `);

    const themesData = await themesResponse.json();
    const themes: { id: string; name: string; role: string }[] =
      themesData.data?.themes?.nodes || [];

    // Reuse existing demo theme if available
    let demoTheme = themes.find(
      (t) => t.name === DEMO_THEME_NAME && t.role === "UNPUBLISHED",
    );

    // ----------------------------------------------------------------
    // 2. If no demo theme exists, create one by duplicating main theme
    // ----------------------------------------------------------------
    if (!demoTheme) {
      const mainTheme = themes.find((t) => t.role === "MAIN");
      if (!mainTheme) {
        return Response.json(
          { success: false, error: "No active theme found." },
          { status: 400 },
        );
      }

      console.log("Creating demo theme by duplicating:", mainTheme.name);

      const duplicateResponse = await admin.graphql(
        `mutation themeDuplicate($id: ID!, $name: String!) {
          themeDuplicate(id: $id, name: $name) {
            newTheme {
              id
              name
              role
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            id: mainTheme.id,
            name: DEMO_THEME_NAME,
          },
        },
      );

      const duplicateData = await duplicateResponse.json();
      const dupErrors =
        duplicateData.data?.themeDuplicate?.userErrors || [];

      if (dupErrors.length > 0) {
        const msg = dupErrors
          .map((e: { message: string }) => e.message)
          .join(", ");
        return Response.json(
          { success: false, error: `Could not create demo theme: ${msg}` },
          { status: 500 },
        );
      }

      demoTheme = duplicateData.data?.themeDuplicate?.newTheme;
      if (!demoTheme) {
        return Response.json(
          { success: false, error: "Could not create demo theme." },
          { status: 500 },
        );
      }

      console.log("Demo theme created:", demoTheme.id);
      // Wait for Shopify to finish duplicating
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    // ----------------------------------------------------------------
    // 3. Build section file with embedded CSS
    // ----------------------------------------------------------------
    const sectionFileName = `section-${sectionId}.liquid`;

    const liquidWithStyles = `{% comment %}
  Section Hub – ${section.name}
  Version: ${section.version}
  ⚠️ PREVIEW MODE – This is a temporary trial.
  Purchase the section to install it permanently on your live theme.
{% endcomment %}

<style>
${section.cssContent || ""}
</style>

${section.liquidContent || ""}`;

    // ----------------------------------------------------------------
    // 4. Override index.json so the section is IMMEDIATELY visible
    //    when the merchant opens the Theme Editor
    // ----------------------------------------------------------------
    const demoIndexTemplate = JSON.stringify(
      {
        sections: {
          [`sh-${sectionId}`]: {
            type: `section-${sectionId}`,
            settings: {},
          },
        },
        order: [`sh-${sectionId}`],
      },
      null,
      2,
    );

    // Upload section file + overwrite index template in two separate calls
    // (Section must exist before index.json can reference it)

    // Step 1: Upload the section file first
    const sectionUpsertResponse = await admin.graphql(
      `mutation ThemeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          files: [
            {
              filename: `sections/${sectionFileName}`,
              body: { type: "TEXT" as const, value: liquidWithStyles },
            },
          ],
          themeId: demoTheme.id,
        },
      },
    );

    interface UpsertResponse {
      data?: {
        themeFilesUpsert?: {
          upsertedThemeFiles?: { filename: string }[];
          userErrors?: { field?: string[] | null; message: string }[];
        };
      };
      errors?: { message: string }[];
    }

    const sectionUpsertData = (await sectionUpsertResponse.json()) as UpsertResponse;

    if (sectionUpsertData.errors) {
      const msg =
        sectionUpsertData.errors[0]?.message || JSON.stringify(sectionUpsertData.errors);
      return Response.json(
        { success: false, error: `GraphQL Error: ${msg}` },
        { status: 500 },
      );
    }

    const sectionUserErrors =
      sectionUpsertData.data?.themeFilesUpsert?.userErrors || [];
    if (sectionUserErrors.length > 0) {
      const msg = sectionUserErrors
        .map((e) => `${(e.field || []).join(".")}: ${e.message}`)
        .join(", ");
      return Response.json(
        { success: false, error: `Error creating section: ${msg}` },
        { status: 500 },
      );
    }

    // Wait for Shopify to process the section file
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Now upload the index template that references the section
    const templateUpsertResponse = await admin.graphql(
      `mutation ThemeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          files: [
            {
              filename: "templates/index.json",
              body: { type: "TEXT" as const, value: demoIndexTemplate },
            },
          ],
          themeId: demoTheme.id,
        },
      },
    );

    const upsertData = (await templateUpsertResponse.json()) as UpsertResponse;

    if (upsertData.errors) {
      const msg =
        upsertData.errors[0]?.message || JSON.stringify(upsertData.errors);
      return Response.json(
        { success: false, error: `GraphQL Error: ${msg}` },
        { status: 500 },
      );
    }

    const userErrors =
      upsertData.data?.themeFilesUpsert?.userErrors || [];
    if (userErrors.length > 0) {
      const msg = userErrors
        .map((e) => `${(e.field || []).join(".")}: ${e.message}`)
        .join(", ");
      return Response.json(
        { success: false, error: `Error installing section: ${msg}` },
        { status: 500 },
      );
    }

    // ----------------------------------------------------------------
    // 5. Build Theme Editor deep-link
    // ----------------------------------------------------------------
    const numericThemeId = demoTheme.id.split("/").pop();
    const editorUrl = `https://${shop}/admin/themes/${numericThemeId}/editor`;

    // ----------------------------------------------------------------
    // 6. Save preview in DB (1-day demo)
    // ----------------------------------------------------------------
    const TRIAL_DAYS = 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS);

    await prisma.sectionPreview.upsert({
      where: {
        shop_sectionId: { shop, sectionId },
      },
      update: {
        themeId: demoTheme.id,
        themeName: demoTheme.name,
        sectionFileName,
        expiresAt,
        removed: false,
        removedAt: null,
      },
      create: {
        shop,
        sectionId,
        themeId: demoTheme.id,
        themeName: demoTheme.name,
        sectionFileName,
        expiresAt,
      },
    });

    console.log("Try-section success:", {
      section: section.name,
      theme: demoTheme.name,
      shop,
      expiresAt,
      editorUrl,
    });

    return Response.json({
      success: true,
      message: `"${section.name}" is ready to preview! The Theme Editor will open with your section.`,
      editorUrl,
      themeName: demoTheme.name,
      sectionFileName,
      trialDays: TRIAL_DAYS,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Try-section error:", error);
    return Response.json(
      {
        success: false,
        error: `An error occurred: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500 },
    );
  }
};
