import { chromium } from "@playwright/test";
import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const outputDir = path.join(rootDir, "test-artifacts", "mobile");

const viewports = [
  { width: 320, height: 900 },
  { width: 390, height: 900 },
  { width: 430, height: 900 },
];

const themes = ["og", "ac-t"];

const contentTypes = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".txt", "text/plain"],
]);

function getContentType(filePath) {
  return contentTypes.get(path.extname(filePath)) || "application/octet-stream";
}

function resolvePublicPath(urlPath) {
  const parsedPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalizedPath = path.normalize(parsedPath === "/" ? "/index.html" : parsedPath);
  const filePath = path.join(publicDir, normalizedPath);

  if (!filePath.startsWith(publicDir)) return null;
  return filePath;
}

async function startServer() {
  const server = http.createServer(async (request, response) => {
    const filePath = resolvePublicPath(request.url || "/");

    if (filePath === null) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "Content-Type": getContentType(filePath) });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    port: server.address().port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function captureScreenshot(browser, serverUrl, theme, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((selectedTheme) => {
    window.localStorage.setItem("hof-theme", selectedTheme);
    window.localStorage.setItem("hof-warp", "off");
  }, theme);

  const page = await context.newPage();
  await page.goto(serverUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".member-card", { state: "visible" });

  const fileName = `hof-${theme}-${viewport.width}.png`;
  const outputPath = path.join(outputDir, fileName);
  await page.screenshot({ path: outputPath });
  await context.close();

  return outputPath;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const server = await startServer();
  const browser = await chromium.launch();
  const serverUrl = `http://127.0.0.1:${server.port}/`;
  const outputs = [];

  try {
    for (const theme of themes) {
      for (const viewport of viewports) {
        outputs.push(await captureScreenshot(browser, serverUrl, theme, viewport));
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  for (const outputPath of outputs) {
    console.log(path.relative(rootDir, outputPath));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
