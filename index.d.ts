declare module '@pusher/push-notifications-web' {
  export interface TokenProviderResponse {
    token: string;
  }
  export interface ITokenProvider {
    fetchToken(userId: string): Promise<TokenProviderResponse>;
  }

  interface TokenProviderOptions {
    url: string;
    queryParams?: { [key: string]: any };
    headers?: { [key: string]: string };
    credentials?: string;
  }

  class TokenProvider implements ITokenProvider {
    constructor(options: TokenProviderOptions);
    fetchToken(userId: string): Promise<TokenProviderResponse>;
  }

  enum RegistrationState {
    PERMISSION_GRANTED_REGISTERED_WITH_BEAMS = 'PERMISSION_GRANTED_REGISTERED_WITH_BEAMS',
    PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS = 'PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS',
    PERMISSION_PROMPT_REQUIRED = 'PERMISSION_PROMPT_REQUIRED',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
  }

  class PushNotificationsInstance {
    instanceId: string;
    deviceId: string;
    userId: string;

    start(): Promise<PushNotificationsInstance>;
    addDeviceInterest(interest: string): Promise<undefined>;
    removeDeviceInterest(interest: string): Promise<undefined>;
    getDeviceInterests(): Promise<Array<string>>;
    setDeviceInterests(interests: Array<string>): Promise<undefined>;
    clearDeviceInterests(): Promise<undefined>;
    setUserId(
      userId: string,
      tokenProvider: ITokenProvider
    ): Promise<undefined>;
    stop(): Promise<undefined>;
    clearAllState(): Promise<undefined>;
    getRegistrationState(): Promise<RegistrationState>;
  }

  interface InitOptions {
    instanceId: string;
    serviceWorkerRegistration?: ServiceWorkerRegistration;
    endpointOverride?: string;
  }

  export function init(
    options: InitOptions
  ): Promise<PushNotificationsInstance>;
}
