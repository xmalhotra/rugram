export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Never display proxy HTML or server stack traces to the member. */
export async function readApiResponse<T>(response: Response): Promise<T> {
  const reference = response.headers
    .get('X-Request-Id')
    ?.replace(/[^a-zA-Z0-9_.:-]/g, '')
    .slice(0, 100);
  const text = await response.text();
  let value: unknown;
  try {
    value = text ? JSON.parse(text) : null;
  } catch {
    value = null;
  }
  if (!response.ok) {
    const detail =
      value && typeof value === 'object' && 'error' in value && typeof value.error === 'string'
        ? value.error.slice(0, 500)
        : undefined;
    const message =
      response.status === 401
        ? 'Session expired, please sign in again.'
        : response.status >= 500
          ? 'Could not connect to the service. Please try again.'
          : (detail ?? 'Could not complete this request. Please try again.');
    throw new ApiError(
      `${message}${reference ? ` Reference: ${reference}` : ''}`,
      response.status,
      reference,
    );
  }
  if (response.status === 204) return undefined as T;
  if (value === null)
    throw new ApiError(
      'The service returned an unexpected response. Please try again.',
      response.status,
      reference,
    );
  return value as T;
}
