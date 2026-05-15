import { FakeMessageQueue, FakeJob, JobStatus } from "./fake-message-queue";

describe("FakeMessageQueue", () => {
  let queue: FakeMessageQueue;

  beforeEach(() => {
    queue = new FakeMessageQueue("test-queue");
  });

  describe("add / getJobs", () => {
    it("should add a job with waiting status", async () => {
      const job = await queue.add({ task: "test" });
      expect(job.id).toBeDefined();
      expect(job.data).toEqual({ task: "test" });
      expect(job.status).toBe("waiting");
      expect(job.attemptsMade).toBe(0);
    });

    it("should return all jobs sorted by status", async () => {
      await queue.add({ task: "A" });
      await queue.add({ task: "B" });
      const allJobs = queue.getJobs();
      expect(allJobs).toHaveLength(2);
    });

    it("should filter jobs by status", async () => {
      const processor = jest.fn().mockResolvedValue("done");
      queue.process(processor);
      await queue.add({ task: "A" });
      await queue.add({ task: "B" });
      await queue.waitForCompletion(2000);
      const waitingJobs = queue.getJobs("waiting");
      const completedJobs = queue.getJobs("completed");
      expect(waitingJobs).toHaveLength(0);
      expect(completedJobs).toHaveLength(2);
    });

    it("should get a specific job by id", async () => {
      const job = await queue.add({ task: "find-me" });
      const found = queue.getJob(job.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(job.id);
    });

    it("should return undefined for nonexistent job", () => {
      expect(queue.getJob("nonexistent")).toBeUndefined();
    });
  });

  describe("process", () => {
    it("should process jobs through the registered handler", async () => {
      const processor = jest.fn().mockResolvedValue("done");
      queue.process(processor);

      const job = await queue.add({ task: "process-me" });
      await queue.waitForCompletion(1000);

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith(
        expect.objectContaining({ data: { task: "process-me" } }),
      );
      const processed = queue.getJob(job.id);
      expect(processed!.status).toBe("completed");
    });

    it("should mark job as failed when processor throws", async () => {
      const processor = jest
        .fn()
        .mockRejectedValue(new Error("processing error"));
      queue.process(processor);

      await queue.add({ task: "fail-me" });
      await queue.waitForCompletion(1000);

      const jobs = queue.getJobs("failed");
      expect(jobs).toHaveLength(1);
      expect(jobs[0].failedReason).toBe("processing error");
    });
  });

  describe("waitForCompletion", () => {
    it("should resolve when all jobs complete", async () => {
      const processor = jest.fn().mockResolvedValue("done");
      queue.process(processor);

      await queue.add({ task: "A" });
      await queue.add({ task: "B" });

      const start = Date.now();
      await queue.waitForCompletion(5000);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000);
      expect(queue.getJobs("completed")).toHaveLength(2);
    });
  });

  describe("clear", () => {
    it("should remove all jobs", async () => {
      await queue.add({ task: "A" });
      await queue.add({ task: "B" });
      queue.clear();
      expect(queue.getJobs()).toHaveLength(0);
    });
  });

  describe("pause / resume", () => {
    it("should not process jobs while paused", async () => {
      const processor = jest.fn().mockResolvedValue("done");
      queue.process(processor);
      await queue.pause();

      await queue.add({ task: "A" });
      // After a short wait, processor should NOT have been called
      await new Promise((r) => setTimeout(r, 100));
      expect(processor).not.toHaveBeenCalled();
    });

    it("should process queued jobs after resume", async () => {
      const processor = jest.fn().mockResolvedValue("done");
      queue.process(processor);
      await queue.pause();
      await queue.add({ task: "A" });
      await queue.resume();

      await queue.waitForCompletion(1000);
      expect(processor).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle jobs with no processor gracefully", async () => {
      const job = await queue.add({ task: "orphan" });
      // Should not throw — jobs just stay in 'waiting' status
      expect(job.status).toBe("waiting");
    });

    it("should handle add with delayed option", async () => {
      const job = await queue.add({ task: "delayed" }, { delay: 500 });
      expect(job.status).toBe("delayed");
    });
  });
});
