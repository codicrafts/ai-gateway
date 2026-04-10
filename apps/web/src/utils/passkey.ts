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

function unwrapPublicKeyOptions(source: any) {
  return source?.publicKey || source?.PublicKey || source?.response || source?.Response || source;
}

export function normalizeRegistrationOptions(source: any): CredentialCreationOptions {
  const options = unwrapPublicKeyOptions(source);
  const publicKey = {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    user: {
      ...options.user,
      id: decodeBase64Url(options.user.id),
    },
    excludeCredentials: Array.isArray(options.excludeCredentials)
      ? options.excludeCredentials.map((item: any) => ({
          ...item,
          id: decodeBase64Url(item.id),
        }))
      : undefined,
  };

  return { publicKey };
}

export function normalizeAuthenticationOptions(source: any): CredentialRequestOptions {
  const options = unwrapPublicKeyOptions(source);
  const publicKey = {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    allowCredentials: Array.isArray(options.allowCredentials)
      ? options.allowCredentials.map((item: any) => ({
          ...item,
          id: decodeBase64Url(item.id),
        }))
      : undefined,
  };

  return { publicKey };
}

export function serializeCredential(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
  const payload: Record<string, unknown> = {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: (credential as PublicKeyCredential & { authenticatorAttachment?: string | null }).authenticatorAttachment ?? null,
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

  payload.clientExtensionResults = credential.getClientExtensionResults?.() ?? {};
  return payload;
}
