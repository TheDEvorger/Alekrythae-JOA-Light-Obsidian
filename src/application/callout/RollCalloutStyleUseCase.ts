import { CalloutStyle, CalloutStyleTable } from "../../domain/callout/CalloutStyleTable";
import { RandomSource } from "../../domain/shared/RandomSource";

export class RollCalloutStyleUseCase {
  constructor(
    private readonly table: CalloutStyleTable,
    private readonly random: RandomSource
  ) {}

  execute(): CalloutStyle {
    return this.table.entryFor(this.random.integer(1, this.table.size));
  }
}
