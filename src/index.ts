export interface SnowflakeIdGeneratorOptions {
  epoch?: number | bigint;
  machineId?: number | bigint;

  totalBits?: number | bigint;
  epochBits?: number | bigint;
  machineBits?: number | bigint;
}

export class SnowflakeIdGenerator {
  private readonly totalBits: bigint;
  private readonly epochBits: bigint;
  private readonly machineBits: bigint;
  private readonly incrementBits: bigint;

  private readonly epoch: bigint;
  private readonly machineId: bigint;

  private index = 0n;

  private get incrementId() {
    return (this.index = ++this.index % 2n ** this.incrementBits);
  }

  constructor(options?: SnowflakeIdGeneratorOptions) {
    this.totalBits = BigInt(options?.totalBits || 64n);
    this.epochBits = BigInt(options?.epochBits || 41n);
    this.machineBits = BigInt(options?.machineBits || 10n);
    this.incrementBits = this.totalBits - this.epochBits - this.machineBits;

    this.epoch = BigInt(options?.epoch || new Date("2020-01-01").getTime());

    this.machineId = BigInt(
      options?.machineId ||
        Math.floor(Math.random() * 2 ** Number(this.machineBits))
    );
  }

  next(): bigint {
    const diff = BigInt(Date.now()) - this.epoch;

    let id = diff << (this.totalBits - this.epochBits);
    id |= this.machineId << this.machineBits;
    id |= this.incrementId << this.incrementBits;

    return id;
  }

  private static instance: SnowflakeIdGenerator;

  static set(options: SnowflakeIdGeneratorOptions): void {
    this.instance = new this(options);
  }

  static next(): bigint {
    this.instance = this.instance || new this();
    return this.instance.next();
  }
}
