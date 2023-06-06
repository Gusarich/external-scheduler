import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Address, Cell, beginCell, toNano } from 'ton-core';
import { Scheduler } from '../wrappers/Scheduler';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { randomAddress } from '@ton-community/test-utils';

describe('Scheduler', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Scheduler');
    });

    let blockchain: Blockchain;
    let scheduler: SandboxContract<Scheduler>;
    let wallet: SandboxContract<TreasuryContract>;
    let recipient: Address;
    let bounty: Address;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 1000;

        scheduler = blockchain.openContract(Scheduler.createFromConfig({}, code));

        wallet = await blockchain.treasury('deployer');
        recipient = randomAddress();
        bounty = randomAddress();

        const deployResult = await scheduler.sendDeploy(wallet.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: wallet.address,
            to: scheduler.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {});

    it('should schedule single message', async () => {
        let result = await scheduler.sendSchedule(wallet.getSender(), toNano('0.1'), 1005n, recipient, toNano('0.01'));
        expect(result.transactions).toHaveTransaction({
            from: wallet.address,
            to: scheduler.address,
            success: true,
        });
        let msg = await scheduler.getNextMessage();
        expect(msg[0]).toEqual(1005n);
        expect(msg[1]).toEqualAddress(recipient);
        expect(msg.slice(2)).toEqual([toNano('0.01'), null, null]);
    });

    it('should schedule several messages', async () => {
        let result = await scheduler.sendSchedule(wallet.getSender(), toNano('0.1'), 1005n, recipient, toNano('0.01'));
        expect(result.transactions).toHaveTransaction({
            from: wallet.address,
            to: scheduler.address,
            success: true,
        });
        let msg = await scheduler.getNextMessage();
        expect(msg[0]).toEqual(1005n);
        expect(msg[1]).toEqualAddress(recipient);
        expect(msg.slice(2)).toEqual([toNano('0.01'), null, null]);

        result = await scheduler.sendSchedule(
            wallet.getSender(),
            toNano('0.1'),
            1004n,
            recipient,
            toNano('0.02'),
            beginCell().storeStringTail('Hello, world!').endCell()
        );
        expect(result.transactions).toHaveTransaction({
            from: wallet.address,
            to: scheduler.address,
            success: true,
        });
        msg = await scheduler.getNextMessage();
        expect(msg[0]).toEqual(1004n);
        expect(msg[1]).toEqualAddress(recipient);
        expect(msg[2]).toEqual(toNano('0.02'));
        expect(msg[3]).toEqualCell(beginCell().storeStringTail('Hello, world!').endCell());
        expect(msg[4]).toEqual(null);

        result = await scheduler.sendSchedule(
            wallet.getSender(),
            toNano('0.1'),
            1003n,
            recipient,
            toNano('0.03'),
            beginCell().storeStringTail('Hello, world!').endCell(),
            Cell.EMPTY
        );
        expect(result.transactions).toHaveTransaction({
            from: wallet.address,
            to: scheduler.address,
            success: true,
        });
        msg = await scheduler.getNextMessage();
        expect(msg[0]).toEqual(1003n);
        expect(msg[1]).toEqualAddress(recipient);
        expect(msg[2]).toEqual(toNano('0.03'));
        expect(msg[3]).toEqualCell(beginCell().storeStringTail('Hello, world!').endCell());
        expect(msg[4]).toEqualCell(Cell.EMPTY);
    });

    it('should schedule and process single message', async () => {
        await scheduler.sendSchedule(wallet.getSender(), toNano('0.1'), 1005n, recipient, toNano('0.01'));

        blockchain.now = 1005;

        let result = await scheduler.sendTryProcess(bounty);
        expect(result.transactions).toHaveTransaction({
            from: scheduler.address,
            to: bounty,
            value: toNano('0.024'),
        });

        let msg = await scheduler.getNextMessage();
        expect(msg).toEqual([null, null, null, null, null]);
    });
});
