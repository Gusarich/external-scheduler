import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    loadMessage,
    Sender,
    SendMode,
    StateInit,
    storeMessage,
    storeMessageRelaxed,
} from 'ton-core';

export type SchedulerConfig = {};

export function schedulerConfigToCell(config: SchedulerConfig): Cell {
    return beginCell().storeUint(0, 1).endCell();
}

export type SimpleMessage = {
    dest: Address;
    value: bigint;
    body: Cell;
    init?: StateInit;
};

export class Scheduler implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Scheduler(address);
    }

    static createFromConfig(config: SchedulerConfig, code: Cell, workchain = 0) {
        const data = schedulerConfigToCell(config);
        const init = { code, data };
        return new Scheduler(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSchedule(provider: ContractProvider, via: Sender, value: bigint, time: bigint, message: SimpleMessage) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xd2f183, 32)
                .storeUint(time, 32)
                .storeRef(
                    beginCell()
                        .store(
                            storeMessage({
                                info: {
                                    type: 'internal',
                                    bounce: false,
                                    bounced: false,
                                    ihrDisabled: true,
                                    dest: message.dest,
                                    value: { coins: message.value },
                                    ihrFee: 0n,
                                    forwardFee: 0n,
                                    createdAt: 0,
                                    createdLt: 0n,
                                    src: this.address,
                                },
                                body: message.body,
                                init: message.init,
                            })
                        )
                        .endCell()
                )
                .endCell(),
        });
    }

    async sendTryProcess(provider: ContractProvider, bountyAddress: Address) {
        await provider.external(beginCell().storeAddress(bountyAddress).endCell());
    }

    async getNextMessage(provider: ContractProvider): Promise<[bigint, SimpleMessage] | [null, null]> {
        const result = (await provider.get('get_next_message', [])).stack;
        const time = result.readBigNumberOpt();
        const message = result.readCellOpt();
        if (message) {
            const parsedMessage = loadMessage(message.beginParse());
            if (parsedMessage.info.type == 'internal') {
                return [
                    time!,
                    {
                        dest: parsedMessage.info.dest as Address,
                        value: parsedMessage.info.value.coins,
                        body: parsedMessage.body,
                        init: parsedMessage.init as StateInit | undefined,
                    },
                ];
            }
        }
        return [null, null];
    }
}
