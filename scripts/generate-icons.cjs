/**
 * Generates every icon file in public/ from the app's launcher icon.
 *
 * Run by hand, not in the build: the source artwork changes about once a year
 * and the outputs are committed, so making every `npm run build` depend on an
 * image library would be a cost with no benefit.
 *
 *   node scripts/generate-icons.cjs
 *
 * Why these files exist at all. The site used to declare its favicon as an
 * inline `data:` URI in index.html. That renders perfectly in a browser tab,
 * which is why nobody noticed - but Google's crawler fetches `/favicon.ico` as
 * a real URL, and this is a single-page app whose rewrite serves index.html for
 * anything unmatched. So the crawler asked for an icon, got a page of HTML back,
 * and put its own generic mark next to wattwise.site in the results.
 *
 * The fix is real files at real URLs. `data:` URIs cannot be crawled, and no
 * amount of markup changes that.
 *
 * Sizes are not arbitrary:
 *   - favicon.ico carries 16/32/48 so a browser picks its own.
 *   - 96 is Google's stated preference: at least 48px and a multiple of 48.
 *   - 180 is what iOS uses for a home-screen bookmark.
 *   - 192/512 are the PWA manifest sizes Android reads.
 *   - The maskable variant is padded, because Android crops a maskable icon to
 *     whatever shape the launcher wants and an unpadded bolt loses its tips.
 */

const fs = require('node:fs');
const path = require('node:path');

// sharp is not a dependency of this repo - the site does not process images at
// runtime or at build time. It is borrowed from the app checkout beside this
// one, which does have it.
const loadSharp = () => {
  const candidates = [
    'sharp',
    path.resolve(__dirname, '../../WattWise/node_modules/sharp'),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next one.
    }
  }

  throw new Error(
    'sharp not found. Install it here, or check out the WattWise app repo '
    + 'beside this one so ../WattWise/node_modules/sharp resolves.'
  );
};

const sharp = loadSharp();

const SOURCE = path.resolve(__dirname, '../../WattWise/assets/icon.png');
const OUT = path.resolve(__dirname, '../public');

// Matches the icon's own background, so the padded maskable variant does not
// show a seam where the artwork ends.
const BRAND_GREEN = { r: 0x10, g: 0xb9, b: 0x81, alpha: 1 };

const square = (size) => sharp(SOURCE)
  .resize(size, size, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toBuffer();

/**
 * Builds a .ico containing PNG-encoded images.
 *
 * The format is small enough to write directly and this avoids a dependency for
 * one file: a 6-byte header, then a 16-byte directory entry per image, then the
 * image data. PNG inside ICO is understood by every browser from IE11 on and by
 * Google's crawler; the older BMP-in-ICO encoding buys nothing here.
 */
const buildIco = (images) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved.
  header.writeUInt16LE(1, 2); // 1 = icon.
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach(({ size, data }, index) => {
    const entry = index * 16;
    // 256 is stored as 0. Not reachable at these sizes, but the rule is the
    // format's, not ours.
    directory.writeUInt8(size >= 256 ? 0 : size, entry);
    directory.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    directory.writeUInt8(0, entry + 2); // Palette size; 0 for truecolour.
    directory.writeUInt8(0, entry + 3); // Reserved.
    directory.writeUInt16LE(1, entry + 4); // Colour planes.
    directory.writeUInt16LE(32, entry + 6); // Bits per pixel.
    directory.writeUInt32LE(data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
};

const run = async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const write = (name, buffer) => {
    fs.writeFileSync(path.join(OUT, name), buffer);
    console.log(`${name.padEnd(26)} ${buffer.length} bytes`);
  };

  const icoSizes = [16, 32, 48];
  const icoImages = await Promise.all(
    icoSizes.map(async (size) => ({ size, data: await square(size) }))
  );
  write('favicon.ico', buildIco(icoImages));

  write('favicon-96x96.png', await square(96));
  write('apple-touch-icon.png', await square(180));
  write('icon-192.png', await square(192));
  write('icon-512.png', await square(512));

  // Android's maskable icons are cropped to the launcher's shape - a circle on
  // most phones. The safe zone is the middle 80%, so the artwork is inset and
  // the gap filled with the same green rather than left transparent.
  const inset = Math.round(512 * 0.8);
  const padding = Math.round((512 - inset) / 2);
  write('icon-maskable-512.png', await sharp({
    create: { width: 512, height: 512, channels: 4, background: BRAND_GREEN },
  })
    .composite([{
      input: await sharp(SOURCE).resize(inset, inset, { fit: 'cover' }).png().toBuffer(),
      top: padding,
      left: padding,
    }])
    .png({ compressionLevel: 9 })
    .toBuffer());
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
