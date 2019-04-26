import { PushNotifications } from "./push-notifications";

beforeEach(() => {
  jest.resetModules();
});

test("PushNotifications", () => {
  expect(typeof PushNotifications).toBe("function");
});

test("It will throw if there is no config object given", () => {
  expect(() => new PushNotifications()).toThrow("Config object required");
});

test("It will throw if there is no instance ID specified", () => {
  expect(() => new PushNotifications({})).toThrow("Instance ID is required");
});

test("It will throw if instance ID is not a string", () => {
  const instanceId = null;
  expect(() => new PushNotifications({ instanceId })).toThrow(
    "Instance ID must be a string"
  );
});

test("It will throw if the instance id is the empty string", () => {
  const instanceId = "";
  expect(() => new PushNotifications({ instanceId })).toThrow(
    "Instance ID cannot be empty"
  );
});

describe("Beams", () => {
  beforeAll(async () => {
    await page.goto("http://localhost:3000/");
  });

  it('should be titled "Beams"', async () => {
    await expect(page.title()).resolves.toMatch("Beams");
  });

  it("should register the device", async () => {
    const result = await page.evaluate(() => {
      var beamsClient = new PusherPushNotifications.PushNotifications({
        instanceId: "deadc0de-2ce6-46e3-ad9a-5c02d0ab119b"
      });

      return beamsClient.start().then(() => {
        return beamsClient.deviceId;
      });
    });

    console.log("hello", result);
  });
});
