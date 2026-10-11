import { D240Entry, D240Table } from "../../domain/d240/D240Table";
import { RandomSource } from "../../domain/shared/RandomSource";

export class RollD240UseCase {
  constructor(
    private readonly table: D240Table,
    private readonly random: RandomSource
  ) {}

  execute(): D240Entry {
    return this.table.entryFor(this.random.integer(1, 240));
  }
}
