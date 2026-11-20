// SPDX-License-Identifier: MIT
// OpenCode plugin: gives OpenCode the scanner's MCP server, started with npx at a pinned version,
// and the QR Code & Barcode Scanner skill shipped beside this file. It holds no decoder.
//
// One default export serves both plugin lines. OpenCode 1 calls `server()` and reads the hooks it
// returns; its `config` hook edits the loaded configuration. OpenCode 2 calls `setup(ctx)`, where
// MCP servers and skills change only through their domain transforms. A server or skill the user
// already configured under the same name is kept as it is.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ID = "qrcode-barcode-scanner";
const SERVER = "qrscan";
const LAUNCH = ["npx", "--yes", "--ignore-scripts", "@qrcode-ai-com/qrcode-barcode-scanner-mcp@0.3.1"];
const SKILLS = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");
const SKILL_FILE = join(SKILLS, ID, "SKILL.md");

/** The skill's frontmatter description and its body, read from the shipped SKILL.md. */
function skill() {
  const text = readFileSync(SKILL_FILE, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error(`${SKILL_FILE} has no frontmatter`);
  const description = /^description: (.+)$/m.exec(match[1]);
  if (!description) throw new Error(`${SKILL_FILE} has no description`);
  return { description: description[1].trim(), content: text.slice(match[0].length) };
}

export default {
  id: ID,
  async setup(ctx) {
    const { description, content } = skill();
    await ctx.mcp.transform((editor) => {
      if (!editor.get(SERVER)) editor.set(SERVER, { type: "local", command: [...LAUNCH] });
    });
    await ctx.skill.transform((editor) => {
      if (!editor.get(ID)) editor.add({ id: ID, name: ID, description, path: SKILL_FILE, content });
    });
  },
  async server() {
    return {
      async config(config) {
        config.mcp ??= {};
        config.mcp[SERVER] ??= { type: "local", command: [...LAUNCH], enabled: true };
        // `skills` is a list of folders, or the older { paths } object: extend whichever is there.
        if (Array.isArray(config.skills)) {
          if (!config.skills.includes(SKILLS)) config.skills.push(SKILLS);
        } else {
          config.skills ??= {};
          config.skills.paths = [...new Set([...(config.skills.paths ?? []), SKILLS])];
        }
      },
    };
  },
};
