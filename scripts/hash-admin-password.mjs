import { randomBytes, scryptSync } from "node:crypto";

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
  process.stdout.write(`ADMIN_PASSWORD_HASH=scrypt$${salt}$${hash}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Password hashing failed."}\n`);
  process.exitCode = 1;
}
