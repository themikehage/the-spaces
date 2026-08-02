// SPDX-License-Identifier: MIT

export type CircuitState = "CLOSED" | "OPEN" | "HALF-OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number; // default: 5 consecutive failures
  resetTimeoutMs?: number; // default: 30000 ms (30 sec)
  halfOpenMaxRequests?: number; // default: 1 trial request
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

export class CircuitBreaker {
  public state: CircuitState = "CLOSED";
  private failureCount = 0;
  private nextAttempt = 0;
  private halfOpenSuccesses = 0;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxRequests: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.halfOpenMaxRequests = options.halfOpenMaxRequests ?? 1;
    this.onStateChange = options.onStateChange;
  }

  private transitionTo(newState: CircuitState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      console.warn(`[CircuitBreaker:${this.name}] State transition: ${oldState} -> ${newState}`);
      if (this.onStateChange) {
        this.onStateChange(oldState, newState, this.name);
      }
    }
  }

  public async execute<R>(fn: () => Promise<R>): Promise<R> {
    const now = Date.now();

    if (this.state === "OPEN") {
      if (now >= this.nextAttempt) {
        this.transitionTo("HALF-OPEN");
        this.halfOpenSuccesses = 0;
      } else {
        const remainingSec = Math.ceil((this.nextAttempt - now) / 1000);
        throw new Error(
          `CircuitBreaker [${this.name}] is OPEN. Requests blocked to protect provider. Try again in ${remainingSec}s.`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === "HALF-OPEN") {
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses >= this.halfOpenMaxRequests) {
        this.failureCount = 0;
        this.transitionTo("CLOSED");
      }
    } else if (this.state === "CLOSED") {
      this.failureCount = 0;
    }
  }

  private onFailure(err: unknown) {
    this.failureCount += 1;
    if (this.state === "HALF-OPEN" || this.failureCount >= this.failureThreshold) {
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
      this.transitionTo("OPEN");
    }
  }
}

export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  public get(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker(name, options);
      this.breakers.set(name, breaker);
    }
    return breaker;
  }
}
