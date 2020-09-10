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

export class TokenProvider implements ITokenProvider {
  constructor(options: TokenProviderOptions);
  fetchToken(userId: string): Promise<TokenProviderResponse>;
}

export enum RegistrationState {
  PERMISSION_GRANTED_REGISTERED_WITH_BEAMS = 'PERMISSION_GRANTED_REGISTERED_WITH_BEAMS',
  PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS = 'PERMISSION_GRANTED_NOT_REGISTERED_WITH_BEAMS',
  PERMISSION_PROMPT_REQUIRED = 'PERMISSION_PROMPT_REQUIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export class Client {
  instanceId: string;
  deviceId: string;
  userId: string;

  constructor(options: ClientOptions);

  start(): Promise<undefined>;
  getDeviceId(): Promise<string>;
  addDeviceInterest(interest: string): Promise<undefined>;
  removeDeviceInterest(interest: string): Promise<undefined>;
  getDeviceInterests(): Promise<Array<string>>;
  setDeviceInterests(interests: Array<string>): Promise<undefined>;
  clearDeviceInterests(): Promise<undefined>;
  getUserId(): Promise<string>;
  setUserId(userId: string, tokenProvider: ITokenProvider): Promise<undefined>;
  stop(): Promise<undefined>;
  clearAllState(): Promise<undefined>;
  getRegistrationState(): Promise<RegistrationState>;
}

interface ClientOptions {
  instanceId: string;
  serviceWorkerRegistration?: ServiceWorkerRegistration;
  endpointOverride?: string;
}
