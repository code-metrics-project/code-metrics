import { SqsQueue } from "../sqsQueue";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { RawQuery } from "../../../model/query";

jest.mock("@aws-sdk/client-sqs");
jest.mock("../../../config/sources/source", () => ({
  getConfigItem: jest.fn((key: string) => {
    if (key === "ASYNC_QUERY_QUEUE_URL") return "https://sqs.us-east-1.amazonaws.com/123456789/query-queue";
    return undefined;
  }),
}));

describe("SqsQueue", () => {
  const mockSend = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    (SQSClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
    mockSend.mockResolvedValue({});
  });

  it("should send message to SQS on enqueue", async () => {
    const queue = new SqsQueue();
    const query: RawQuery = { queryName: "test", args: {} };

    await queue.enqueue("job-1", query);

    expect(mockSend).toHaveBeenCalledWith(
      expect.any(SendMessageCommand),
    );
  });

  it("should dequeue return null for SQS queue", async () => {
    const queue = new SqsQueue();
    const result = await queue.dequeue();
    expect(result).toBeNull();
  });
});
