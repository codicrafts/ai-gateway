function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function encodeBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function browserSupportsPasskey(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined' && !!navigator.credentials;
}

type PasskeyCredentialDescriptor = {
  id: string;
  type?: PublicKeyCredentialType;
  transports?: AuthenticatorTransport[];
};

type PasskeyUserEntity = {
  id: string;
  name?: string;
  displayName?: string;
};

type PasskeyCreationOptions = {
  challenge: string;
  user: PasskeyUserEntity;
  rp: PublicKeyCredentialRpEntity;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  excludeCredentials?: PasskeyCredentialDescriptor[];
  [key: string]: unknown;
};

type PasskeyRequestOptions = {
  challenge: string;
  allowCredentials?: PasskeyCredentialDescriptor[];
  [key: string]: unknown;
};

type PasskeyOptionsEnvelope = {
  publicKey?: PasskeyCreationOptions | PasskeyRequestOptions;
  PublicKey?: PasskeyCreationOptions | PasskeyRequestOptions;
  response?: PasskeyCreationOptions | PasskeyRequestOptions;
  Response?: PasskeyCreationOptions | PasskeyRequestOptions;
};

type PasskeySerializableResponse = {
  clientDataJSON: string;
  attestationObject?: string;
  transports?: string[];
  authenticatorData?: string;
  signature?: string;
  userHandle?: string | null;
};

type PasskeySerializableCredential = {
  id: string;
  rawId: string;
  type: string;
  authenticatorAttachment: string | null;
  response: PasskeySerializableResponse;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
};

function unwrapPublicKeyOptions(
  source: PasskeyOptionsEnvelope | PasskeyCreationOptions | PasskeyRequestOptions
) {
  return source?.publicKey || source?.PublicKey || source?.response || source?.Response || source;
}

function isPasskeyCreationOptions(value: unknown): value is PasskeyCreationOptions {
  const record = value as PasskeyCreationOptions | undefined;
  return Boolean(record && typeof record.challenge === 'string' && record.user && typeof record.user.id === 'string');
}

function isPasskeyRequestOptions(value: unknown): value is PasskeyRequestOptions {
  const record = value as PasskeyRequestOptions | undefined;
  return Boolean(record && typeof record.challenge === 'string');
}

export function normalizeRegistrationOptions(
  source: PasskeyOptionsEnvelope | PasskeyCreationOptions
): CredentialCreationOptions {
  const options = unwrapPublicKeyOptions(source);
  if (!isPasskeyCreationOptions(options)) {
    throw new Error('无法解析 Passkey 注册参数');
  }
  const publicKey = {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    user: {
      ...options.user,
      id: decodeBase64Url(options.user.id),
    },
    excludeCredentials: Array.isArray(options.excludeCredentials)
      ? options.excludeCredentials.map((item) => ({
          ...item,
          id: decodeBase64Url(item.id),
        }))
      : undefined,
  } as PublicKeyCredentialCreationOptions;

  return { publicKey };
}

export function normalizeAuthenticationOptions(
  source: PasskeyOptionsEnvelope | PasskeyRequestOptions
): CredentialRequestOptions {
  const options = unwrapPublicKeyOptions(source);
  if (!isPasskeyRequestOptions(options)) {
    throw new Error('无法解析 Passkey 登录参数');
  }
  const publicKey = {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    allowCredentials: Array.isArray(options.allowCredentials)
      ? options.allowCredentials.map((item) => ({
          ...item,
          id: decodeBase64Url(item.id),
        }))
      : undefined,
  } as PublicKeyCredentialRequestOptions;

  return { publicKey };
}

export function serializeCredential(credential: PublicKeyCredential): PasskeySerializableCredential {
  const response = credential.response as AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
  const payload: PasskeySerializableCredential = {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: (credential as PublicKeyCredential & { authenticatorAttachment?: string | null }).authenticatorAttachment ?? null,
    response: {
      clientDataJSON: '',
    },
    clientExtensionResults: credential.getClientExtensionResults?.() ?? {},
  };

  if ('attestationObject' in response) {
    payload.response = {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      attestationObject: encodeBase64Url(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    };
  } else {
    payload.response = {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      authenticatorData: encodeBase64Url(response.authenticatorData),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
    };
  }

  return payload;
}
