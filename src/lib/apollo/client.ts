import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql'

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: apiUrl }),
  cache: new InMemoryCache({
    typePolicies: {
      // employees can be looked up by id from list rows or detail query with the same cache entry.
      Employee: { keyFields: ['id'] },
      Team: { keyFields: ['id'] },
      // Account.uid echoes the employee's uid; normalizing collapses accounts. keep inline.
      Account: { keyFields: false },
      Query: {
        fields: {
          // resolve employee(id) to the cached Employee entity to avoid a network round-trip.
          employee(_, { args, toReference }) {
            const id = args?.['id']
            if (typeof id !== 'string') {
              return undefined
            }
            return toReference({ __typename: 'Employee', id })
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
})
