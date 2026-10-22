import { test } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { partnerVCard } from "../src/app/lib/partner-vcard.ts";
const contact = {
  companyName: "Müller & Partner",
  contactName: "Anna Müller",
  contactPosition: "Inhaberin",
  contactEmail: "anna@example.de",
  contactPhone: "+49 221 123456",
  street: "Musterstraße 12",
  postalCode: "50667",
  city: "Köln",
  country: "Deutschland",
  websiteUrl: "https://example.de",
  logoUrl: null,
};
test("exports the displayed contact as vCard without portal credentials", () => {
  const card = partnerVCard(contact);
  assert.ok(card.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n"));
  assert.ok(card.endsWith("END:VCARD\r\n"));
  assert.ok(card.includes("FN:Anna Müller"));
  assert.ok(card.includes("EMAIL;TYPE=INTERNET,WORK:anna@example.de"));
  assert.ok(
    card.includes("ADR;TYPE=WORK:;;Musterstraße 12;Köln;;50667;Deutschland"),
  );
  assert.ok(card.includes("TEL;TYPE=WORK,VOICE:+49 221 123456"));
  assert.ok(!card.includes("token"));
});
test("escapes text separators and prevents extra fields from injected newlines", () => {
  const card = partnerVCard({
    ...contact,
    companyName: "Test;Firma, GmbH\\AG\r\nX-ACCESS:secret",
  });
  assert.ok(card.includes("ORG:Test\\;Firma\\, GmbH\\\\AG\\nX-ACCESS:secret"));
  assert.ok(!card.includes("\r\nX-ACCESS:"));
});
test("folds long UTF-8 lines without corrupting Unicode", () => {
  const name = "Müller 😀 ".repeat(20);
  const card = partnerVCard({ ...contact, contactName: name });
  for (const line of card.split("\r\n"))
    assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  const unfolded = card.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("FN:" + name.trim()));
  assert.ok(!card.includes("\ufffd"));
});
test("generates a local QR image with quiet zone and the vCard payload", async () => {
  const payload = partnerVCard(contact),
    qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  assert.ok(qr.modules.size > 20);
  const image = await QRCode.toDataURL(payload, {
    width: 512,
    margin: 4,
    errorCorrectionLevel: "M",
  });
  assert.ok(image.startsWith("data:image/png;base64,"));
  assert.equal(
    Buffer.from(image.split(",")[1], "base64").subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
  );
});
