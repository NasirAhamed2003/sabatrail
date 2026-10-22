// Builds SabaTrail.postman_collection.json from one request list, and with
// --run replays the same list against a running API to prove it works.
//
//   node postman/build-collection.mjs                 # write the collection
//   node postman/build-collection.mjs --run <baseUrl> # write, then replay
//
// The admin password is never stored in the collection; set the
// adminPassword collection variable in Postman (or ADMIN_PASSWORD here).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// {{var}} placeholders are Postman variables. "save" copies response fields
// into variables for later requests. "expect" is the expected status code.
const folders = [
  {
    name: "1. Health",
    requests: [{ name: "API status", method: "GET", url: "/", expect: 200 }],
  },
  {
    name: "2. Auth",
    requests: [
      {
        name: "Register (validation error)",
        method: "POST",
        url: "/api/auth/register",
        body: { name: "", email: "not-an-email", password: "short" },
        expect: 400,
      },
      {
        name: "Register",
        method: "POST",
        url: "/api/auth/register",
        body: { name: "Postman Tester", email: "{{userEmail}}", password: "{{userPassword}}" },
        expect: 201,
      },
      {
        name: "Login (wrong password)",
        method: "POST",
        url: "/api/auth/login",
        body: { email: "{{userEmail}}", password: "wrong-pass-1" },
        expect: 401,
      },
      {
        name: "Login",
        method: "POST",
        url: "/api/auth/login",
        body: { email: "{{userEmail}}", password: "{{userPassword}}" },
        expect: 200,
        save: { token: "token" },
      },
      { name: "Current user", method: "GET", url: "/api/auth/me", auth: "token", expect: 200 },
      {
        name: "Admin login",
        method: "POST",
        url: "/api/auth/login",
        body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
        expect: 200,
        save: { adminToken: "token" },
      },
    ],
  },
  {
    name: "3. Places (public)",
    requests: [
      { name: "List places", method: "GET", url: "/api/places", expect: 200, save: { placeId: "0.place_id", placeId2: "1.place_id" } },
      { name: "Get one place", method: "GET", url: "/api/places/{{placeId}}", expect: 200 },
      { name: "Unknown place (404)", method: "GET", url: "/api/places/999999", expect: 404 },
      { name: "List categories", method: "GET", url: "/api/categories", expect: 200, save: { categoryId: "0.category_id" } },
    ],
  },
  {
    name: "4. Admin",
    requests: [
      {
        name: "Create place as visitor (403)",
        method: "POST",
        url: "/api/places",
        auth: "token",
        body: { category_id: "{{categoryId}}", place_name: "Not allowed", latitude: 7.2, longitude: 80.5 },
        expect: 403,
      },
      {
        name: "Create place (validation error)",
        method: "POST",
        url: "/api/places",
        auth: "adminToken",
        body: { category_id: "{{categoryId}}", place_name: "", latitude: 200, longitude: "" },
        expect: 400,
      },
      {
        name: "Create place",
        method: "POST",
        url: "/api/places",
        auth: "adminToken",
        body: {
          category_id: "{{categoryId}}",
          place_name: "Postman test place",
          latitude: 7.2,
          longitude: 80.5,
          visit_duration_minutes: 45,
          opening_time: "08:00",
          closing_time: "17:00",
        },
        expect: 201,
        save: { newPlaceId: "place_id" },
      },
      {
        name: "Update place",
        method: "PUT",
        url: "/api/places/{{newPlaceId}}",
        auth: "adminToken",
        body: { category_id: "{{categoryId}}", place_name: "Postman test place (edited)", latitude: 7.21, longitude: 80.51 },
        expect: 200,
      },
      { name: "Place usage", method: "GET", url: "/api/places/{{newPlaceId}}/usage", auth: "adminToken", expect: 200 },
      { name: "Delete category in use (409)", method: "DELETE", url: "/api/categories/{{categoryId}}", auth: "adminToken", expect: 409 },
      {
        name: "Create category",
        method: "POST",
        url: "/api/categories",
        auth: "adminToken",
        body: { category_name: "Postman test category", description: "Temporary" },
        expect: 201,
        save: { newCategoryId: "category_id" },
      },
      {
        name: "Update category",
        method: "PUT",
        url: "/api/categories/{{newCategoryId}}",
        auth: "adminToken",
        body: { category_name: "Postman test category (edited)" },
        expect: 200,
      },
      { name: "Delete category", method: "DELETE", url: "/api/categories/{{newCategoryId}}", auth: "adminToken", expect: 200 },
    ],
  },
  {
    name: "5. Visit plans",
    requests: [
      { name: "Plans without a token (401)", method: "GET", url: "/api/visit-plans", expect: 401 },
      {
        name: "Create plan without date (400)",
        method: "POST",
        url: "/api/visit-plans",
        auth: "token",
        body: { plan_name: "No date" },
        expect: 400,
      },
      {
        name: "Create plan",
        method: "POST",
        url: "/api/visit-plans",
        auth: "token",
        body: { plan_name: "Postman day", visit_date: "2026-12-01" },
        expect: 201,
        save: { planId: "plan_id" },
      },
      { name: "List my plans", method: "GET", url: "/api/visit-plans", auth: "token", expect: 200 },
      {
        name: "Add stop 1",
        method: "POST",
        url: "/api/visit-plans/{{planId}}/places",
        auth: "token",
        body: { place_id: "{{placeId}}", planned_time: "09:00" },
        expect: 201,
      },
      {
        name: "Add stop 2",
        method: "POST",
        url: "/api/visit-plans/{{planId}}/places",
        auth: "token",
        body: { place_id: "{{placeId2}}" },
        expect: 201,
      },
      {
        name: "Add the same stop again (409)",
        method: "POST",
        url: "/api/visit-plans/{{planId}}/places",
        auth: "token",
        body: { place_id: "{{placeId}}" },
        expect: 409,
      },
      {
        name: "Add the new place (for the delete test)",
        method: "POST",
        url: "/api/visit-plans/{{planId}}/places",
        auth: "token",
        body: { place_id: "{{newPlaceId}}" },
        expect: 201,
      },
      { name: "Stops in order", method: "GET", url: "/api/visit-plans/{{planId}}/places", auth: "token", expect: 200 },
      {
        name: "Reorder stops",
        method: "PUT",
        url: "/api/visit-plans/{{planId}}/order",
        auth: "token",
        body: { place_ids: ["{{newPlaceId}}", "{{placeId2}}", "{{placeId}}"] },
        expect: 200,
      },
      {
        name: "Set planned time",
        method: "PUT",
        url: "/api/visit-plans/{{planId}}/places/{{placeId2}}",
        auth: "token",
        body: { planned_time: "11:30" },
        expect: 200,
      },
      { name: "Remove a stop", method: "DELETE", url: "/api/visit-plans/{{planId}}/places/{{placeId2}}", auth: "token", expect: 200 },
      {
        name: "Rename plan",
        method: "PUT",
        url: "/api/visit-plans/{{planId}}",
        auth: "token",
        body: { plan_name: "Postman day (renamed)", visit_date: "2026-12-02" },
        expect: 200,
      },
      { name: "Delete planned place (409)", method: "DELETE", url: "/api/places/{{newPlaceId}}", auth: "adminToken", expect: 409 },
      { name: "Delete planned place (force)", method: "DELETE", url: "/api/places/{{newPlaceId}}?force=true", auth: "adminToken", expect: 200 },
      { name: "Delete plan", method: "DELETE", url: "/api/visit-plans/{{planId}}", auth: "token", expect: 200 },
    ],
  },
];

// Numeric IDs are sent as numbers, not strings
const NUMERIC = new Set(["placeId", "placeId2", "newPlaceId", "categoryId", "planId"]);

function toPostmanBody(body) {
  const json = JSON.stringify(body, null, 2).replace(/"\{\{(\w+)\}\}"/g, (match, name) => (NUMERIC.has(name) ? `{{${name}}}` : match));
  return { mode: "raw", raw: json, options: { raw: { language: "json" } } };
}

function testScript(request) {
  const lines = [
    `pm.test("status is ${request.expect}", () => pm.response.to.have.status(${request.expect}));`,
  ];

  for (const [variable, field] of Object.entries(request.save ?? {})) {
    const access = field
      .split(".")
      .map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`))
      .join("");
    lines.push(`pm.collectionVariables.set("${variable}", pm.response.json()${access});`);
  }

  return [{ listen: "test", script: { type: "text/javascript", exec: lines } }];
}

const collection = {
  info: {
    name: "SabaTrail API",
    description:
      "Every SabaTrail endpoint, in an order that runs end to end (Run collection). Set adminPassword before running; userEmail gets a unique value automatically. Expected status codes are checked by each request's tests.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  event: [
    {
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [
          "// A fresh visitor account per run",
          'if (!pm.collectionVariables.get("userEmail")) {',
          '  pm.collectionVariables.set("userEmail", `postman-${Date.now()}@sabatrail.local`);',
          "}",
        ],
      },
    },
  ],
  variable: [
    { key: "baseUrl", value: "http://localhost:5000" },
    { key: "userEmail", value: "" },
    { key: "userPassword", value: "trail2026go" },
    { key: "adminEmail", value: "admin@sabatrail.local" },
    { key: "adminPassword", value: "" },
    ...["token", "adminToken", "placeId", "placeId2", "categoryId", "newPlaceId", "newCategoryId", "planId"].map((key) => ({ key, value: "" })),
  ],
  item: folders.map((folder) => ({
    name: folder.name,
    item: folder.requests.map((request) => ({
      name: request.name,
      event: testScript(request),
      request: {
        method: request.method,
        header: [
          ...(request.body ? [{ key: "Content-Type", value: "application/json" }] : []),
          ...(request.auth ? [{ key: "Authorization", value: `Bearer {{${request.auth}}}` }] : []),
        ],
        url: { raw: `{{baseUrl}}${request.url}`, host: ["{{baseUrl}}"], path: request.url.split("?")[0].split("/").filter(Boolean), ...(request.url.includes("?") ? { query: request.url.split("?")[1].split("&").map((kv) => ({ key: kv.split("=")[0], value: kv.split("=")[1] })) } : {}) },
        ...(request.body ? { body: toPostmanBody(request.body) } : {}),
      },
    })),
  })),
};

const outFile = path.join(here, "SabaTrail.postman_collection.json");
fs.writeFileSync(outFile, JSON.stringify(collection, null, 2) + "\n");
console.log(`Wrote ${path.relative(process.cwd(), outFile)} (${folders.reduce((n, f) => n + f.requests.length, 0)} requests)`);

// ---------- Optional replay (proves the collection's flow works) ----------
if (process.argv[2] === "--run") {
  const baseUrl = process.argv[3] || "http://localhost:5000";
  const vars = {
    userEmail: `postman-${Date.now()}@sabatrail.local`,
    userPassword: "trail2026go",
    adminEmail: process.env.ADMIN_EMAIL || "admin@sabatrail.local",
    adminPassword: process.env.ADMIN_PASSWORD || "",
  };

  const fill = (text) => text.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(vars[name] ?? ""));
  let failures = 0;

  for (const folder of folders) {
    for (const request of folder.requests) {
      const body = request.body ? fill(toPostmanBody(request.body).raw) : undefined;
      const headers = { "Content-Type": "application/json", ...(request.auth ? { Authorization: `Bearer ${vars[request.auth]}` } : {}) };
      const response = await fetch(baseUrl + fill(request.url), { method: request.method, headers, body });
      const data = await response.json().catch(() => null);

      for (const [variable, field] of Object.entries(request.save ?? {})) {
        vars[variable] = field.split(".").reduce((value, part) => value?.[part], data);
      }

      const ok = response.status === request.expect;
      if (!ok) failures++;
      console.log(`${ok ? "PASS" : "FAIL"}  ${folder.name} / ${request.name}: ${response.status}${ok ? "" : ` (expected ${request.expect})`}`);
    }
  }

  console.log(failures ? `\n${failures} request(s) failed` : "\nAll requests returned the expected status");
  process.exit(failures ? 1 : 0);
}
