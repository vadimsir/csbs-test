// version 2.0

import axios, { AxiosError } from 'axios';
import { createContext, useContext } from 'react';

import { JsonResult } from '../types';
import { getParsedJwt, getTimeZoneName } from '../utils';
import { DefaultFetchError, getMessageInError } from '../hooks/fetch';
import { getDataInSessionStorage, getDataInStorage, setDataInSessionStorage, setDataInStorage } from '../utils/storage';

interface UserData {
  id: number | undefined;
  role: string | undefined;
  login: string | undefined;
  email: string | undefined;
  status: boolean | undefined;
  updated: string | undefined;
  created: string | undefined;
  lastName: string | undefined;
  firstName: string | undefined;
}

export interface SignInData extends UserData {
  accessToken: string;
  refreshToken: string;
}

export type RoleList = string[]

export interface SignIn {
  login: string;
  password: string;
  remember: boolean;
}

class Auth {
  private id: string | undefined;

  private roleList: string[] | undefined;

  private role: string | undefined;

  private login: string | undefined;

  private remember = false;

  private userData: UserData;

  private accessToken: string | undefined;

  private refreshToken: string | undefined;

  private errorResponse: AxiosError<DefaultFetchError> | undefined;

  private signInLoading = false;

  private roleLoading = false;

  private reLoginPromise?: Promise<SignInData | AxiosError<DefaultFetchError>>;

  constructor({ accessToken, refreshToken, login, roleList, remember, user }: JsonResult) {
    if (roleList) this.roleList = roleList;
    if (remember) this.remember = !!remember;
    if (accessToken && typeof accessToken === 'string') this.accessToken = accessToken;
    if (refreshToken && typeof refreshToken === 'string') this.refreshToken = refreshToken;
    if (login && typeof login === 'string') this.login = login;
    this.userData = user || {
      id: undefined,
      role: undefined,
      login: undefined,
      email: undefined,
      status: undefined,
      updated: undefined,
      created: undefined,
      lastName: undefined,
      firstName: undefined,
      accessToken: undefined,
      refreshToken: undefined,
    };

    if (this.accessToken) {
      this.getRoleList();
    }

    this.parseRole();
  }

  private getRoleList(): void {
    this.roleLoading = true;
    this.change();

    axios.get<RoleList>(
      `${process.env.REACT_APP_API_URL}/users/roles`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    ).then(({ data }) => {
      this.roleList = data;
      this.roleLoading = false;
      this.change();
    }).catch(async (e) => {
      if (e.response?.status === 401) {
        await this.reLogin();
      } else {
        this.errorResponse = e;
      }
      this.roleLoading = false;
      this.change();
    });
  }

  private parseRole() {
    const jwt = getParsedJwt<{ role: string; sub: string; }>(this.accessToken);

    if (jwt) {
      this.id = jwt.sub;
      this.role = jwt.role;
    }
  }

  private setData(data: SignInData) {
    if (data && data.accessToken) {
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;

      this.parseRole();
      this.getRoleList();
      this.userData = {
        id: data.id,
        role: data.role,
        login: data.login,
        email: data.email,
        status: data.status,
        updated: data.updated,
        created: data.created,
        lastName: data.lastName,
        firstName: data.firstName,
      };
    } else {
      this.clear();
    }
  }

  private clear() {
    this.id = undefined;
    this.role = undefined;
    this.login = undefined;
    this.accessToken = undefined;
    this.refreshToken = undefined;
  }

  private saveInStore(remember = false) {
    setDataInStorage('auth', remember ? {
      user: this.userData,
      login: this.login,
      roleList: this.roleList,
      remember: this.remember,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    } : {});
  }

  private saveInSessionStore(remember = true) {
    setDataInSessionStorage('auth', remember ? {} : {
      user: this.userData,
      login: this.login,
      roleList: this.roleList,
      remember: this.remember,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    });
  }

  private setUserTimezone() {
    axios.patch<{ zone: string; }>(
      `${process.env.REACT_APP_API_URL}/auth/change/zone`,
      {
        zone: getTimeZoneName(),
      },
      { headers: { Authorization: `Bearer ${this.token || this.refreshToken}` } },
    );
  }

  public isRoleEnough = (requiredRole: string) => {
    if (this.role === requiredRole) {
      return true;
    }

    if (this.roleList) {
      return this.role && this.roleList.indexOf(this.role) >= this.roleList.indexOf(requiredRole);
    }

    return false;
  };

  public change = (): void => undefined;

  public get loading() {
    return this.signInLoading || this.roleLoading;
  }

  public get authorized() {
    return !!this.accessToken;
  }

  public get user(): UserData {
    return this.userData;
  }

  public get token() {
    return this.accessToken;
  }

  public get error() {
    if (this.errorResponse) {
      return getMessageInError(this.errorResponse) || 'Incorrect username and/or password.';
    }

    return undefined;
  }

  public signIn = async ({
    login,
    password,
    remember,
  }: SignIn): Promise<SignInData | AxiosError<DefaultFetchError>> => {
    this.remember = remember;
    this.errorResponse = undefined;
    this.signInLoading = true;
    this.change();

    return axios.post<SignInData>(
      `${process.env.REACT_APP_API_URL}/auth/login`,
      {
        login, password,
      },
    ).then(({ data }) => {
      this.login = login;

      this.setData(data);

      this.setUserTimezone();

      return data;
    }).catch((e) => {
      this.errorResponse = e;

      return e;
    }).finally(() => {
      this.signInLoading = false;
      this.saveInStore(this.remember);
      this.saveInSessionStore(this.remember);
      this.change();
    });
  };

  public reLogin = async (token?: string) => {
    if (this.reLoginPromise) {
      return this.reLoginPromise;
    }

    this.errorResponse = undefined;
    this.signInLoading = true;
    this.change();

    this.reLoginPromise = axios.get<SignInData>(
      `${process.env.REACT_APP_API_URL}/auth/refresh/token`,
      { headers: { Authorization: `Bearer ${token || this.refreshToken}` } },
    ).then(({ data }) => {
      this.setData(data);

      this.setUserTimezone();

      return data;
    }).catch((e) => {
      if (e.response.status === 403) {
        this.logout();
      }

      this.errorResponse = e;

      return e;
    }).finally(() => {
      this.signInLoading = false;
      this.saveInStore(this.remember);
      this.saveInSessionStore(this.remember);
      this.change();
      setTimeout(() => {
        this.reLoginPromise = undefined;
      }, 0);
    });

    return this.reLoginPromise;
  };

  public clearResponseError = () => {
    this.errorResponse = undefined;
    this.change();
  };

  public logout = () => {
    this.clear();
    this.saveInStore();
    this.saveInSessionStore();
    this.change();
  };
}

const auth = new Auth(getDataInStorage('auth').refreshToken ? getDataInStorage('auth')
  : getDataInSessionStorage('auth'));

export const AuthContext = createContext(auth);

export const useAuth = (): Auth => useContext<Auth>(AuthContext);

export default auth;
