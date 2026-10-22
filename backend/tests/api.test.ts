// SabaTrail API tests (QUAL-05). Run with: npm test
//
// The app is started in-process on a random port against the database in
// DATABASE_URL (the seeded development database). Every record the tests
// create is removed again at the end.

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../Src/app";
import { prisma } from "../Src/prisma";
import { removeLocalUpload } from "../Src/uploads";

let server: Server;
let base = "";

const stamp = Date.now();
const userEmail = `api-test-user-${stamp}@sabatrail.local`;
const adminEmail = `api-test-admin-${stamp}@sabatrail.local`;
const password = "trail2026go";

let userToken = "";
let adminToken = "";
const createdPlaceIds: number[] = [];
const createdCategoryIds: number[] = [];
const uploadedImages: string[] = [];

// Smallest valid PNG (1x1)
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cfc0f01f0005000201a5e2b5b50000000049454e44ae426082",
  "hex"
);

async function upload(data: Buffer, type: string, name: string, token?: string) {
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(data)], { type }), name);

  const response = await fetch(base + "/api/uploads", {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const body = await response.json().catch(() => null);
  if (body?.url) uploadedImages.push(body.url);
  return { status: response.status, data: body };
}

async function call(method: string, path: string, body?: unknown, token?: string) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function signUp(email: string) {
  await call("POST", "/api/auth/register", { name: "API Test", email, password });
  const login = await call("POST", "/api/auth/login", { email, password });
  return login.data.token as string;
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  userToken = await signUp(userEmail);

  // Admins can't self-register; promote a test account directly
  await call("POST", "/api/auth/register", { name: "API Admin", email: adminEmail, password });
  await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
  adminToken = (await call("POST", "/api/auth/login", { email: adminEmail, password })).data.token;
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: [userEmail, adminEmail] } } });
  const userIds = users.map((u) => u.user_id);
  const plans = await prisma.visitPlan.findMany({ where: { user_id: { in: userIds } } });
  const planIds = plans.map((p) => p.plan_id);

  await prisma.visitPlanPlace.deleteMany({ where: { OR: [{ plan_id: { in: planIds } }, { place_id: { in: createdPlaceIds } }] } });
  await prisma.visitPlan.deleteMany({ where: { plan_id: { in: planIds } } });
  await prisma.place.deleteMany({ where: { place_id: { in: createdPlaceIds } } });
  await prisma.category.deleteMany({ where: { category_id: { in: createdCategoryIds } } });
  await prisma.user.deleteMany({ where: { user_id: { in: userIds } } });
  await Promise.all(uploadedImages.map((url) => removeLocalUpload(url)));

  await prisma.$disconnect();
  server.close();
});

describe("seed data (FR-001, FR-003, BR-01)", () => {
  test("at least 10 places, all within 25 km of Hemmathagama", async () => {
    const { status, data } = await call("GET", "/api/places");
    assert.equal(status, 200);
    assert.ok(data.length >= 10, `expected >= 10 places, got ${data.length}`);
    for (const place of data) {
      assert.ok(place.distance <= 25, `${place.place_name} is ${place.distance} km away`);
    }
  });

  test("the six SRS categories exist", async () => {
    const { data } = await call("GET", "/api/categories");
    const names = data.map((c: { category_name: string }) => c.category_name);
    for (const name of ["Religious", "Nature/Scenic", "Heritage/Cultural", "Recreational", "Restaurants/Dining", "Public/Useful"]) {
      assert.ok(names.includes(name), `missing category ${name}`);
    }
  });
});

describe("auth (FR-022 to FR-028, SEC-01/02/04)", () => {
  test("register validates email and password strength", async () => {
    const { status, data } = await call("POST", "/api/auth/register", { name: "X", email: "nope", password: "short" });
    assert.equal(status, 400);
    assert.ok(data.errors.email && data.errors.password);
  });

  test("duplicate email is rejected", async () => {
    const { status } = await call("POST", "/api/auth/register", { name: "Dup", email: userEmail, password });
    assert.equal(status, 409);
  });

  test("wrong password gives a clear, generic error", async () => {
    const { status, data } = await call("POST", "/api/auth/login", { email: userEmail, password: "wrong-pass-1" });
    assert.equal(status, 401);
    assert.equal(data.message, "Invalid email or password");
  });

  test("non-string input never crashes the server", async () => {
    const { status } = await call("POST", "/api/auth/login", { email: 123, password: ["x"] });
    assert.equal(status, 400);
  });

  test("malformed JSON is a 400", async () => {
    const { status } = await call("POST", "/api/auth/login", "{bad");
    assert.equal(status, 400);
  });

  test("passwords are stored as bcrypt hashes", async () => {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    assert.match(user!.password, /^\$2[aby]\$/);
  });

  test("/auth/me returns the signed-in profile, never the password", async () => {
    const { status, data } = await call("GET", "/api/auth/me", undefined, userToken);
    assert.equal(status, 200);
    assert.equal(data.user.email, userEmail);
    assert.equal(data.user.password, undefined);
  });

  test("protected routes need a valid token", async () => {
    assert.equal((await call("GET", "/api/visit-plans")).status, 401);
    assert.equal((await call("GET", "/api/visit-plans", undefined, "not.a.token")).status, 401);
  });
});

describe("places and categories (FR-046 to FR-059, SEC-03)", () => {
  test("only admins can create places", async () => {
    const body = { category_id: 1, place_name: "Nope", latitude: 7.2, longitude: 80.5 };
    assert.equal((await call("POST", "/api/places", body)).status, 401);
    assert.equal((await call("POST", "/api/places", body, userToken)).status, 403);
  });

  test("place validation: ranges, required fields, text length", async () => {
    const { status, data } = await call(
      "POST",
      "/api/places",
      { category_id: 1, place_name: "", latitude: "", longitude: 200, description: "x".repeat(6000) },
      adminToken
    );
    assert.equal(status, 400);
    for (const field of ["place_name", "latitude", "longitude", "description"]) {
      assert.ok(data.errors[field], `expected an error for ${field}`);
    }
  });

  test("create computes distance and stores minutes; long text is accepted", async () => {
    const categories = (await call("GET", "/api/categories")).data;
    const { status, data } = await call(
      "POST",
      "/api/places",
      {
        category_id: categories[0].category_id,
        place_name: `API test place ${stamp}`,
        latitude: 7.2,
        longitude: 80.5,
        visit_duration_minutes: 90,
        opening_time: "08:00",
        description: "A long description. ".repeat(30),
      },
      adminToken
    );
    assert.equal(status, 201);
    createdPlaceIds.push(data.place_id);
    assert.equal(typeof data.distance, "number");
    assert.equal(data.visit_duration, "1 h 30 min");
  });

  test("unknown IDs are 404, invalid IDs are 400", async () => {
    assert.equal((await call("GET", "/api/places/999999")).status, 404);
    assert.equal((await call("GET", "/api/places/abc")).status, 400);
    const update = { category_id: 1, place_name: "X", latitude: 7, longitude: 80 };
    assert.equal((await call("PUT", "/api/places/999999", update, adminToken)).status, 404);
  });

  test("a category in use cannot be deleted (409)", async () => {
    const categories = (await call("GET", "/api/categories")).data;
    const used = categories.find((c: { _count: { places: number } }) => c._count.places > 0);
    const { status, data } = await call("DELETE", `/api/categories/${used.category_id}`, undefined, adminToken);
    assert.equal(status, 409);
    assert.match(data.message, /used by/);
  });

  test("an unused category can be created and deleted; duplicates are refused", async () => {
    const name = `API test category ${stamp}`;
    const created = await call("POST", "/api/categories", { category_name: name }, adminToken);
    assert.equal(created.status, 201);
    createdCategoryIds.push(created.data.category_id);
    assert.equal((await call("POST", "/api/categories", { category_name: name }, adminToken)).status, 409);
    assert.equal((await call("DELETE", `/api/categories/${created.data.category_id}`, undefined, adminToken)).status, 200);
  });
});

describe("visit plans (FR-029 to FR-045)", () => {
  let planId = 0;
  let placeIds: number[] = [];

  test("a visit date is required", async () => {
    const { status, data } = await call("POST", "/api/visit-plans", { plan_name: "No date" }, userToken);
    assert.equal(status, 400);
    assert.ok(data.errors.visit_date);
  });

  test("create a plan and add stops in order", async () => {
    const plan = await call("POST", "/api/visit-plans", { plan_name: "API test day", visit_date: "2026-12-01" }, userToken);
    assert.equal(plan.status, 201);
    planId = plan.data.plan_id;

    placeIds = (await call("GET", "/api/places")).data.slice(0, 3).map((p: { place_id: number }) => p.place_id);
    for (const placeId of placeIds) {
      assert.equal((await call("POST", `/api/visit-plans/${planId}/places`, { place_id: placeId }, userToken)).status, 201);
    }

    const stops = (await call("GET", `/api/visit-plans/${planId}/places`, undefined, userToken)).data.places;
    assert.deepEqual(stops.map((s: { visit_order: number }) => s.visit_order), [1, 2, 3]);
  });

  test("the same place can't be added twice", async () => {
    assert.equal((await call("POST", `/api/visit-plans/${planId}/places`, { place_id: placeIds[0] }, userToken)).status, 409);
  });

  test("reorder in one request; invalid lists are refused", async () => {
    const reversed = [...placeIds].reverse();
    assert.equal((await call("PUT", `/api/visit-plans/${planId}/order`, { place_ids: reversed }, userToken)).status, 200);
    const stops = (await call("GET", `/api/visit-plans/${planId}/places`, undefined, userToken)).data.places;
    assert.deepEqual(stops.map((s: { place_id: number }) => s.place_id), reversed);
    assert.equal((await call("PUT", `/api/visit-plans/${planId}/order`, { place_ids: [placeIds[0]] }, userToken)).status, 400);
  });

  test("planned times use HH:MM", async () => {
    assert.equal((await call("PUT", `/api/visit-plans/${planId}/places/${placeIds[0]}`, { planned_time: "9am" }, userToken)).status, 400);
    assert.equal((await call("PUT", `/api/visit-plans/${planId}/places/${placeIds[0]}`, { planned_time: "09:30" }, userToken)).status, 200);
  });

  test("removing a stop renumbers the rest", async () => {
    await call("DELETE", `/api/visit-plans/${planId}/places/${placeIds[1]}`, undefined, userToken);
    const stops = (await call("GET", `/api/visit-plans/${planId}/places`, undefined, userToken)).data.places;
    assert.deepEqual(stops.map((s: { visit_order: number }) => s.visit_order), [1, 2]);
  });

  test("plans are private to their owner", async () => {
    assert.equal((await call("GET", `/api/visit-plans/${planId}`, undefined, adminToken)).status, 404);
  });

  test("rename and delete a plan", async () => {
    const renamed = await call("PUT", `/api/visit-plans/${planId}`, { plan_name: "Renamed" }, userToken);
    assert.equal(renamed.data.plan_name, "Renamed");
    assert.equal((await call("DELETE", `/api/visit-plans/${planId}`, undefined, userToken)).status, 200);
    assert.equal((await call("GET", `/api/visit-plans/${planId}`, undefined, userToken)).status, 404);
  });

  test("deleting a planned place needs explicit confirmation (409, then ?force=true)", async () => {
    const plan = await call("POST", "/api/visit-plans", { plan_name: "Force test", visit_date: "2026-12-02" }, userToken);
    const placeId = createdPlaceIds[0];
    await call("POST", `/api/visit-plans/${plan.data.plan_id}/places`, { place_id: placeId }, userToken);

    const blocked = await call("DELETE", `/api/places/${placeId}`, undefined, adminToken);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.data.plan_count, 1);

    const forced = await call("DELETE", `/api/places/${placeId}?force=true`, undefined, adminToken);
    assert.equal(forced.status, 200);
    assert.equal(forced.data.removed_from_plans, 1);
  });
});

describe("image uploads (admin photo)", () => {
  test("only admins can upload (401 / 403)", async () => {
    assert.equal((await upload(PNG, "image/png", "a.png")).status, 401);
    assert.equal((await upload(PNG, "image/png", "a.png", userToken)).status, 403);
  });

  test("non-images are refused, even with an image name and type", async () => {
    const { status, data } = await upload(Buffer.from("just some text"), "image/jpeg", "photo.jpg", adminToken);
    assert.equal(status, 400);
    assert.equal(data.errors.image, "Upload a JPEG, PNG or WebP image");
  });

  test("files over 5 MB are refused (413)", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const { status, data } = await upload(big, "image/png", "big.png", adminToken);
    assert.equal(status, 413);
    assert.equal(data.errors.image, "Image must be 5 MB or smaller");
  });

  test("a valid image is stored under a random name and served", async () => {
    const { status, data } = await upload(PNG, "image/png", "../../holiday.png", adminToken);
    assert.equal(status, 201);
    assert.match(data.url, /^\/uploads\/[0-9a-f-]{36}\.png$/);

    const file = await fetch(base + data.url);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get("content-type"), "image/png");
    assert.equal(file.headers.get("x-content-type-options"), "nosniff");
  });

  test("replacing or deleting a place removes its old uploaded photo, not external URLs", async () => {
    const categories = (await call("GET", "/api/categories")).data;
    const first = (await upload(PNG, "image/png", "a.png", adminToken)).data.url;
    const second = (await upload(PNG, "image/png", "b.png", adminToken)).data.url;
    const body = { category_id: categories[0].category_id, place_name: `API upload place ${stamp}`, latitude: 7.2, longitude: 80.5 };

    const created = await call("POST", "/api/places", { ...body, image: first }, adminToken);
    assert.equal(created.status, 201);
    createdPlaceIds.push(created.data.place_id);
    const id = created.data.place_id;

    assert.equal((await call("PUT", `/api/places/${id}`, { ...body, image: second }, adminToken)).status, 200);
    assert.equal((await fetch(base + first)).status, 404, "replaced upload should be removed");
    assert.equal((await fetch(base + second)).status, 200);

    // Only real upload paths are accepted as local images
    const sneaky = await call("PUT", `/api/places/${id}`, { ...body, image: "/uploads/../.env" }, adminToken);
    assert.equal(sneaky.status, 400);

    assert.equal((await call("DELETE", `/api/places/${id}`, undefined, adminToken)).status, 200);
    assert.equal((await fetch(base + second)).status, 404, "deleted place's upload should be removed");
  });
});

describe("hardening (SEC-05, SEC-06)", () => {
  test("unknown API routes are JSON 404s", async () => {
    const { status, data } = await call("GET", "/api/nope");
    assert.equal(status, 404);
    assert.equal(data.message, "Endpoint not found");
  });

  test("CORS only allows configured origins", async () => {
    const allowed = await fetch(`${base}/api/places`, { headers: { Origin: "http://localhost:5173" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");

    const blocked = await fetch(`${base}/api/places`, { headers: { Origin: "https://evil.example" } });
    assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  });
});
