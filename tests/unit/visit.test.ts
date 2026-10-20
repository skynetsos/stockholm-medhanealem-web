import { describe, expect, it } from "vitest";

import { mapEmbedUrl, mapLink, mapPin } from "../../src/lib/visit";

const address = { street: "Pålsbodagränd 3", postalCode: "124 75", city: "Bandhagen" };

describe("visit map", () => {
  it("uses the pin only when both coordinates are valid", () => {
    expect(mapPin({ mapLocation: { latitude: 59.27, longitude: 18.05 } })).toEqual({ latitude: 59.27, longitude: 18.05 });
    expect(mapPin({ mapLocation: { latitude: 59.27, longitude: null } })).toBeNull();
    expect(mapPin({ mapLocation: { latitude: 120, longitude: 18 } })).toBeNull();
    expect(mapPin({})).toBeNull();
  });

  it("links to the map URL, else the pin, else an address search", () => {
    expect(mapLink({ mapUrl: "https://maps.example/church", address })).toBe("https://maps.example/church");
    expect(mapLink({ mapUrl: "javascript:alert(1)", mapLocation: { latitude: 59.27, longitude: 18.05 } })).toBe(
      "https://www.openstreetmap.org/?mlat=59.27&mlon=18.05#map=17/59.27/18.05",
    );
    expect(mapLink({ address })).toBe("https://www.openstreetmap.org/search?query=P%C3%A5lsbodagr%C3%A4nd%203%2C%20124%2075%20Bandhagen");
    expect(mapLink({})).toBeNull();
  });

  it("builds an OpenStreetMap embed around the pin", () => {
    const url = new URL(mapEmbedUrl({ latitude: 59.27, longitude: 18.05 }));
    expect(url.origin + url.pathname).toBe("https://www.openstreetmap.org/export/embed.html");
    expect(url.searchParams.get("bbox")).toBe("18.045000,59.267500,18.055000,59.272500");
    expect(url.searchParams.get("marker")).toBe("59.27,18.05");
  });
});
