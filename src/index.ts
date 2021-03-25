import { networkInterfaces } from "os";

function getMachineIdByIp() {
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

  const fragments = ip.split(".").map((fragment) => Number(fragment));

  return (
    (fragments[0] << 24) |
    (fragments[1] << 16) |
    (fragments[2] << 8) |
    fragments[3]
  );
}

function getMachineIdByRandom() {
  return Math.floor(Math.random() * 2 ** Number(this.machineIdBits));
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
      options?.machineId || getMachineIdByIp() || getMachineIdByRandom()
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
