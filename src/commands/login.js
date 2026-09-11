import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import pc from 'picocolors';
import { SimklClient } from '../simklClient.js';
import { getClientId, saveAccessToken } from '../config.js';
import { requestPin, pollForToken } from '../auth/pinLogin.js';

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/** `login` command: connects the Simkl account with the PIN flow and saves the token. */
export async function login() {
  const clientId = getClientId();
  const hasToken = (process.env.SIMKL_ACCESS_TOKEN ?? '').trim().length > 0;

  if (hasToken && process.stdin.isTTY) {
    const again = await confirm({
      message: 'You are already logged in. Log in again?',
      default: false,
    });
    if (!again) {
      return;
    }
  }

  const client = new SimklClient({ clientId });
  const pin = await requestPin(client);

  console.log(`
Connect simkl-export to your Simkl account:

  1. Open  ${pin.verificationUri}
  2. Enter this code:  ${pc.bold(pin.userCode)}

The code expires in 15 minutes.
`);

  const spinner = ora('Waiting for you to approve…').start();
  const onSigint = () => {
    spinner.stop();
    console.error('Login cancelled.');
    process.exit(130);
  };
  process.once('SIGINT', onSigint);

  try {
    const token = await pollForToken(client, pin, { sleep });
    saveAccessToken(token);
    spinner.succeed('Logged in. Token saved to .env');
    console.log('Next step: simkl-export export');
  } finally {
    process.removeListener('SIGINT', onSigint);
  }
}
