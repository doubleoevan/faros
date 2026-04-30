import type { CodegenConfig } from '@graphql-codegen/cli'

// run with `pnpm codegen` while the mock server is running on :4000.
// output is committed to src/lib/apollo/generated.ts.
const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  documents: ['src/lib/apollo/operations/**/*.graphql'],
  generates: {
    'src/lib/apollo/generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        skipTypename: false,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
}

export default config
