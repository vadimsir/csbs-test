// version: 1.6.7

import { useCallback, useEffect, useRef, useState } from 'react';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuth } from '../contexts/auth';
import { capitalizeFirstLetter } from '../utils';
import { FetchError, FetchSuccess, RequestResult } from '../types';

export interface FetchProps<Data, Params = undefined, DecorateData = Data> {
  fetchCreator: (token?: string, props?: Params, ...args: unknown[]) => Promise<AxiosResponse<Data>>;
  decorateData?: (data: Data) => DecorateData;
  startStateLoading?: boolean;
  multiple?: string;
}

export type DefaultFetchError = FetchError;

export interface DefaultFetch<Data, Error = DefaultFetchError, Params = undefined> extends RequestResult {
  clearError: () => void;
  fetch: (props?: Params) => Promise<Data | null>;
  finish: (data?: Data) => void;
  error: AxiosError<Error> | null;
  response: AxiosResponse<Data> | undefined;
}

export interface FetchHooks<Data, Error = DefaultFetchError, Params = undefined>
  extends DefaultFetch<Data, Error, Params> {
  data?: Data;
}

// eslint-disable-next-line
const cache: { [key: string]: Promise<any> } = {};

export function useFetch<Data, Error = DefaultFetchError, Params = undefined, DecorateData = Data>({
  fetchCreator,
  decorateData,
  startStateLoading = false,
  multiple,
}: FetchProps<Data, Params, DecorateData>): FetchHooks<DecorateData, Error, Params> {
  const live = useRef<boolean>(true);
  const auth = useAuth();
  const [loading, setLoading] = useState(startStateLoading);
  const [error, setError] = useState<AxiosError<Error> | null>(null);
  const [data, setData] = useState<DecorateData>();
  const [response, setResponse] = useState<AxiosResponse<DecorateData> | undefined>();
  const fetch = useCallback(async (params?: Params, ...args: unknown[]): Promise<DecorateData | null> => {
    setError(null);
    setLoading(true);

    if (process.env.REACT_APP_FETCH_DELAY) {
      await new Promise(((resolve) => setTimeout(resolve, parseInt(process.env.REACT_APP_FETCH_DELAY || '0', 10))));
    }

    const checkResponse = async (useReLogin = false) => {
      let promise;

      if (useReLogin && multiple && cache[multiple]) {
        promise = cache[multiple];
      } else {
        promise = fetchCreator(auth.token, params, ...args);

        if (multiple) {
          cache[multiple] = promise;
        }
      }

      let resultPromiseAfterReLogin = null;
      const resultPromise = await promise.then((r) => {
        if (!live.current) {
          return null;
        }

        const result = (decorateData ? decorateData(r.data) : r.data) as DecorateData;

        setData(result);
        setResponse(r);

        return result;
      }).catch(async (e) => {
        if (!live.current) {
          return null;
        }

        // if necessary, change the condition in more detail
        if (useReLogin && e.response?.status === 401) {
          await auth.reLogin();

          resultPromiseAfterReLogin = await checkResponse();

          return null;
        }

        setError(e);

        throw e;
      }).finally(() => {
        if (live.current) {
          setLoading(false);
        }

        if (multiple) {
          delete cache[multiple];
        }
      });

      return resultPromiseAfterReLogin || resultPromise;
    };

    return checkResponse(true);
  }, [auth.token]);

  useEffect(() => () => {
    live.current = false;
  }, []);

  return {
    loading,
    error,
    data,
    fetch,
    finish: (result) => {
      setData(result);
      setLoading(false);
      setError(null);
    },
    clearError: () => setError(null),
    response,
  };
}

export interface FetchGet<Data, Params = undefined, Error = DefaultFetchError>
  extends DefaultFetch<Data, Error, Params> {
  data?: Data;
}

export interface FetchOptions<Data, Params, DecorateData = Data> {
  url?: string;
  authorization?: boolean;
  decorateData?: (data: Data) => DecorateData;
  config?: AxiosRequestConfig;
  params?: Params;
  autoStart?: boolean;
  multiple?: string;
  startStateLoading?: boolean;
}

export type FetchGetOptions<Data, Params, DecorateData = Data> = FetchOptions<Data, Params, DecorateData>;

export function useFetchGet<Data, Error = DefaultFetchError, Params = undefined, DecorateData = Data>(
  path: string,
  options?: FetchGetOptions<Data, Params, DecorateData>,
): FetchGet<DecorateData, Params, Error> {
  const {
    url,
    decorateData,
    config = {},
    params = {},
    autoStart = true,
    authorization = true,
    startStateLoading = true,
    multiple,
  } = options || {};

  const { fetch, ...args } = useFetch<Data, Error, Params, DecorateData>({
    fetchCreator: (token, paramsCreator?: Params) => {
      const headers = {
        ...config?.headers,
      };

      if (authorization) {
        headers.Authorization = `Bearer ${token}`;
      }

      return axios.get<Data>(
        url || `${process.env.REACT_APP_API_URL}/${path}`,
        {
          ...config,
          headers,
          params: {
            ...config?.params,
            ...params,
            ...paramsCreator,
          },
        },
      );
    },
    decorateData,
    startStateLoading,
    multiple,
  });

  useEffect(() => {
    if (autoStart) {
      fetch();
    }
  }, []);

  return {
    ...args,
    fetch,
  };
}

export interface FetchGetId<Data, Error = DefaultFetchError, Params = undefined>
  extends DefaultFetch<Data, Error, Params> {
  data?: Data;
  fetch: (params?: Params, id?: string | number) => Promise<Data | null>;
}

export type FetchGetIdOptions<Data, Params, DecorateData = Data> = FetchOptions<Data, Params, DecorateData>;

export function useFetchGetId<Data, Error = DefaultFetchError, Params = undefined, DecorateData = Data>(
  path: string,
  initialId = '',
  options?: FetchGetIdOptions<Data, Params, DecorateData>,
): FetchGetId<DecorateData, Error, Params> {
  const {
    url,
    decorateData,
    config = {},
    params = {},
    autoStart = true,
    authorization = true,
    startStateLoading = false,
    multiple,
  } = options || {};

  const { fetch, ...args } = useFetch<Data, Error, Params, DecorateData>({
    fetchCreator: (token, paramsCreator?: Params, id = initialId) => {
      const headers = {
        ...config?.headers,
      };

      if (authorization) {
        headers.Authorization = `Bearer ${token}`;
      }

      return axios.get<Data>(
        url || `${process.env.REACT_APP_API_URL}/${path}${id ? `/${id}` : ''}`,
        {
          ...config,
          headers,
          params: {
            ...config?.params,
            ...params,
            ...paramsCreator,
          },
        },
      );
    },
    decorateData,
    startStateLoading,
    multiple,
  });

  useEffect(() => {
    if (autoStart) {
      fetch();
    }
  }, []);

  return {
    ...args,
    fetch,
  };
}

export interface FetchCreate<Data = FetchSuccess, Error = DefaultFetchError, Params = undefined>
  extends DefaultFetch<Data, Error, Params> {
  data?: Data;
  fetch: (formData?: Params, id?: string) => Promise<Data | null>;
}

export type FetchCreateOptions<Data, Params> = FetchOptions<Data, Params>;

export function useFetchCreate<Data, Error, Params>(
  path: string,
  options?: FetchCreateOptions<Data, Params>,
): FetchCreate<Data, Error, Params> {
  const {
    url,
    decorateData,
    config = {},
    params = {},
    authorization = true,
    startStateLoading = false,
  } = options || {};

  return useFetch<Data, Error, Params>({
    fetchCreator: (token, formData?: Params, partUrl = '') => {
      const headers = {
        ...config?.headers,
      };

      if (authorization) {
        headers.Authorization = `Bearer ${token}`;
      }

      return axios.post<Data>(
        url || `${process.env.REACT_APP_API_URL}/${path}${partUrl ? `/${partUrl}` : ''}`,
        formData,
        {
          ...config,
          headers,
          params: {
            ...config?.params,
            ...params,
          },
        },
      );
    },
    decorateData,
    startStateLoading,
  });
}

export interface FetchUpdate<Data, Error = DefaultFetchError, Params = undefined>
  extends DefaultFetch<Data, Error, Params> {
  data?: Data;
  fetch: (params?: Params, id?: string | number) => Promise<Data | null>;
}

export function useFetchUpdate<Data, Error, Params>(
  path: string,
  initialId = '',
): FetchUpdate<Data, Error, Params> {
  return useFetch<Data, Error, Params>({
    fetchCreator: (token, params?: Params, id = initialId) => axios.patch<Data>(
      `${process.env.REACT_APP_API_URL}/${path}${id ? `/${id}` : ''}`,
      params,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),
  });
}

export interface FetchDelete<Data, Error = DefaultFetchError, Params = string>
  extends DefaultFetch<Data, Error, Params> {
  data?: Data;
  fetch: (id?: Params) => Promise<Data | null>;
}

export function useFetchDelete<Data, Error, Params = string>(
  path: string,
  initialId = '',
): FetchDelete<Data, Error, Params> {
  return useFetch<Data, Error, Params>({
    fetchCreator: (token, id) => axios.delete<Data>(
      `${process.env.REACT_APP_API_URL}/${path}${id || initialId ? `/${id || initialId}` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),
  });
}

export function getMessageInError(err: AxiosError | null): string {
  if (!err) {
    return 'Unknown error';
  }

  /* TODO: fix .... */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const message = err.response?.data.detail || err.response?.data.message || err.message;

  if (message) {
    return capitalizeFirstLetter(Array.isArray(message) ? message[0] : message);
  }

  return 'Something went wrong!';
}
