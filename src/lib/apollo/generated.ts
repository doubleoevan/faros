import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/**
 * All built-in and custom scalars, mapped to their actual values
 */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Account = {
  __typename?: 'Account';
  /**
   * Source system name: GitHub, Jira, PagerDuty, Google Calendar
   */
  source: Scalars['String']['output'];
  /**
   * Account category: vcs, tms, ims, cal
   */
  type: Scalars['String']['output'];
  uid: Scalars['String']['output'];
};

export type AccountTypeOption = {
  __typename?: 'AccountTypeOption';
  source: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type Employee = {
  __typename?: 'Employee';
  accounts: Array<Account>;
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  inactive?: Maybe<Scalars['Boolean']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  teams: Array<Team>;
  trackingCategory?: Maybe<Scalars['String']['output']>;
  trackingStatus?: Maybe<Scalars['String']['output']>;
  uid: Scalars['String']['output'];
};

export type EmployeeConnection = {
  __typename?: 'EmployeeConnection';
  edges: Array<EmployeeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type EmployeeEdge = {
  __typename?: 'EmployeeEdge';
  cursor: Scalars['String']['output'];
  node: Employee;
};

export type EmployeeFilter = {

  /**
   * Filter by account type(s): vcs, tms, ims, cal. Returns employees with ANY of these.
   */
  accountTypes?: InputMaybe<Array<Scalars['String']['input']>>;

  /**
   * Filter by team UID(s). Returns employees belonging to ANY of the specified teams.
   */
  teams?: InputMaybe<Array<Scalars['String']['input']>>;

  /**
   * Filter by tracking category: Active, Inactive.
   */
  trackingCategories?: InputMaybe<Array<Scalars['String']['input']>>;

  /**
   * Filter by tracking status: Included, Ignored.
   */
  trackingStatuses?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type FilterOptions = {
  __typename?: 'FilterOptions';
  accountTypes: Array<AccountTypeOption>;
  teams: Array<TeamOption>;
  trackingCategories: Array<Scalars['String']['output']>;
  trackingStatuses: Array<Scalars['String']['output']>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';

  /**
   * Single employee by ID or UID.
   */
  employee?: Maybe<Employee>;

  /**
   * Paginated, filterable list of employees.
   * Uses cursor-based pagination (Relay-style).
   */
  employees: EmployeeConnection;

  /**
   * Available filter values (for populating filter dropdowns).
   */
  filterOptions: FilterOptions;
};


export type QueryEmployeeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEmployeesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<EmployeeFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Team = {
  __typename?: 'Team';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  uid: Scalars['String']['output'];
};

export type TeamOption = {
  __typename?: 'TeamOption';
  name: Scalars['String']['output'];
  uid: Scalars['String']['output'];
};

export type EmployeeQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type EmployeeQuery = { __typename?: 'Query', employee?: { __typename?: 'Employee', id: string, uid: string, name?: string | null, email?: string | null, photoUrl?: string | null, trackingStatus?: string | null, trackingCategory?: string | null, teams: Array<{ __typename?: 'Team', id: string, uid: string, name: string }>, accounts: Array<{ __typename?: 'Account', type: string, source: string, uid: string }> } | null };

export type EmployeesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<EmployeeFilter>;
}>;


export type EmployeesQuery = { __typename?: 'Query', employees: { __typename?: 'EmployeeConnection', totalCount: number, edges: Array<{ __typename?: 'EmployeeEdge', cursor: string, node: { __typename?: 'Employee', id: string, uid: string, name?: string | null, email?: string | null, photoUrl?: string | null, trackingStatus?: string | null, trackingCategory?: string | null, teams: Array<{ __typename?: 'Team', id: string, uid: string, name: string }>, accounts: Array<{ __typename?: 'Account', type: string, source: string, uid: string }> } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, endCursor?: string | null, startCursor?: string | null } } };

export type FilterOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type FilterOptionsQuery = { __typename?: 'Query', filterOptions: { __typename?: 'FilterOptions', trackingStatuses: Array<string>, teams: Array<{ __typename?: 'TeamOption', uid: string, name: string }>, accountTypes: Array<{ __typename?: 'AccountTypeOption', type: string, source: string }> } };


export const EmployeeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Employee"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employee"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"photoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"trackingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"trackingCategory"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"accounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"uid"}}]}}]}}]}}]} as unknown as DocumentNode<EmployeeQuery, EmployeeQueryVariables>;
export const EmployeesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Employees"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"10"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"EmployeeFilter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"employees"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"photoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"trackingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"trackingCategory"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"accounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"uid"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"startCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]} as unknown as DocumentNode<EmployeesQuery, EmployeesQueryVariables>;
export const FilterOptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FilterOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filterOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uid"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"trackingStatuses"}},{"kind":"Field","name":{"kind":"Name","value":"accountTypes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"source"}}]}}]}}]}}]} as unknown as DocumentNode<FilterOptionsQuery, FilterOptionsQueryVariables>;