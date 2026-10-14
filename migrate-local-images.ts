import "dotenv/config";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { items, storedItemImages } from "@/db/schema";

function detectContentType(bytes: Buffer): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return "image/png";

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";

  return null;
}

async function main() {
  const reports = await db.select().from(items);
  const localReports = reports.filter((item) =>
    item.imageUrl?.startsWith("/uploads/items/")
  );

  if (!localReports.length) {
    console.log("No legacy local image references found.");
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const item of localReports) {
    const imageName = basename(item.imageUrl!.slice("/uploads/items/".length));
    // Reject anything other than a plain filename before constructing a path.
    if (!imageName || imageName === "." || imageName === "..") {
      console.warn(`Skipped unsafe image path on item ${item.id}`);
      skipped++;
      continue;
    }

    const localPath = join(process.cwd(), "public", "uploads", "items", imageName);
    let bytes: Buffer;
    try {
      bytes = await readFile(localPath);
    } catch {
      console.warn(`Local file missing for item ${item.id}: ${imageName}; URL left unchanged.`);
      skipped++;
      continue;
    }

    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) {
      console.warn(`Skipped empty/oversized image on item ${item.id}; URL left unchanged.`);
      skipped++;
      continue;
    }

    const contentType = detectContentType(bytes);
    if (!contentType) {
      console.warn(`Skipped unsupported/corrupt image on item ${item.id}; URL left unchanged.`);
      skipped++;
      continue;
    }

    await db.transaction(async (tx) => {
      const [stored] = await tx
        .insert(storedItemImages)
        .values({
          ownerId: item.ownerId,
          itemId: item.id,
          data: bytes,
          contentType,
          originalName: imageName.slice(0, 100),
          size: bytes.byteLength,
        })
        .returning({ id: storedItemImages.id });

      await tx
        .update(items)
        .set({ imageUrl: `/api/images/${stored.id}` })
        .where(eq(items.id, item.id));
    });

    console.log(`Migrated item ${item.id}: ${imageName} -> PostgreSQL image storage`);
    migrated++;
  }

  console.log(`Image migration complete: ${migrated} migrated, ${skipped} skipped.`);
}

main().catch((error) => {
  console.error("Image migration failed:", error);
  process.exitCode = 1;
});
