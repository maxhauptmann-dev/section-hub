import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * API Route: Clean up expired section previews
 *
 * For each expired preview:
 * 1. Delete the section file from the demo theme
 * 2. If no more sections left in demo theme → delete the entire theme
 * 3. Mark as removed in DB
 *
 * POST /app/api/cleanup-previews
 */

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    const now = new Date();

    // Get expired previews that haven't been removed yet
    const expiredPreviews = await prisma.sectionPreview.findMany({
      where: {
        expiresAt: { lte: now },
        removed: false,
      },
    });

    console.log(`Found ${expiredPreviews.length} expired previews to clean up`);

    if (expiredPreviews.length === 0) {
      return Response.json({
        success: true,
        message: "No expired previews to clean up",
        cleaned: 0,
      });
    }

    const results = [];

    // Group by themeId so we can batch-delete and decide whether
    // the whole demo theme should be removed
    const byTheme = new Map<string, typeof expiredPreviews>();
    for (const p of expiredPreviews) {
      const list = byTheme.get(p.themeId) || [];
      list.push(p);
      byTheme.set(p.themeId, list);
    }

    for (const [themeId, previews] of byTheme) {
      try {
        // 1. Delete the section files from the theme
        const filesToDelete = previews.map(
          (p) => `sections/${p.sectionFileName}`,
        );

        console.log(
          `Deleting ${filesToDelete.length} files from theme ${themeId}`,
        );

        const deleteResponse = await admin.graphql(
          `mutation themeFilesDelete($themeId: ID!, $files: [String!]!) {
            themeFilesDelete(themeId: $themeId, files: $files) {
              deletedThemeFiles {
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
              themeId,
              files: filesToDelete,
            },
          },
        );

        const deleteData = await deleteResponse.json();
        const deleteErrors =
          deleteData.data?.themeFilesDelete?.userErrors || [];

        if (deleteErrors.length > 0) {
          console.error("Delete errors:", deleteErrors);
        }

        // 2. Check if there are still active (non-expired) previews in this theme
        const remainingActive = await prisma.sectionPreview.count({
          where: {
            themeId,
            removed: false,
            expiresAt: { gt: now },
          },
        });

        // 3. If no more active previews → delete the entire demo theme
        if (remainingActive === 0) {
          console.log(
            `No active previews left – deleting demo theme ${themeId}`,
          );

          const themeDeleteResponse = await admin.graphql(
            `mutation themeDelete($id: ID!) {
              themeDelete(id: $id) {
                deletedThemeId
                userErrors {
                  field
                  message
                }
              }
            }`,
            {
              variables: { id: themeId },
            },
          );

          const themeDeleteData = await themeDeleteResponse.json();
          const themeDeleteErrors =
            themeDeleteData.data?.themeDelete?.userErrors || [];

          if (themeDeleteErrors.length > 0) {
            console.error("Theme delete errors:", themeDeleteErrors);
          } else {
            console.log("Demo theme deleted:", themeId);
          }
        }

        // 4. Mark all as removed in DB
        for (const p of previews) {
          await prisma.sectionPreview.update({
            where: { id: p.id },
            data: { removed: true, removedAt: now },
          });
        }

        results.push({
          themeId,
          sectionsRemoved: filesToDelete.length,
          themeDeleted: remainingActive === 0,
          status: "success",
        });
      } catch (error) {
        console.error(`Error cleaning up theme ${themeId}:`, error);
        results.push({
          themeId,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }

    return Response.json({
      success: true,
      message: `Cleaned up ${expiredPreviews.length} expired previews`,
      cleaned: expiredPreviews.length,
      results,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return Response.json(
      {
        success: false,
        error: `An error occurred: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500 },
    );
  }
};
