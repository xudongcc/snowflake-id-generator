import Redis from "ioredis";

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
      ["number", "bigint"].includes(typeof options?.machineId)
        ? options.machineId
        : Math.floor(Math.random() * 2 ** Number(this.machineIdBits))
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
  private static redis: Redis.Redis;
  private static timer: NodeJS.Timeout;

  static async set(
    options?: SnowflakeIdGeneratorOptions,
    redis?: { options: string | Redis.RedisOptions }
  ): Promise<void> {
    clearInterval(this.timer);

    if (!["number", "bigint"].includes(typeof options.machineId) && redis) {
      this.redis = new Redis(redis?.options as string);

      const machineIdMask = 2n ** BigInt(options?.machineIdBits || 10n);

      let machineId = 0n;
      while (!["number", "bigint"].includes(typeof options.machineId)) {
        if (
          await this.redis.set(
            `snowflake-id-generator:${machineId}`,
            "",
            "EX",
            180,
            "NX"
          )
        ) {
          this.timer = setInterval(
            () =>
              this.redis.set(
                `snowflake-id-generator:${machineId}`,
                "",
                "EX",
                180
              ),
            60000
          );

          options.machineId = machineId;
        } else {
          machineId = ++machineId % machineIdMask;
        }
      }
    }

    this.instance = new this(options);
  }

  static next(): bigint {
    this.instance = this.instance || new this();
    return this.instance.next();
  }
}
