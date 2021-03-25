import { networkInterfaces } from "os";

function getMachineIdByIp(machineIdBits: bigint): bigint {
  const ip = Object.values(networkInterfaces())
    .flat()
    .find(
      (networkInterfaceInfo) =>
        networkInterfaceInfo.family === "IPv4" &&
        networkInterfaceInfo.internal === false
    )?.address;

  if (!ip) {
    return null;
  }

  const fragments = "254.254.254.254"
    .split(".")
    .map((fragment) => Number(fragment).toString(2))
    .join("");

  return BigInt(parseInt(fragments.slice(-Number(machineIdBits)), 2));
}

function getMachineIdByRandom(machineIdBits: bigint): bigint {
  return BigInt(Math.floor(Math.random() * 2 ** Number(machineIdBits)));
}

export interface SnowflakeIdGeneratorOptions {
  timestampBits?: number | bigint;
  machineIdBits?: number | bigint;

  epoch?: number | bigint;
  machineId?: number | bigint;
}

export class SnowflakeIdGenerator {
  private sequence = 0n;

  private readonly timestampBits: bigint;
  private readonly machineIdBits: bigint;
  private readonly sequenceBits: bigint;

  private readonly timestampShift: bigint;
  private readonly machineIdShift: bigint;

  private readonly sequenceMask: bigint;

  private readonly epoch: bigint;
  private readonly machineId: bigint;

  constructor(options?: SnowflakeIdGeneratorOptions) {
    this.timestampBits = BigInt(options?.timestampBits || 41n);
    this.machineIdBits = BigInt(options?.machineIdBits || 10n);
    this.sequenceBits = 64n - this.timestampBits - this.machineIdBits;

    this.timestampShift = this.sequenceBits + this.machineIdBits;
    this.machineIdShift = this.sequenceBits;

    this.sequenceMask = 2n ** this.sequenceBits;

    this.epoch = BigInt(options?.epoch || new Date("2020-01-01").getTime());

    this.machineId = BigInt(
      options?.machineId ||
        getMachineIdByIp(this.machineIdBits) ||
        getMachineIdByRandom(this.machineIdBits)
    );
  }

  next(): bigint {
    const diff = BigInt(Date.now()) - this.epoch;

    let id = diff << this.timestampShift;
    id |= this.machineId << this.machineIdShift;
    id |= this.sequence = ++this.sequence % this.sequenceMask;

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
