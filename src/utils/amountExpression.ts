type ExpressionResult = { ok: true; value: number } | { ok: false; error: string };

const INVALID_EXPRESSION_MESSAGE = "Enter a valid expression (e.g. =10+5).";
const DIVIDE_BY_ZERO_MESSAGE = "Expression cannot divide by zero.";
const MUST_START_WITH_EQUALS = "Expression must start with =.";

class ExpressionError extends Error {
  code: "invalid" | "divide_by_zero";

  constructor(code: "invalid" | "divide_by_zero") {
    super(code);
    this.code = code;
  }
}

class ExpressionParser {
  private text: string;
  private index = 0;

  constructor(text: string) {
    this.text = text;
  }

  parse(): number {
    const value = this.parseExpression();
    this.skipWhitespace();
    if (this.index < this.text.length) {
      throw new ExpressionError("invalid");
    }
    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      this.skipWhitespace();
      const op = this.peek();
      if (op === "+" || op === "-") {
        this.index += 1;
        const rhs = this.parseTerm();
        value = op === "+" ? value + rhs : value - rhs;
        continue;
      }
      return value;
    }
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (true) {
      this.skipWhitespace();
      const op = this.peek();
      if (op === "*" || op === "/") {
        this.index += 1;
        const rhs = this.parseFactor();
        if (op === "/" && rhs === 0) {
          throw new ExpressionError("divide_by_zero");
        }
        value = op === "*" ? value * rhs : value / rhs;
        continue;
      }
      return value;
    }
  }

  private parseFactor(): number {
    this.skipWhitespace();
    const ch = this.peek();
    if (ch === "+" || ch === "-") {
      this.index += 1;
      const value = this.parseFactor();
      return ch === "-" ? -value : value;
    }
    if (ch === "(") {
      this.index += 1;
      const value = this.parseExpression();
      this.skipWhitespace();
      if (this.peek() !== ")") {
        throw new ExpressionError("invalid");
      }
      this.index += 1;
      return value;
    }
    return this.parseNumber();
  }

  private parseNumber(): number {
    this.skipWhitespace();
    const start = this.index;
    let hasDigits = false;
    while (this.isDigit(this.peek())) {
      hasDigits = true;
      this.index += 1;
    }
    if (this.peek() === ".") {
      this.index += 1;
      while (this.isDigit(this.peek())) {
        hasDigits = true;
        this.index += 1;
      }
    }
    if (!hasDigits) {
      throw new ExpressionError("invalid");
    }
    const text = this.text.slice(start, this.index);
    const value = Number(text);
    if (!Number.isFinite(value)) {
      throw new ExpressionError("invalid");
    }
    return value;
  }

  private skipWhitespace() {
    while (this.index < this.text.length && /\s/.test(this.text[this.index])) {
      this.index += 1;
    }
  }

  private peek() {
    return this.text[this.index] ?? "";
  }

  private isDigit(value: string) {
    return value >= "0" && value <= "9";
  }
}

const roundToCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function evaluateAmountExpression(input: string): ExpressionResult {
  const trimmed = input.trim();
  if (!trimmed.startsWith("=")) {
    return { ok: false, error: MUST_START_WITH_EQUALS };
  }
  const expression = trimmed.slice(1);
  if (!expression.trim()) {
    return { ok: false, error: INVALID_EXPRESSION_MESSAGE };
  }

  try {
    const parser = new ExpressionParser(expression);
    const result = parser.parse();
    if (!Number.isFinite(result)) {
      return { ok: false, error: INVALID_EXPRESSION_MESSAGE };
    }
    return { ok: true, value: roundToCurrency(result) };
  } catch (error) {
    if (error instanceof ExpressionError && error.code === "divide_by_zero") {
      return { ok: false, error: DIVIDE_BY_ZERO_MESSAGE };
    }
    return { ok: false, error: INVALID_EXPRESSION_MESSAGE };
  }
}
