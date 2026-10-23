import { describe, expect, it } from "vitest";
import { chooseSaveRoute, dataUrlToFile } from "@/lib/capture";

// A 1x1 transparent PNG.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("saving a photo", () => {
  it("turns a data URL into a PNG file straight away", async () => {
    const file = dataUrlToFile(PNG, "my-pumpkin.png");
    expect(file.name).toBe("my-pumpkin.png");
    expect(file.type).toBe("image/png");
    const bytes = new Uint8Array(await file.arrayBuffer());
    expect([...bytes.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // the PNG signature
  });

  it("shares on a phone that can share files, so Save Image can reach Photos", () => {
    expect(chooseSaveRoute({ touch: true, canShareFiles: true })).toBe("share");
  });

  it("shows a press-and-hold preview on a phone that cannot share files", () => {
    expect(chooseSaveRoute({ touch: true, canShareFiles: false })).toBe("preview");
  });

  it("downloads on a computer, even one that can share", () => {
    expect(chooseSaveRoute({ touch: false, canShareFiles: true })).toBe("download");
    expect(chooseSaveRoute({ touch: false, canShareFiles: false })).toBe("download");
  });
});
