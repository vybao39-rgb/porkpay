const fs = require("fs");

const pages = ["index.html", "submission.html", "presentation.html"];
const expectedBodyClasses = ["vpork-app", "vpork-submission", "vpork-deck"];
const css = fs.readFileSync("assets/vporkpay-design-system.css", "utf8");

pages.forEach((page, index) => {
  const html = fs.readFileSync(page, "utf8");
  if (!html.includes('href="assets/vporkpay-design-system.css"')) {
    throw new Error(`${page} does not load the shared product design system`);
  }
  if (!html.includes(`<body class="${expectedBodyClasses[index]}">`)) {
    throw new Error(`${page} is missing its page-level design scope`);
  }
  if (/AI IMAGE|-ai\.jpg|demo built for the Build on Arc hackathon/i.test(html)) {
    throw new Error(`${page} still exposes internal generation or template wording`);
  }
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const path = match[1].split(/[?#]/)[0];
    if (!path || /^(https?:|#|mailto:|javascript:|\$\{)/.test(path)) continue;
    if (!fs.existsSync(path)) throw new Error(`${page} links to missing local asset ${path}`);
  }
});

for (const selector of ["body.vpork-app", "body.vpork-submission", "body.vpork-deck", ".vpork-app .hero", ".vpork-app .order-card"]) {
  if (!css.includes(selector)) throw new Error(`Shared design system is missing ${selector}`);
}

for (const asset of ["pork-belly.jpg", "pork-chops.jpg", "pork-ribs.jpg", "pork-shoulder.jpg", "pork-tenderloin.jpg", "ground-pork.jpg"]) {
  if (!fs.existsSync(`assets/${asset}`)) throw new Error(`Renamed product asset is missing: ${asset}`);
}

console.log("PASS: marketplace, operations, submission and deck share one branded design system with valid assets");
