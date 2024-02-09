/** Types generated for queries found in "src/books/books.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

import type { Category } from '../customTypes.js';

export type categoryArray = (Category)[];

/** 'FindBookById' parameters type */
export interface IFindBookByIdParams {
  id?: number | null | void;
}

/** 'FindBookById' return type */
export interface IFindBookByIdResult {
  author_id: number | null;
  categories: categoryArray | null;
  id: number;
  name: string | null;
  rank: number | null;
}

/** 'FindBookById' query type */
export interface IFindBookByIdQuery {
  params: IFindBookByIdParams;
  result: IFindBookByIdResult;
}

const findBookByIdIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":31,"b":33}]}],"statement":"SELECT * FROM books WHERE id = :id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM books WHERE id = :id
 * ```
 */
export const findBookById = new PreparedQuery<IFindBookByIdParams,IFindBookByIdResult>(findBookByIdIR);


/** 'FindAllBooks' parameters type */
export type IFindAllBooksParams = void;

/** 'FindAllBooks' return type */
export interface IFindAllBooksResult {
  author_id: number | null;
  categories: categoryArray | null;
  id: number;
  name: string | null;
  rank: number | null;
}

/** 'FindAllBooks' query type */
export interface IFindAllBooksQuery {
  params: IFindAllBooksParams;
  result: IFindAllBooksResult;
}

const findAllBooksIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT * FROM books WHERE id is not null"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM books WHERE id is not null
 * ```
 */
export const findAllBooks = new PreparedQuery<IFindAllBooksParams,IFindAllBooksResult>(findAllBooksIR);


