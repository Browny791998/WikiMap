const countriesData = require("../data/countries.json");

const EXPECTED_CODES = [
  "MM", "JP", "US", "GB", "FR", "DE", "IN", "CN", "TH", "KR",
  "IT", "ES", "EG", "BR", "AU", "MX", "TR", "GR", "RU", "ZA",
  "ID", "VN", "MY", "SG", "PH", "AE", "NG", "KE", "AR", "PE",
  "PT", "NL", "SE", "NO", "PL", "NP", "KH", "LA", "BD", "LK",
  "PK", "IR", "SA", "MA", "ET", "CO", "CL", "UA", "CZ", "HU",
];

const REQUIRED_FIELDS = ["food", "dress", "festivals", "famousPlaces", "funFact"];

// ─── Schema & completeness ───────────────────────────────────────────────────

describe("countries.json — completeness", () => {
  test("contains exactly 50 country entries", () => {
    expect(Object.keys(countriesData)).toHaveLength(50);
  });

  test.each(EXPECTED_CODES)("contains ISO Alpha-2 key: %s", (code) => {
    expect(countriesData).toHaveProperty(code);
  });

  test("has no unexpected country codes", () => {
    const actual = Object.keys(countriesData).sort();
    const expected = [...EXPECTED_CODES].sort();
    expect(actual).toEqual(expected);
  });
});

// ─── Per-country field validation ────────────────────────────────────────────

describe("countries.json — field schema", () => {
  test.each(EXPECTED_CODES)("%s has all required fields", (code) => {
    const country = countriesData[code];
    for (const field of REQUIRED_FIELDS) {
      expect(country).toHaveProperty(field);
    }
  });

  test.each(EXPECTED_CODES)("%s.food is a non-empty array of strings", (code) => {
    const { food } = countriesData[code];
    expect(Array.isArray(food)).toBe(true);
    expect(food.length).toBeGreaterThanOrEqual(1);
    food.forEach((item) => expect(typeof item).toBe("string"));
  });

  test.each(EXPECTED_CODES)("%s.food has at least 4 items", (code) => {
    expect(countriesData[code].food.length).toBeGreaterThanOrEqual(4);
  });

  test.each(EXPECTED_CODES)("%s.dress is a non-empty string", (code) => {
    const { dress } = countriesData[code];
    expect(typeof dress).toBe("string");
    expect(dress.trim().length).toBeGreaterThan(0);
  });

  test.each(EXPECTED_CODES)("%s.festivals is a non-empty array of strings", (code) => {
    const { festivals } = countriesData[code];
    expect(Array.isArray(festivals)).toBe(true);
    expect(festivals.length).toBeGreaterThanOrEqual(1);
    festivals.forEach((item) => expect(typeof item).toBe("string"));
  });

  test.each(EXPECTED_CODES)("%s.festivals has at least 3 items", (code) => {
    expect(countriesData[code].festivals.length).toBeGreaterThanOrEqual(3);
  });

  test.each(EXPECTED_CODES)("%s.famousPlaces is a non-empty array of strings", (code) => {
    const { famousPlaces } = countriesData[code];
    expect(Array.isArray(famousPlaces)).toBe(true);
    expect(famousPlaces.length).toBeGreaterThanOrEqual(1);
    famousPlaces.forEach((item) => expect(typeof item).toBe("string"));
  });

  test.each(EXPECTED_CODES)("%s.famousPlaces has at least 4 items", (code) => {
    expect(countriesData[code].famousPlaces.length).toBeGreaterThanOrEqual(4);
  });

  test.each(EXPECTED_CODES)("%s.funFact is a non-empty string", (code) => {
    const { funFact } = countriesData[code];
    expect(typeof funFact).toBe("string");
    expect(funFact.trim().length).toBeGreaterThan(10);
  });
});

// ─── Data quality checks ─────────────────────────────────────────────────────

describe("countries.json — data quality", () => {
  test("no country has an empty food item", () => {
    for (const [code, data] of Object.entries(countriesData)) {
      data.food.forEach((item) => {
        if (item.trim().length === 0) throw new Error(`${code}.food contains empty string`);
      });
    }
  });

  test("no country has an empty festival name", () => {
    for (const [code, data] of Object.entries(countriesData)) {
      data.festivals.forEach((item) => {
        if (item.trim().length === 0) throw new Error(`${code}.festivals contains empty string`);
      });
    }
  });

  test("no country has an empty famous place", () => {
    for (const [code, data] of Object.entries(countriesData)) {
      data.famousPlaces.forEach((item) => {
        if (item.trim().length === 0) throw new Error(`${code}.famousPlaces contains empty string`);
      });
    }
  });

  test("no duplicate food items within any country", () => {
    for (const [code, data] of Object.entries(countriesData)) {
      const unique = new Set(data.food.map((f) => f.toLowerCase()));
      if (unique.size !== data.food.length) throw new Error(`${code} has duplicate food items`);
    }
  });

  test("no duplicate festival names within any country", () => {
    for (const [code, data] of Object.entries(countriesData)) {
      const unique = new Set(data.festivals.map((f) => f.toLowerCase()));
      if (unique.size !== data.festivals.length) throw new Error(`${code} has duplicate festival entries`);
    }
  });

  test("no duplicate famous places within any country", () => {
    for (const [code, data] of Object.entries(countriesData)) {
      const unique = new Set(data.famousPlaces.map((p) => p.toLowerCase()));
      if (unique.size !== data.famousPlaces.length) throw new Error(`${code} has duplicate famousPlaces entries`);
    }
  });

  test("all country codes are exactly 2 uppercase letters", () => {
    const codeRegex = /^[A-Z]{2}$/;
    for (const code of Object.keys(countriesData)) {
      if (!codeRegex.test(code)) throw new Error(`Invalid ISO code: ${code}`);
    }
  });

  test("funFact for each country is unique", () => {
    const facts = Object.values(countriesData).map((c) => c.funFact);
    const uniqueFacts = new Set(facts);
    expect(uniqueFacts.size).toBe(facts.length);
  });

  test("dress field for each country is unique (no copy-paste)", () => {
    const dresses = Object.values(countriesData).map((c) => c.dress);
    const uniqueDresses = new Set(dresses);
    expect(uniqueDresses.size).toBe(dresses.length);
  });
});

// ─── Spot-check specific country data ────────────────────────────────────────

describe("countries.json — spot checks", () => {
  test("MM (Myanmar) includes Mohinga in food", () => {
    expect(countriesData.MM.food).toContain("Mohinga");
  });

  test("MM (Myanmar) includes Shwedagon Pagoda in famousPlaces", () => {
    expect(countriesData.MM.famousPlaces).toContain("Shwedagon Pagoda");
  });

  test("MM (Myanmar) includes Thingyan Water Festival in festivals", () => {
    expect(countriesData.MM.festivals).toContain("Thingyan Water Festival");
  });

  test("JP (Japan) includes Sushi in food", () => {
    expect(countriesData.JP.food).toContain("Sushi");
  });

  test("JP (Japan) includes Mount Fuji in famousPlaces", () => {
    expect(countriesData.JP.famousPlaces).toContain("Mount Fuji");
  });

  test("IN (India) includes Taj Mahal in famousPlaces", () => {
    expect(countriesData.IN.famousPlaces).toContain("Taj Mahal");
  });

  test("IN (India) includes Diwali in festivals", () => {
    expect(countriesData.IN.festivals).toContain("Diwali");
  });

  test("CN (China) includes Dim Sum in food", () => {
    expect(countriesData.CN.food).toContain("Dim Sum");
  });

  test("CN (China) includes Great Wall of China in famousPlaces", () => {
    expect(countriesData.CN.famousPlaces).toContain("Great Wall of China");
  });

  test("US (United States) includes Grand Canyon in famousPlaces", () => {
    expect(countriesData.US.famousPlaces).toContain("Grand Canyon");
  });

  test("FR (France) includes Eiffel Tower in famousPlaces", () => {
    expect(countriesData.FR.famousPlaces).toContain("Eiffel Tower");
  });

  test("EG (Egypt) includes Pyramids of Giza in famousPlaces", () => {
    expect(countriesData.EG.famousPlaces).toContain("Pyramids of Giza");
  });

  test("BR (Brazil) includes Rio Carnival in festivals", () => {
    expect(countriesData.BR.festivals).toContain("Rio Carnival");
  });

  test("NP (Nepal) includes Mount Everest in famousPlaces", () => {
    expect(countriesData.NP.famousPlaces).toContain("Mount Everest");
  });

  test("KH (Cambodia) includes Angkor Wat in famousPlaces", () => {
    expect(countriesData.KH.famousPlaces).toContain("Angkor Wat");
  });

  test("TH (Thailand) includes Pad Thai in food", () => {
    expect(countriesData.TH.food).toContain("Pad Thai");
  });

  test("KR (South Korea) includes Kimchi in food", () => {
    expect(countriesData.KR.food).toContain("Kimchi");
  });

  test("IT (Italy) includes Neapolitan Pizza in food", () => {
    expect(countriesData.IT.food).toContain("Neapolitan Pizza");
  });

  test("AE (UAE) includes Burj Khalifa in famousPlaces", () => {
    expect(countriesData.AE.famousPlaces).toContain("Burj Khalifa");
  });

  test("PE (Peru) includes Machu Picchu in famousPlaces", () => {
    expect(countriesData.PE.famousPlaces).toContain("Machu Picchu");
  });
});
