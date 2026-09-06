// 表示確認用のダミー点群（.ply, binary_little_endian）を生成するスクリプト。
// COLMAPのstereo_fusion出力（x,y,z,red,green,blue）を模したフォーマット。
// 実行: node scripts/generate-sample-scan.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'public', 'sample-scan');
const OUT_FILE = path.join(OUT_DIR, 'pointcloud.ply');
const COUNT = 6000;

function buildVertices() {
  const vertices = [];
  for (let i = 0; i < COUNT; i++) {
    // 柿の木を横から撮影したような、横長の楕円体クラスタ＋ノイズ
    const x = (Math.random() - 0.5) * 2.4;
    const y = (Math.random() - 0.5) * 0.9 + 0.5;
    const z = (Math.random() - 0.5) * 1.0;
    const falloff = Math.random() ** 0.5;

    const shade = 0.5 + Math.random() * 0.4;
    vertices.push({
      x: x * falloff,
      y,
      z: z * falloff,
      r: Math.round(shade * 0.8 * 255),
      g: Math.round(shade * 255),
      b: Math.round(shade * 0.8 * 255),
    });
  }
  return vertices;
}

function writePly(vertices) {
  const header =
    'ply\n' +
    'format binary_little_endian 1.0\n' +
    `element vertex ${vertices.length}\n` +
    'property float x\n' +
    'property float y\n' +
    'property float z\n' +
    'property uchar red\n' +
    'property uchar green\n' +
    'property uchar blue\n' +
    'end_header\n';

  const headerBuffer = Buffer.from(header, 'ascii');
  const bodyBuffer = Buffer.alloc(vertices.length * 15); // 3*float32(12) + 3*uint8(3)

  let offset = 0;
  for (const v of vertices) {
    bodyBuffer.writeFloatLE(v.x, offset);
    bodyBuffer.writeFloatLE(v.y, offset + 4);
    bodyBuffer.writeFloatLE(v.z, offset + 8);
    bodyBuffer.writeUInt8(v.r, offset + 12);
    bodyBuffer.writeUInt8(v.g, offset + 13);
    bodyBuffer.writeUInt8(v.b, offset + 14);
    offset += 15;
  }

  return Buffer.concat([headerBuffer, bodyBuffer]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const vertices = buildVertices();
  const buffer = writePly(vertices);
  await writeFile(OUT_FILE, buffer);
  console.log(`Wrote ${OUT_FILE} (${(buffer.byteLength / 1024).toFixed(1)} KB, ${vertices.length} points)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
