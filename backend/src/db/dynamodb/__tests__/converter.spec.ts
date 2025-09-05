import { convertFromDdbMap, convertToDdbMap } from "../converter";

describe("DynamoDB Converter", () => {
  it("should convert a JavaScript object to a DynamoDB object", () => {
    const json = {
      id: "123",
      name: "test",
      age: 20,
      address: {
        street: "123 Main St",
        city: "Seattle",
        state: "WA",
        zip: 98101,
      },
      colours: ["red", "green"],
    };

    const dynamo = {
      id: {
        S: "123",
      },
      name: {
        S: "test",
      },
      age: {
        N: "20",
      },
      address: {
        M: {
          street: {
            S: "123 Main St",
          },
          city: {
            S: "Seattle",
          },
          state: {
            S: "WA",
          },
          zip: {
            N: "98101",
          },
        },
      },
      colours: {
        L: [
          {
            S: "red",
          },
          {
            S: "green",
          },
        ],
      },
    };

    expect(convertToDdbMap(json)).toEqual(dynamo);
  });

  it("should convert a DynamoDB object to a JavaScript object", () => {
    const dynamo = {
      id: {
        S: "123",
      },
      name: {
        S: "test",
      },
      age: {
        N: "20",
      },
      address: {
        M: {
          street: {
            S: "123 Main St",
          },
          city: {
            S: "Seattle",
          },
          state: {
            S: "WA",
          },
          zip: {
            N: "98101",
          },
        },
      },
      colours: {
        L: [
          {
            S: "red",
          },
          {
            S: "green",
          },
        ],
      },
    };

    const json = {
      id: "123",
      name: "test",
      age: 20,
      address: {
        street: "123 Main St",
        city: "Seattle",
        state: "WA",
        zip: 98101,
      },
      colours: ["red", "green"],
    };

    expect(convertFromDdbMap(dynamo)).toEqual(json);
  });
});
