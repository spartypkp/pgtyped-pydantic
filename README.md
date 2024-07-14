<img width="340" height="150" align="right" src="https://raw.githubusercontent.com/adelsz/pgtyped/master/header.png">

# [PgTyped - Pydantic](Forked from https://pgtyped.dev/)



PgTyped-Pydantic makes it possible to use raw SQL in Python with guaranteed type-safety using Pydantic Models.  
No need to map or translate your DB schema to Python, PgTyped-Pydantic automatically generates types and interfaces for your SQL queries by using your running Postgres database as the source of type information. This is a fork of the PgTyped library, which was originally designed for use in Typescript.

---

## Features:

1. Automatically generates Pydantic Models for parameters/results of SQL queries of any complexity.
2. Supports extracting and typing queries from Python files.
3. Generate query types as you write them, using watch mode.
4. Useful parameter interpolation helpers for arrays and objects.
5. No need to define your DB schema in Python, your running DB is the live source of type data.
6. Prevents SQL injections by not doing explicit parameter substitution. Instead, queries and parameters are sent separately to the DB driver, allowing parameter substitution to be safely done by the PostgreSQL server.


### Getting started

1. `npm install pgtyped-pydantic`
2. `npm install @pgtyped-pydantic/cli`


### Example

Needs to be reworked


### Project state:

This project is being actively developed and its APIs might change.
All issue reports, feature requests and PRs appreciated.

### License

[MIT](https://github.com/adelsz/pgtyped/tree/master/LICENSE)

Copyright (c) 2019-present, Adel Salakh
