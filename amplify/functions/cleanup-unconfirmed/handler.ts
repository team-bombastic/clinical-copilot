import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

const USER_POOL_ID = process.env.USER_POOL_ID!;
// Delete unconfirmed users older than this many minutes
const THRESHOLD_MINUTES = 5;

export const handler = async () => {
  const threshold = new Date(Date.now() - THRESHOLD_MINUTES * 60 * 1000);

  let paginationToken: string | undefined;
  let deletedCount = 0;

  do {
    const { Users, PaginationToken } = await client.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: 'cognito:user_status = "UNCONFIRMED"',
        Limit: 60,
        PaginationToken: paginationToken,
      })
    );

    for (const user of Users ?? []) {
      if (user.UserCreateDate && user.UserCreateDate < threshold) {
        await client.send(
          new AdminDeleteUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: user.Username!,
          })
        );
        deletedCount++;
        console.log(`Deleted unconfirmed user: ${user.Username}`);
      }
    }

    paginationToken = PaginationToken;
  } while (paginationToken);

  console.log(`Cleanup complete. Deleted ${deletedCount} unconfirmed user(s).`);
  return { deletedCount };
};
