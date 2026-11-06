/** Format of a MongoDB ObjectId as it appears in URLs and request bodies. */
export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const OBJECT_ID_EXAMPLE = '6730f1c2b0e7a52d7e9b8a0c';
export const OBJECT_ID_FORMAT_HINT =
  'expected a MongoDB ObjectId: 24 hexadecimal characters (0-9, a-f), e.g. ' +
  OBJECT_ID_EXAMPLE;

export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}
