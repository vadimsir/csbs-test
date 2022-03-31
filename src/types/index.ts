export interface JsonResult {
  // eslint-disable-next-line
  [key: string]: any;
}

export interface RequestResult {
  loading: boolean;
  error: Error | null;
}

export interface FetchError {
  message: string | string[];
}

export interface FetchSuccess {
  success: boolean;
}

export interface PagingDataResponse<I> {
  items: I[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
  links: {
    first: string;
    previous: string;
    next: string;
    last: string;
  };
}

export interface Option {
  value: string | boolean | number;
  label: string | JSX.Element;
}

export interface ModalState {
  type: ModalTypes;
  id?: number;
}

export enum ModalTypes {
  'create' = 'create',
  'update' = 'update',
  'delete' = 'delete',
}

export interface Step {
  title: string | number;
  content: JSX.Element;
  isValid?: boolean;
}
