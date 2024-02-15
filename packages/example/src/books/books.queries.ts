/** Types generated for queries found in "src/books/books.sql" */
import { PreparedQuery } from '@pgtyped-pydantic/runtime';

/** Query 'FindBookById' is invalid, so its result is assigned type 'never'.
 *  */
export type IFindBookByIdResult = never;

/** Query 'FindBookById' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IFindBookByIdParams = never;

const findBookByIdIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":false,"transform":{"type":"scalar"},"locs":[{"a":31,"b":33}]}],"statement":"SELECT * FROM books WHERE id = :id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM books WHERE id = :id
 * ```
 */
export const findBookById = new PreparedQuery<IFindBookByIdParams,IFindBookByIdResult>(findBookByIdIR);


/** Query 'FindAllBooks' is invalid, so its result is assigned type 'never'.
 *  */
export type IFindAllBooksResult = never;

/** Query 'FindAllBooks' is invalid, so its parameters are assigned type 'never'.
 *  */
export type IFindAllBooksParams = never;

const findAllBooksIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT * FROM books WHERE id is not null"};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM books WHERE id is not null
 * ```
 */
export const findAllBooks = new PreparedQuery<IFindAllBooksParams,IFindAllBooksResult>(findAllBooksIR);


