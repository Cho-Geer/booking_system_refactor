import { FakeEventBus, EventRecord } from "./fake-event-bus";

describe("FakeEventBus", () => {
  let bus: FakeEventBus;

  beforeEach(() => {
    bus = new FakeEventBus();
  });

  describe("subscribe / publish", () => {
    it("should deliver published events to subscribers", () => {
      const handler = jest.fn();
      bus.subscribe("room:1", handler);
      bus.publish("room:1", { type: "test", data: "hello" });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "test", data: "hello" }),
      );
    });

    it("should NOT deliver events to subscribers of other rooms", () => {
      const handler = jest.fn();
      bus.subscribe("room:1", handler);
      bus.publish("room:2", { type: "test" });
      expect(handler).not.toHaveBeenCalled();
    });

    it("should support multiple subscribers on the same room", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      bus.subscribe("room:1", handler1);
      bus.subscribe("room:1", handler2);
      bus.publish("room:1", { type: "test" });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should return unsubscribe function that removes the handler", () => {
      const handler = jest.fn();
      const unsubscribe = bus.subscribe("room:1", handler);
      unsubscribe();
      bus.publish("room:1", { type: "test" });
      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle publish with no subscribers gracefully", () => {
      expect(() => {
        bus.publish("empty-room", { type: "test" });
      }).not.toThrow();
    });
  });

  describe("broadcast (wildcard)", () => {
    it("should deliver to rooms matching the wildcard pattern", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      bus.subscribe("user:1", handler1);
      bus.subscribe("user:2", handler2);
      bus.subscribe("admin:1", jest.fn());
      bus.broadcast("user:*", { type: "broadcast" });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should deliver to all rooms when pattern is "*"', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      bus.subscribe("room:a", handler1);
      bus.subscribe("room:b", handler2);
      bus.broadcast("*", { type: "global" });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe("getHistory", () => {
    it("should record published events in history", () => {
      bus.publish("room:1", { type: "A" });
      bus.publish("room:1", { type: "B" });
      const history = bus.getHistory("room:1");
      expect(history).toHaveLength(2);
      expect(history[0].room).toBe("room:1");
      expect(history[0].event).toEqual({ type: "A" });
      expect(history[1].event).toEqual({ type: "B" });
    });

    it("should include timestamp in each event record", () => {
      const before = Date.now();
      bus.publish("room:1", { type: "A" });
      const after = Date.now();
      const history = bus.getHistory("room:1");
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it("should return all history when room is not specified", () => {
      bus.publish("room:1", { type: "A" });
      bus.publish("room:2", { type: "B" });
      const allHistory = bus.getHistory();
      expect(allHistory).toHaveLength(2);
    });

    it("should return empty array for room with no history", () => {
      const history = bus.getHistory("nonexistent");
      expect(history).toEqual([]);
    });
  });

  describe("clearHistory", () => {
    it("should clear all event history", () => {
      bus.publish("room:1", { type: "A" });
      bus.clearHistory();
      expect(bus.getHistory()).toHaveLength(0);
    });
  });

  describe("subscriberCount", () => {
    it("should return correct subscriber count for a room", () => {
      expect(bus.subscriberCount("room:1")).toBe(0);
      bus.subscribe("room:1", jest.fn());
      bus.subscribe("room:1", jest.fn());
      expect(bus.subscriberCount("room:1")).toBe(2);
    });

    it("should return total subscriber count when no room specified", () => {
      bus.subscribe("room:1", jest.fn());
      bus.subscribe("room:2", jest.fn());
      expect(bus.subscriberCount()).toBe(2);
    });
  });

  describe("EventRecord type", () => {
    it("should create valid EventRecord with timestamp", () => {
      bus.publish("test-room", { key: "value" });
      const history = bus.getHistory("test-room");
      const record: EventRecord = history[0];
      expect(record.room).toBe("test-room");
      expect(record.event).toEqual({ key: "value" });
      expect(typeof record.timestamp).toBe("number");
    });
  });
});
