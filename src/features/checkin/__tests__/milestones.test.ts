import { milestoneFor } from "../utils/milestones";
import { moodResponse } from "../utils/mood-response";

describe("milestoneFor", () => {
  it("celebrates each milestone day", () => {
    for (const days of [3, 7, 14, 30, 60, 100, 365]) {
      expect(milestoneFor(days)?.days).toBe(days);
    }
  });

  it("stays silent on every other day", () => {
    // The day *after* a milestone is the one that matters: a `>=` comparison
    // would re-congratulate the same streak every day from here on.
    for (const days of [0, 1, 2, 4, 8, 15, 31, 101, 366]) {
      expect(milestoneFor(days)).toBeNull();
    }
  });
});

describe("moodResponse", () => {
  it("separates positive, steady and low moods", () => {
    expect(moodResponse("great").tone).toBe("positive");
    expect(moodResponse("good").tone).toBe("positive");
    expect(moodResponse("ok").tone).toBe("steady");
    expect(moodResponse("low").tone).toBe("low");
    expect(moodResponse("bad").tone).toBe("low");
  });

  it("gives every mood its own wording", () => {
    const headings = (["great", "good", "ok", "low", "bad"] as const).map(
      (mood) => moodResponse(mood).heading
    );
    expect(new Set(headings).size).toBe(headings.length);
  });
});
