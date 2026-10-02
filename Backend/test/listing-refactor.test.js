import { test, mock } from "node:test";
import assert from "node:assert/strict";
import Item from "../src/models/ItemsList.model.js";
import cloudinary from "../src/lib/cloudinary.js";
import { uploadBufferToCloudinary } from "../src/lib/cloudinaryUpload.js";
import {
  getItems,
  getMyItems,
  getItemById,
  getMyArchivedItems,
} from "../src/controllers/items.controller.js";
import {
  hasValidId,
  parseMaybeJson,
  sendControllerError,
} from "../src/services/listingHelpers.js";

const response = () => ({
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("listing responses preserve populated owners, legacy snapshots and archive fallbacks", async () => {
  const owner = { _id: "owner", name: "Current name", photo: "current.jpg" };
  const legacy = { id: "legacy", fullName: "Legacy name" };
  const records = [
    { user: owner, seller: legacy },
    { user: null, seller: legacy },
    { user: null, seller: {} },
    { user: null },
  ];
  const expected = [
    {
      ...records[0],
      seller: {
        id: "owner",
        username: "",
        fullName: "Current name",
        profilePic: "current.jpg",
      },
    },
    records[1],
    { ...records[2], seller: null },
    { ...records[3], seller: null },
  ];
  const query = (value) => ({
    sort() {
      return this;
    },
    populate() {
      return this;
    },
    async lean() {
      return value;
    },
  });
  mock.method(Item, "find", () => query(records));
  mock.method(Item, "findOne", () => query(records[0]));
  try {
    for (const action of [getItems, getMyItems]) {
      const res = response();
      await action({ user: { _id: "owner" } }, res);
      assert.equal(res.code, 200);
      assert.deepEqual(res.body, expected);
    }
    const detail = response();
    await getItemById({ params: { id: "0123456789abcdef01234567" } }, detail);
    assert.equal(detail.code, 200);
    assert.deepEqual(detail.body, expected[0]);
    const archive = response();
    await getMyArchivedItems({ user: { _id: "owner" } }, archive);
    assert.deepEqual(archive.body[2].seller, {});
  } finally {
    mock.restoreAll();
  }
});

test("shared listing validation retains parsing fallbacks and error responses", () => {
  assert.equal(hasValidId("0123456789abcdef01234567"), true);
  assert.equal(hasValidId("invalid"), false);
  const fallback = [];
  for (const value of [undefined, null, "invalid"])
    assert.equal(parseMaybeJson(value, fallback), fallback);
  assert.deepEqual(parseMaybeJson("[1]", fallback), [1]);
  assert.equal(parseMaybeJson(fallback, null), fallback);
  assert.equal(parseMaybeJson("null", fallback), null);
  for (const name of ["ValidationError", "CastError"]) {
    const res = response();
    sendControllerError(res, { name, message: "Original error" }, "Fallback");
    assert.equal(res.code, 400);
    assert.deepEqual(res.body, { message: "Original error" });
  }
});

test("shared Cloudinary uploads preserve folder, explicit image options, buffers and failures", async () => {
  const buffer = Buffer.from("image");
  const calls = [];
  let failure;
  mock.method(cloudinary.uploader, "upload_stream", (options, callback) => ({
    end(value) {
      calls.push({ options, value });
      callback(failure, { secure_url: "image.jpg", public_id: "image" });
    },
  }));
  try {
    assert.deepEqual(await uploadBufferToCloudinary(buffer), {
      secure_url: "image.jpg",
      public_id: "image",
    });
    await uploadBufferToCloudinary(buffer, "accommodations");
    await uploadBufferToCloudinary(buffer, "items", { resource_type: "image" });
    assert.deepEqual(
      calls.map((call) => call.options),
      [
        { folder: "items" },
        { folder: "accommodations" },
        { folder: "items", resource_type: "image" },
      ]
    );
    assert.ok(calls.every((call) => call.value === buffer));
    failure = new Error("Upload failed");
    await assert.rejects(
      uploadBufferToCloudinary(buffer),
      (error) => error === failure
    );
  } finally {
    mock.restoreAll();
  }
});
