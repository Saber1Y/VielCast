const fs = require("fs");
const path = require("path");

const stubs = {
  "@stripe/crypto": { main: "index.js", content: "export {};" },
  "@farcaster/mini-app-solana": { main: "index.js", content: "export {};" },
};

for (const [pkg, stub] of Object.entries(stubs)) {
  const dir = path.join(__dirname, "..", "node_modules", pkg);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.js"), stub.content);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ main: stub.main })
    );
    console.log(`Created stub for ${pkg}`);
  }
}
