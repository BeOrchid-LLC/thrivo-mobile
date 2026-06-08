export const typography = {
  heading1: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 32,
  },
  heading3: {
    fontSize: 20,
    fontWeight: "700" as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
};

export type Typography = typeof typography;
