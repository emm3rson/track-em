import { evaluateAmountExpression } from "./amountExpression";

const MUST_START_WITH_EQUALS = "Expression must start with =.";
const INVALID_EXPRESSION_MESSAGE = "Enter a valid expression (e.g. =10+5).";
const DIVIDE_BY_ZERO_MESSAGE = "Expression cannot divide by zero.";

const roundToCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

describe("evaluateAmountExpression", () => {
  describe("must-start-with-= gate", () => {
    it('rejects "10+5" without leading =', () => {
      expect(evaluateAmountExpression("10+5")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
    });

    it("rejects empty string without leading =", () => {
      expect(evaluateAmountExpression("")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
    });

    it("rejects whitespace-only input without leading =", () => {
      expect(evaluateAmountExpression("   ")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
    });

    it('rejects "1+1=" (does not start with =)', () => {
      expect(evaluateAmountExpression("1+1=")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
    });

    it('rejects "()" (does not start with =)', () => {
      expect(evaluateAmountExpression("()")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
    });

    it("rejects plain numbers without leading =", () => {
      expect(evaluateAmountExpression("42")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
    });

    it("rejects parenthesized expression without leading =", () => {
      expect(evaluateAmountExpression("(2+3)*4")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
    });

    it("accepts leading/trailing whitespace around a valid expression", () => {
      expect(evaluateAmountExpression("  =10+5  ")).toEqual({ ok: true, value: 15 });
    });
  });

  describe("empty expression after =", () => {
    it('rejects "=" with invalid expression message', () => {
      expect(evaluateAmountExpression("=")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it('rejects "=   " with invalid expression message', () => {
      expect(evaluateAmountExpression("=   ")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it('rejects "   =   " (only whitespace after =)', () => {
      expect(evaluateAmountExpression("   =   ")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });
  });

  describe("basic operations", () => {
    it.each([
      ["=10+5", 15],
      ["=10-4", 6],
      ["=3*4", 12],
      ["=8/2", 4],
      ["=2+3*4", 14],
      ["=(2+3)*4", 20],
      ["=10-2-3", 5],
      ["=100/4/5", 5],
    ])("%s evaluates to %s", (input, expected) => {
      expect(evaluateAmountExpression(input)).toEqual({ ok: true, value: expected });
    });

    it("respects * over + without parens", () => {
      expect(evaluateAmountExpression("=2+3*4")).toEqual({ ok: true, value: 14 });
    });

    it("respects left-associativity for subtraction", () => {
      // (10-2)-3 = 5, not 10-(2-3) = 11
      expect(evaluateAmountExpression("=10-2-3")).toEqual({ ok: true, value: 5 });
    });

    it("respects left-associativity for division", () => {
      // (100/4)/5 = 5, not 100/(4/5) = 125
      expect(evaluateAmountExpression("=100/4/5")).toEqual({ ok: true, value: 5 });
    });

    it("mixes all four operators", () => {
      // 2 + 6/2 - 1 = 4
      expect(evaluateAmountExpression("=2+6/2-1")).toEqual({ ok: true, value: 4 });
    });

    it("evaluates nested parens", () => {
      expect(evaluateAmountExpression("=((2+3)*4)")).toEqual({ ok: true, value: 20 });
      expect(evaluateAmountExpression("=(1+(2*3))")).toEqual({ ok: true, value: 7 });
    });

    it("evaluates a single number", () => {
      expect(evaluateAmountExpression("=42")).toEqual({ ok: true, value: 42 });
    });
  });

  describe("whitespace handling", () => {
    it('evaluates "=  10 +  5 " to 15', () => {
      expect(evaluateAmountExpression("=  10 +  5 ")).toEqual({ ok: true, value: 15 });
    });

    it('evaluates "=( 2 + 3 ) * 4" to 20', () => {
      expect(evaluateAmountExpression("=( 2 + 3 ) * 4")).toEqual({ ok: true, value: 20 });
    });

    it("ignores tabs between tokens", () => {
      expect(evaluateAmountExpression("=\t10\t+\t5\t")).toEqual({ ok: true, value: 15 });
    });
  });

  describe("unary plus/minus", () => {
    it.each([
      ["=-5+10", 5],
      ["=+5", 5],
      ["=--5", 5],
      ["=-(2+3)", -5],
    ])("%s evaluates to %s", (input, expected) => {
      expect(evaluateAmountExpression(input)).toEqual({ ok: true, value: expected });
    });

    it("handles unary minus on parens with whitespace", () => {
      expect(evaluateAmountExpression("= - ( 2 + 3 )")).toEqual({ ok: true, value: -5 });
    });

    it("handles double negation of parens", () => {
      expect(evaluateAmountExpression("=--(2+3)")).toEqual({ ok: true, value: 5 });
    });

    it("handles unary plus before parens", () => {
      expect(evaluateAmountExpression("=+(2+3)")).toEqual({ ok: true, value: 5 });
    });

    it("handles unary minus before multiplication operand", () => {
      expect(evaluateAmountExpression("=5*-2")).toEqual({ ok: true, value: -10 });
    });
  });

  describe("decimals and currency rounding", () => {
    it('evaluates "=10.5+0.25" to 10.75', () => {
      expect(evaluateAmountExpression("=10.5+0.25")).toEqual({ ok: true, value: 10.75 });
    });

    it('rounds "=0.1+0.2" to 0.3', () => {
      expect(evaluateAmountExpression("=0.1+0.2")).toEqual({ ok: true, value: 0.3 });
    });

    it('rounds "=10/3" to 3.33', () => {
      expect(evaluateAmountExpression("=10/3")).toEqual({ ok: true, value: 3.33 });
    });

    it("rounds =2.675 via currency rounding formula", () => {
      const expected = Math.round((2.675 + Number.EPSILON) * 100) / 100;
      expect(evaluateAmountExpression("=2.675")).toEqual({ ok: true, value: expected });
      // Document the actual value produced by the implementation.
      expect(expected).toBe(2.68);
    });

    it("rounds repeating decimals via currency rounding formula", () => {
      const expected = roundToCurrency(2 / 3);
      expect(evaluateAmountExpression("=2/3")).toEqual({ ok: true, value: expected });
      expect(expected).toBe(0.67);
    });
  });

  describe("divide by zero", () => {
    it('rejects "=5/0" with divide-by-zero message', () => {
      expect(evaluateAmountExpression("=5/0")).toEqual({
        ok: false,
        error: DIVIDE_BY_ZERO_MESSAGE,
      });
    });

    it('rejects "=5/(2-2)" with divide-by-zero message', () => {
      expect(evaluateAmountExpression("=5/(2-2)")).toEqual({
        ok: false,
        error: DIVIDE_BY_ZERO_MESSAGE,
      });
    });

    it('evaluates "=0/5" to 0', () => {
      expect(evaluateAmountExpression("=0/5")).toEqual({ ok: true, value: 0 });
    });

    it("rejects division by a zero-valued sub-expression with whitespace", () => {
      expect(evaluateAmountExpression("=10 / ( 5 - 5 )")).toEqual({
        ok: false,
        error: DIVIDE_BY_ZERO_MESSAGE,
      });
    });

    it("uses the exact divide-by-zero message string", () => {
      const result = evaluateAmountExpression("=1/0");
      expect(result).toEqual({ ok: false, error: "Expression cannot divide by zero." });
    });
  });

  describe("invalid expressions", () => {
    it.each([
      ["=abc"],
      ["=10+"],
      ["=*5"],
      ["=(2+3"],
      ["=2+3)"],
      ["=10..5"],
      ["=="],
      ["=+/*"],
      ["=10+5abc"],
      ["=()"],
      ["="],
      ["=   "],
      ["=2++"],
      ["=)"],
      ["=("],
      ["=5 5"],
      ["=..5"],
      ["=."],
    ])("rejects %s with invalid expression message", (input) => {
      expect(evaluateAmountExpression(input)).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it('rejects "=10..5" (double decimal point)', () => {
      expect(evaluateAmountExpression("=10..5")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it('rejects "==" (lone operator after =)', () => {
      expect(evaluateAmountExpression("==")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it('rejects "=+/*" (operators without operands)', () => {
      expect(evaluateAmountExpression("=+/*")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it('rejects "=10+5abc" (trailing garbage)', () => {
      expect(evaluateAmountExpression("=10+5abc")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it('rejects "=10+5 " with trailing letters as invalid, but trailing spaces are fine', () => {
      expect(evaluateAmountExpression("=10+5abc")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
      expect(evaluateAmountExpression("=10+5   ")).toEqual({ ok: true, value: 15 });
    });

    it('rejects "=()" (empty parens)', () => {
      expect(evaluateAmountExpression("=()")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it('rejects "=( )" (whitespace-only parens)', () => {
      expect(evaluateAmountExpression("=( )")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it("uses the exact invalid-expression message string", () => {
      const result = evaluateAmountExpression("=abc");
      expect(result).toEqual({
        ok: false,
        error: "Enter a valid expression (e.g. =10+5).",
      });
    });
  });

  describe("negative results", () => {
    it('evaluates "=5-10" to -5', () => {
      expect(evaluateAmountExpression("=5-10")).toEqual({ ok: true, value: -5 });
    });

    it("allows negative parenthesized results", () => {
      expect(evaluateAmountExpression("=(5-10)*2")).toEqual({ ok: true, value: -10 });
    });
  });

  describe("large values and scale", () => {
    it('evaluates "=999999*999999" to a finite rounded value', () => {
      const expected = roundToCurrency(999999 * 999999);
      const result = evaluateAmountExpression("=999999*999999");
      expect(result).toEqual({ ok: true, value: expected });
      expect(expected).toBe(999998000001);
      if (result.ok) {
        expect(Number.isFinite(result.value)).toBe(true);
      } else {
        throw new Error("expected =999999*999999 to succeed");
      }
    });

    it("rounds =0.005 via currency rounding formula", () => {
      const expected = Math.round((0.005 + Number.EPSILON) * 100) / 100;
      expect(evaluateAmountExpression("=0.005")).toEqual({ ok: true, value: expected });
      // Document the actual value produced by the implementation.
      expect(expected).toBe(0.01);
    });

    it("handles small fractional multiplication with rounding", () => {
      const expected = roundToCurrency(0.1 * 0.2);
      expect(evaluateAmountExpression("=0.1*0.2")).toEqual({ ok: true, value: expected });
      expect(expected).toBe(0.02);
    });
  });

  describe("injection safety (no eval)", () => {
    it.each([
      ["=process.exit(1)"],
      ["=process.exit"],
      ["=__proto__"],
      ["=constructor"],
      ["=Math.max(1,2)"],
      ["=10;process.exit(1)"],
      ["=globalThis"],
      ['=10+alert("x")'],
    ])("rejects %s as invalid without executing it", (input) => {
      expect(evaluateAmountExpression(input)).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it("does not execute code via function-call syntax", () => {
      const probe = jest.fn();
      void probe;
      expect(evaluateAmountExpression("=process.exit(1)")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
      expect(evaluateAmountExpression("=2+2;process.exit(1)")).toEqual({
        ok: false,
        error: INVALID_EXPRESSION_MESSAGE,
      });
    });

    it("rejects bare injection strings at the gate", () => {
      expect(evaluateAmountExpression("process.exit(1)")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
      expect(evaluateAmountExpression("__proto__")).toEqual({
        ok: false,
        error: MUST_START_WITH_EQUALS,
      });
    });
  });

  describe("result shapes and exact messages", () => {
    it("returns exactly { ok: true, value } on success", () => {
      const result = evaluateAmountExpression("=10+5");
      expect(result).toEqual({ ok: true, value: 15 });
      expect(Object.keys(result).sort()).toEqual(["ok", "value"]);
    });

    it("returns exactly { ok: false, error } on invalid input", () => {
      const result = evaluateAmountExpression("=abc");
      expect(result).toEqual({ ok: false, error: INVALID_EXPRESSION_MESSAGE });
      expect(Object.keys(result).sort()).toEqual(["error", "ok"]);
    });

    it("returns exactly { ok: false, error } on divide by zero", () => {
      const result = evaluateAmountExpression("=5/0");
      expect(result).toEqual({ ok: false, error: DIVIDE_BY_ZERO_MESSAGE });
      expect(Object.keys(result).sort()).toEqual(["error", "ok"]);
    });

    it("exposes the three documented message strings", () => {
      expect(MUST_START_WITH_EQUALS).toBe("Expression must start with =.");
      expect(INVALID_EXPRESSION_MESSAGE).toBe("Enter a valid expression (e.g. =10+5).");
      expect(DIVIDE_BY_ZERO_MESSAGE).toBe("Expression cannot divide by zero.");
      expect(evaluateAmountExpression("10+5")).toEqual({
        ok: false,
        error: "Expression must start with =.",
      });
      expect(evaluateAmountExpression("=")).toEqual({
        ok: false,
        error: "Enter a valid expression (e.g. =10+5).",
      });
      expect(evaluateAmountExpression("=5/0")).toEqual({
        ok: false,
        error: "Expression cannot divide by zero.",
      });
    });
  });
});
