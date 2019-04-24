import PushNotifications from "./push-notifications";

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
