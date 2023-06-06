import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type SchedulerConfig = {};

export function schedulerConfigToCell(config: SchedulerConfig): Cell {
    return beginCell().endCell();
}

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

    async sendSchedule(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        time: bigint,
        msgRecipient: Address,
        msgValue: bigint,
        msgBody?: Cell,
        msgInit?: Cell
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x55b736bf, 32)
                .storeUint(time, 32)
                .storeAddress(msgRecipient)
                .storeCoins(msgValue)
                .storeMaybeRef(msgBody)
                .storeMaybeRef(msgInit)
                .endCell(),
        });
    }

    async getNextMessage(provider: ContractProvider) {
        const result = (await provider.get('get_next_message', [])).stack;
        return [
            result.readBigNumber(),
            result.readAddress(),
            result.readBigNumber(),
            result.readCellOpt(),
            result.readCellOpt(),
        ];
    }
}
