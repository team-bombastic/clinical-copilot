import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below defines the data schema.
=========================================================================*/
const schema = a.schema({
  // Placeholder model to satisfy TypeScript until a real model is added.
  // Amplify Gen 2 requires at least one definition in the schema.
  _blank: a.customType({
    id: a.id(),
  }),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
