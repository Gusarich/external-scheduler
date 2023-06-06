import { toNano } from 'ton-core';
import { Scheduler } from '../wrappers/Scheduler';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const scheduler = provider.open(Scheduler.createFromConfig({}, await compile('Scheduler')));

    await scheduler.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(scheduler.address);

    // run methods on `scheduler`
}
