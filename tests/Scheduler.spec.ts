import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Scheduler } from '../wrappers/Scheduler';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Scheduler', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Scheduler');
    });

    let blockchain: Blockchain;
    let scheduler: SandboxContract<Scheduler>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        scheduler = blockchain.openContract(Scheduler.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await scheduler.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: scheduler.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and scheduler are ready to use
    });
});
