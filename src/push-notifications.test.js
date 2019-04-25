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

test("It will successfully register the device", () => {
  jest.doMock("./doRequest");
  const mockDoRequest = require("./doRequest").default;
  mockDoRequest.mockResolvedValueOnce({ vapidPublicKey: "this-is-vapid-key" });
  mockDoRequest.mockResolvedValueOnce({
    instanceId: "instance-id",
    id: "device-id"
  });

  const mockGetPushToken = jest.fn();
  mockGetPushToken.mockResolvedValueOnce("some-token");

  const sdk = require("./push-notifications");
  const beamsClient = new sdk.PushNotifications({ instanceId: "abcd" });
  beamsClient._getPushToken = mockGetPushToken;

  beamsClient.start().then(() => {
    expect(mockDoRequest).toHaveBeenCalledWith(
      "GET",
      "https://abcd.pushnotifications.pusher.com/device_api/v1/instances/abcd/web-vapid-public-key"
    );

    expect(mockDoRequest).toHaveBeenCalledWith(
      "POST",
      "https://abcd.pushnotifications.pusher.com/device_api/v1/instances/abcd/devices/web",
      { token: "some-token" }
    );
  });
});
