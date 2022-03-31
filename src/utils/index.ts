import moment from 'moment-timezone';
import { JsonResult } from '../types';

export function capitalizeFirstLetter(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/**
 * Returns a JS object representation of a Javascript Web Token from its common encoded
 * string form.
 *
 * @template T the expected shape of the parsed token
 * @param {string} token a Javascript Web Token in base64 encoded, `.` separated form
 * @returns {(T | undefined)} an object-representation of the token
 * or undefined if parsing failed
 */
export function getParsedJwt<T = JsonResult>(
  token?: string,
): T | undefined {
  try {
    return token ? JSON.parse(atob(token.split('.')[1])) : undefined;
  } catch {
    return undefined;
  }
}

export const queryFilterParams = (queryParams: Record<string, string>): Record<string, string> => {
  const params = Object.entries(queryParams);
  const newParams: { [key: string]: string; } = {};

  params.forEach(([key, value]) => {
    if (value) {
      newParams[key] = value.toString();
    }
  });

  return newParams;
};

export const getBase64 = (file: Blob): Promise<unknown> => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
});

export const generateRandomString = (): string => Math.random().toString(36).substring(2, 8);

export const getTimeZoneName = (): string => moment.tz.guess(true);

export const arrayEquals = (a: unknown[], b: unknown[]): boolean => {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    const sortedA = a.sort((prev, next) => prev < next ? 1 : -1);
    const sortedB = b.sort((prev, next) => prev < next ? 1 : -1);

    return sortedA.every((val, index) => val === sortedB[index]);
  }

  return false;
};
