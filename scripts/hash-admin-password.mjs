import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

if (process.argv.includes("--check")) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(randomBytes(24), salt, 64).toString("hex");
  process.stdout.write(JSON.stringify({ interactiveInputSupported: Boolean(process.stdin.setRawMode), hashFormatValid: /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(`scrypt$${salt}$${hash}`) }) + "\n");
  process.exit(0);
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("An interactive terminal is required.");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(prompt);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

try {
  const password = await readHidden("Admin password: ");
  const confirmation = await readHidden("Confirm password: ");
  if (password.length < 12) throw new Error("Use at least 12 characters.");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const encoded = `scrypt$${salt}$${hash}`;
  if (process.argv.includes("--save-preview-env")) {
    const target = ".local-secrets/vercel-preview.env";
    if (!existsSync(target)) throw new Error("Prepare the preview environment file first.");
    const content = readFileSync(target, "utf8");
    if (!/^ADMIN_PASSWORD_HASH=.*$/m.test(content)) throw new Error("ADMIN_PASSWORD_HASH entry is missing.");
    const updated = content.replace(/^ADMIN_PASSWORD_HASH=.*$/m, () => `ADMIN_PASSWORD_HASH="${encoded}"`);
    writeFileSync(`${target}.tmp`, updated, { encoding: "utf8", mode: 0o600 });
    renameSync(`${target}.tmp`, target);
    process.stdout.write("ADMIN_PASSWORD_HASH: SAVED\n");
  } else {
    process.stdout.write(`ADMIN_PASSWORD_HASH=${encoded}\n`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Password hashing failed."}\n`);
  process.exitCode = 1;
}
