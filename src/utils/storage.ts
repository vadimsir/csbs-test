// version 2.0

import { JsonResult } from '../types';

export function getDataInStorage(name: string): JsonResult {
  try {
    return JSON.parse(localStorage.getItem(name) || '{}');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`localStorage: ${name}`, err);
  }

  return {};
}

export function getDataInSessionStorage(name: string): JsonResult {
  try {
    return JSON.parse(sessionStorage.getItem(name) || '{}');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`sessionStorage: ${name}`, err);
  }

  return {};
}

export function setDataInStorage(
  name: string,
  data: JsonResult,
  marge = false,
): void {
  let newData = data;

  if (marge) {
    const oldData = getDataInStorage(name);

    newData = { ...oldData, ...data };
  }

  let str = '';

  try {
    str = JSON.stringify(newData);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`localStorage: ${name}`, e);
  }

  localStorage.setItem(name, str);
}

export function setDataInSessionStorage(
  name: string,
  data: JsonResult,
  marge = false,
): void {
  let newData = data;

  if (marge) {
    const oldData = getDataInSessionStorage(name);

    newData = { ...oldData, ...data };
  }

  let str = '';

  try {
    str = JSON.stringify(newData);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`sessionStorage: ${name}`, e);
  }

  sessionStorage.setItem(name, str);
}

export default {
  getDataInStorage,
  getDataInSessionStorage,
  setDataInStorage,
  setDataInSessionStorage,
};
